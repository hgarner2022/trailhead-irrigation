import { useCallback, useEffect, useRef, useState, type Dispatch } from "react"
import type { Pass } from "@/lib/admin/types"
import type { CheckoutAction, CheckoutState } from "./checkout-state"
import { toSubmission, type BeginCheckout, type FinishCheckout } from "./checkout-submit"

export const EXPIRED_NOTICE = "Your saved checkout timed out, so we started it fresh. Check your details and continue."

interface Options {
  state: CheckoutState
  dispatch: Dispatch<CheckoutAction>
  onBegin?: BeginCheckout
  onFinish?: FinishCheckout
  onComplete?: (pass: Pass) => void
  /** the screen rose a step or a finish; the shell animates the next one */
  moved: () => void
}

/** The two round trips of the wired checkout: leaving the contact step (pending pass and card session) and finishing the card. */
export function useCheckoutServer({ state, dispatch, onBegin, onFinish, onComplete, moved }: Options) {
  // The server round trip; the buttons wait for it.
  const [busy, setBusy] = useState(false)
  // Stripe's `onComplete` fires from inside its form, so it reads the answers through a ref.
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  })

  /** `resume` is a card step opened from what the browser kept: a pass the server no longer has restarts at contact. */
  const begin = useCallback(
    async (resume = false) => {
      const s = latest.current
      const submission = toSubmission(s)
      if (!submission || !onBegin) return
      setBusy(true)
      const result = await onBegin(submission, s.passId)
      setBusy(false)
      if (!result.ok) dispatch({ type: "failed", message: result.message })
      else if (resume && s.passId && result.passId !== s.passId) dispatch({ type: "expired", passId: result.passId, message: EXPIRED_NOTICE })
      else {
        dispatch({ type: "begun", passId: result.passId, sessionId: result.sessionId, clientSecret: result.clientSecret })
        moved()
      }
    },
    [onBegin, dispatch, moved],
  )

  const finishCard = useCallback(async () => {
    const s = latest.current
    if (!onFinish || !s.passId || !s.sessionId) return
    setBusy(true)
    const result = await onFinish(s.passId, s.sessionId, { termsAccepted: s.termsAccepted, marketingEmail: s.marketingEmail, marketingSms: s.marketingSms }, s.firstName.trim())
    setBusy(false)
    if (result.ok) {
      onComplete?.(result.pass)
      dispatch({ type: "finished", pass: result.pass })
      moved()
    } else dispatch({ type: "failed", message: result.message })
  }, [onFinish, onComplete, dispatch, moved])

  // A restore that was on the card step asks for the card form again, once.
  const resumed = useRef(false)
  useEffect(() => {
    if (!state.resuming || resumed.current) return
    resumed.current = true
    void Promise.resolve().then(() => begin(true))
  }, [state.resuming, begin])

  return { busy, begin, finishCard }
}
