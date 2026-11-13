import { useEffect, useRef, type Dispatch } from "react"
import type { CheckoutAction, CheckoutState } from "./checkout-state"
import { clearCheckout, loadCheckout, saveCheckout } from "./checkout-storage"

/** Restores what the browser kept once on mount, then keeps it current; the done step clears it. Off when `enabled` is false (stories, the prototype). */
export function useCheckoutStorage(state: CheckoutState, dispatch: Dispatch<CheckoutAction>, enabled: boolean) {
  // The first save waits a render: on mount the state is still the blank one, and saving it would overwrite what was just read.
  const restored = useRef(false)
  useEffect(() => {
    if (!enabled) return
    const saved = loadCheckout()
    if (saved) dispatch({ type: "restore", step: saved.step, passId: saved.passId, fields: saved.fields })
  }, [enabled, dispatch])
  const done = state.step >= 7
  useEffect(() => {
    if (!enabled) return
    if (!restored.current) {
      restored.current = true
      return
    }
    if (done) clearCheckout()
    else saveCheckout({ step: state.step, passId: state.passId, fields: state })
  }, [enabled, done, state])
}
