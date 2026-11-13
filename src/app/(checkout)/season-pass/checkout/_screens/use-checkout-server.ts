import { useCallback, useEffect, useRef, useState, type Dispatch } from "react"
import type { Pass } from "@/lib/admin/types"
import { SESSION_MAX_AGE_MS, type CheckoutAction, type CheckoutState } from "./checkout-state"
import { toSubmission, type BeginCheckout, type FinishCheckout } from "./checkout-submit"

interface Options {
  state: CheckoutState
  dispatch: Dispatch<CheckoutAction>
  onBegin?: BeginCheckout
  onFinish?: FinishCheckout
  onComplete?: (pass: Pass) => void
  /** the screen rose a step or a finish; the shell animates the next one */
  moved: () => void
}

/** The round trips of the wired checkout: leaving the contact step (pending pass, the consent snapshot and card session), and finishing the card. */
export function useCheckoutServer({ state, dispatch, onBegin, onFinish, onComplete, moved }: Options) {
  // The server round trip; the buttons wait for it.
  const [busy, setBusy] = useState(false)
  // Stripe's `onComplete` fires from inside its form, so it reads the answers through a ref.
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  })
  // Stripe's `onComplete` can fire more than once; the activation runs once at a time, and never again after it succeeded.
  const finishing = useRef(false)

  const begin = useCallback(
    async () => {
      const s = latest.current
      const submission = toSubmission(s)
      if (!submission || !onBegin) return
      setBusy(true)
      const result = await onBegin(submission, s.passId)
      setBusy(false)
      if (!result.ok) dispatch({ type: "failed", message: result.message, retry: "begin" })
      else {
        dispatch({ type: "begun", passId: result.passId, sessionId: result.sessionId, clientSecret: result.clientSecret, at: Date.now() })
        moved()
      }
    },
    [onBegin, dispatch, moved],
  )

  const finishCard = useCallback(async () => {
    const s = latest.current
    if (finishing.current || !onFinish || !s.passId || !s.sessionId) return
    finishing.current = true
    setBusy(true)
    const result = await onFinish(s.passId, s.sessionId, { termsAccepted: s.termsAccepted, marketingEmail: s.marketingEmail, marketingSms: s.marketingSms }, s.firstName.trim())
    setBusy(false)
    if (result.ok) {
      onComplete?.(result.pass)
      dispatch({ type: "finished", pass: result.pass })
      moved()
      return
    }
    finishing.current = false
    // An expired card form cannot be finished; the retry asks for a new one.
    dispatch({ type: "failed", message: result.message, retry: result.problem === "expired" ? "begin" : "finish" })
  }, [onFinish, onComplete, dispatch, moved])

  /** "Try again": the activation again on the same card form, or the pending pass and a new card form when there is none to finish (or Stripe has closed it). */
  const retry = useCallback(() => {
    const s = latest.current
    const stale = s.sessionAt !== undefined && Date.now() - s.sessionAt > SESSION_MAX_AGE_MS
    if (s.retry === "finish" && !stale) void finishCard()
    else void begin()
  }, [begin, finishCard])

  return { busy, begin, finishCard, retry }
}
