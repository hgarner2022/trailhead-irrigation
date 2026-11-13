/**
 * What the checkout keeps in the browser's sessionStorage so a customer who reloads, or comes back in the same tab, finds their
 * answers and the step they were on. The consent boxes, the Stripe secret and the finished pass are never kept: the boxes are
 * asked again on the card step, and a card form always gets a fresh session. The server holds the pending pass for an hour;
 * the key is cleared on the done step. Every read and write is guarded, since storage can be blocked or full.
 */
import type { CheckoutFields } from "./checkout-state"

export const STORAGE_KEY = "season-pass-checkout"

/** The answers worth keeping; `today` is the page's, and the consent and card fields are asked fresh. */
const KEPT = ["address", "place", "town", "access", "accessNote", "zones", "inspection", "turnOnPreference", "blowoutPreference", "firstName", "email", "phone"] as const

export interface Saved {
  step: number
  passId?: string
  fields: Partial<CheckoutFields>
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

const browserStore = (): Store | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function saveCheckout(state: Saved & { fields: CheckoutFields | Partial<CheckoutFields> }, store: Store | null = browserStore()): void {
  if (!store) return
  const fields: Record<string, unknown> = {}
  for (const key of KEPT) if (key in state.fields) fields[key] = (state.fields as Record<string, unknown>)[key]
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ step: state.step, passId: state.passId, fields }))
  } catch {
    // storage full or blocked: the checkout still works, it just cannot be resumed
  }
}

export function clearCheckout(store: Store | null = browserStore()): void {
  try {
    store?.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clear
  }
}

/** The saved checkout, or null when there is none or it is not shaped like one. Never the done step. */
export function loadCheckout(store: Store | null = browserStore()): Saved | null {
  try {
    const raw = store?.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Saved> | null
    if (!data || typeof data !== "object" || typeof data.step !== "number" || typeof data.fields !== "object" || !data.fields) return null
    if (!Number.isInteger(data.step) || data.step < 1 || data.step > 6) return null
    return { step: data.step, ...(typeof data.passId === "string" ? { passId: data.passId } : {}), fields: data.fields }
  } catch {
    return null
  }
}
