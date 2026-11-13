import { useReducer } from "react"
import { initialState, reducer, type CheckoutState } from "./checkout-state"

/** The thin hook the checkout screen calls; the reducer and every rule are in checkout-state.ts. */
export function useCheckoutState(prefill?: Partial<CheckoutState>) {
  return useReducer(reducer, prefill, initialState)
}
