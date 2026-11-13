/**
 * What the checkout sends the server when the customer leaves the contact step, and what comes back. Plain data, so a server
 * action can take it; `toSubmission` reads it off the reducer's fields. The server rebuilds the same state and runs the same
 * `canContinue` over it (src/lib/pass/server/create.ts), so the rule is held once.
 */
import type { Pass, TimingPreference, Town } from "@/lib/admin/types"
import type { CheckoutFields } from "./checkout-state"

export interface CheckoutSubmission {
  address: { id: string; label: string; line1: string; town: string; state: string; zip: string }
  town: Town
  needsCustomerHome: boolean
  accessNote: string
  zones: number
  inspection: boolean
  turnOnPreference: TimingPreference
  blowoutPreference: TimingPreference
  firstName: string
  email: string
  phone: string
  /** the boxes ticked at the end of the contact step; the server records them on the pending pass */
  consent: CheckoutConsent
}

/** The contact step's three boxes: the required terms, and the two optional marketing ones. */
export interface CheckoutConsent {
  termsAccepted: boolean
  marketingEmail: boolean
  marketingSms: boolean
}

/** Why the server stopped the checkout, as the screen needs to tell the customer. */
export type CheckoutProblem = "out-of-area" | "email-unreachable" | "too-many" | "slow-down" | "invalid" | "unavailable" | "expired"

export type BeginResult = { ok: true; passId: string; sessionId: string; clientSecret: string } | { ok: false; problem: CheckoutProblem; message: string }
export type FinishResult = { ok: true; pass: Pass } | { ok: false; problem: CheckoutProblem; message: string }

export type BeginCheckout = (submission: CheckoutSubmission, passId?: string) => Promise<BeginResult>
/** Called when the card form opens: records the boxes as ticked on the pending pass. Best effort, never throws. */
export type RecordConsent = (passId: string, consent: CheckoutConsent) => Promise<void>
export type FinishCheckout = (passId: string, sessionId: string, consent: CheckoutConsent, firstName?: string) => Promise<FinishResult>

/** The answers as the server takes them; null while the address is not picked in one of the six towns. */
export function toSubmission(f: CheckoutFields): CheckoutSubmission | null {
  if (!f.place || !f.town) return null
  const { id, label, line1, town, state, zip } = f.place
  return {
    address: { id, label, line1, town, state, zip },
    town: f.town,
    needsCustomerHome: f.access === "no",
    accessNote: f.access === "yes" ? f.accessNote.trim() : "",
    zones: f.zones,
    inspection: f.inspection,
    turnOnPreference: f.turnOnPreference,
    blowoutPreference: f.blowoutPreference,
    firstName: f.firstName.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    consent: { termsAccepted: f.termsAccepted, marketingEmail: f.marketingEmail, marketingSms: f.marketingSms },
  }
}
