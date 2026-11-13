/**
 * The state behind the six-screen Season Pass checkout: which step is on
 * screen and what the customer has answered so far. The reducer is pure and
 * `canContinue` holds every step's rule, so the flow can be tested without
 * rendering; `toPass` turns the answers into the `Pass` the last screen
 * shows. It imports no React, so the server runs the same `canContinue` over what the browser sent (src/lib/pass/server/create.ts);
 * `useCheckoutState`, the thin hook the screen calls, lives in use-checkout-state.ts.
 */
import type { Consent, Pass, PassVisit, TimingPreference, Town } from "@/lib/admin/types"
import { preferencePhrase } from "@/lib/admin/format"
import { emailProblem } from "@/lib/email-check"
import { outOfAreaMessage, serviceability, type PlaceSuggestion } from "@/lib/places"
import { MAX_ZONES, MIN_ZONES, TERMS_VERSION, visitPrice, visitsOnSale } from "@/lib/season-pass"

export type StepKey = "address" | "zones" | "inspection" | "timing" | "contact" | "card" | "done"

export interface Step {
  key: StepKey
  /** the question in the display face; the live region reads it too */
  question: string
  /** what the continue button says; none on the last step */
  action?: string
}

export const STEPS: readonly Step[] = [
  { key: "address", question: "Where is the yard?", action: "Continue" },
  { key: "zones", question: "How many zones does your system have?", action: "Continue" },
  { key: "inspection", question: "Add a mid-season inspection?", action: "Continue" },
  { key: "timing", question: "When should we turn your system on?", action: "Continue" },
  { key: "contact", question: "Who should we reach?", action: "Continue" },
  { key: "card", question: "Save a card for after each visit.", action: "Save card and reserve" },
  { key: "done", question: "Your season is reserved" },
]
export const STEP_COUNT = STEPS.length

export const TOWNS: readonly Town[] = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

/** The month each visit lands in, as the pass windows write them; the preference carries the rest. */
export const VISIT_WINDOWS = { "turn-on": "May", inspection: "July", blowout: "October" } as const

export interface CheckoutFields {
  /** what is in the address box */
  address: string
  /** the address picked from the type-ahead list; null while the customer is still typing */
  place: PlaceSuggestion | null
  /** read from the picked address; null until one in the six towns is picked */
  town: Town | null
  /** whether we can reach the controller and the shut-off without the customer; null until answered */
  access: "yes" | "no" | null
  /** gate code, dog, where the controller is */
  accessNote: string
  /** YYYY-MM-DD in Mountain time; decides which visits are still on sale this season */
  today: string
  zones: number
  /** the July inspection, an add-on; off unless the customer adds it */
  inspection: boolean
  /** when the customer would like the spring turn-on; the recommendation is preselected */
  turnOnPreference: TimingPreference
  /** when the customer would like the fall blowout; the recommendation is preselected */
  blowoutPreference: TimingPreference
  firstName: string
  email: string
  phone: string
  /** the required box on the card step: the Season Pass terms and the terms of service */
  termsAccepted: boolean
  /** the optional boxes on the card step: seasonal tips and offers by email, and by text */
  marketingEmail: boolean
  marketingSms: boolean
  cardSaved: boolean
}

export interface CheckoutState extends CheckoutFields {
  /** 1 to 7 */
  step: number
  /** the pending pass the server made when the contact step passed; sent back so going back and forward reuses it */
  passId?: string
  /** the Stripe session for the card form, and its client secret (never stored; it is only for the form) */
  sessionId?: string
  clientSecret?: string
  /** the real pass from the server, once the card is saved; the Done step shows it in place of the prototype's */
  pass?: Pass
  /** what the server or Stripe refused, in words for the screen; cleared by the next answer */
  failure?: string
  /** a line that is not an error, such as "your saved checkout timed out"; cleared when the customer moves on */
  notice?: string
  /** set by a restore that was on the card step: the server is asked for a fresh card form before the step opens */
  resuming?: boolean
}

export type CheckoutAction =
  | { type: "set"; field: keyof CheckoutFields; value: CheckoutFields[keyof CheckoutFields] }
  | { type: "typeAddress"; text: string }
  | { type: "pickPlace"; place: PlaceSuggestion }
  | { type: "next" }
  | { type: "back" }
  | { type: "goTo"; step: number }
  /** the server made the pending pass and the card form's session: open the card step */
  | { type: "begun"; passId: string; sessionId: string; clientSecret: string }
  /** the card is saved and the pass is active: the season is reserved */
  | { type: "finished"; pass: Pass }
  | { type: "failed"; message: string }
  /** the browser kept this checkout from before a reload: its answers, its pending pass and the step the customer was on */
  | { type: "restore"; step: number; passId?: string; fields: Partial<CheckoutFields> }
  /** the pending pass kept in the browser is gone from the server: start at the contact step with the pass the server made instead */
  | { type: "expired"; passId: string; message: string }

const clampStep = (step: number) => Math.min(STEP_COUNT, Math.max(1, Math.trunc(step)))

export function initialState(prefill: Partial<CheckoutState> = {}): CheckoutState {
  return {
    step: 1,
    address: "",
    place: null,
    town: null,
    access: null,
    accessNote: "",
    today: new Date().toISOString().slice(0, 10),
    zones: MIN_ZONES,
    inspection: false,
    turnOnPreference: "recommended",
    blowoutPreference: "recommended",
    firstName: "",
    email: "",
    phone: "",
    termsAccepted: false,
    marketingEmail: false,
    marketingSms: false,
    cardSaved: false,
    ...prefill,
    ...(prefill.step !== undefined ? { step: clampStep(prefill.step) } : {}),
  }
}

export const digits = (phone: string) => phone.replace(/\D/g, "")

/** Why a contact field cannot pass yet, in the words the screen shows; null when it can. */
export function contactProblem(field: "firstName" | "email" | "phone", value: string): string | null {
  if (field === "firstName") return value.trim() ? null : "We need a first name for the visit notes."
  if (field === "email") return emailProblem(value)
  return digits(value).length === 10 ? null : "We need a ten-digit phone number for the day-of text."
}

export const PICK_ADDRESS = "Pick your address from the list so we have it right."

/** The line under the address box: outside the six towns, or nothing picked after Enter; null when the step can pass. */
export function addressProblem(state: Pick<CheckoutFields, "place">, attempted: boolean): string | null {
  if (state.place) {
    const check = serviceability(state.place)
    return check.ok ? null : outOfAreaMessage(check)
  }
  return attempted ? PICK_ADDRESS : null
}

/** Whether the step on screen has what it needs to move on. */
export function canContinue(state: CheckoutState): boolean {
  switch (STEPS[state.step - 1]?.key) {
    case "address":
      return state.place !== null && serviceability(state.place).ok && state.access !== null
    case "zones":
      return Number.isInteger(state.zones) && state.zones >= MIN_ZONES && state.zones <= MAX_ZONES
    // The add-on starts answered (off), and both preferences start on the recommendation.
    case "inspection":
    case "timing":
      return true
    case "contact":
      return (["firstName", "email", "phone"] as const).every((f) => contactProblem(f, state[f]) === null)
    case "card":
      return state.termsAccepted
    default:
      return false
  }
}

const isDone = (state: CheckoutState) => STEPS[state.step - 1]?.key === "done"

export function reducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value, failure: undefined, notice: undefined }
    // Typing again drops the pick and the town it gave; a pick fills all three at once.
    case "typeAddress":
      return { ...state, address: action.text, place: null, town: null }
    case "pickPlace": {
      const check = serviceability(action.place)
      return { ...state, address: action.place.label, place: action.place, town: check.ok ? check.town : null }
    }
    case "next": {
      if (!canContinue(state)) return state
      const saved = STEPS[state.step - 1].key === "card" ? true : state.cardSaved
      return { ...state, step: clampStep(state.step + 1), cardSaved: saved }
    }
    // Done is terminal: the season is reserved, so there is no way back to the card step.
    case "back":
      return isDone(state) ? state : { ...state, step: clampStep(state.step - 1) }
    case "goTo":
      return isDone(state) ? state : { ...state, step: clampStep(action.step) }
    case "begun":
      return { ...state, passId: action.passId, sessionId: action.sessionId, clientSecret: action.clientSecret, failure: undefined, notice: undefined, resuming: undefined, step: clampStep(state.step + 1) }
    case "finished":
      return { ...state, pass: action.pass, cardSaved: true, failure: undefined, step: STEP_COUNT }
    case "failed":
      return { ...state, failure: action.message, resuming: false }
    // A customer who was on the card step comes back to the contact step and the card form is asked for again; the rest open where they were.
    case "restore": {
      const onCard = action.step >= STEPS.findIndex((s) => s.key === "card") + 1
      return {
        ...state,
        ...action.fields,
        ...(action.passId ? { passId: action.passId } : {}),
        step: clampStep(onCard ? STEPS.findIndex((s) => s.key === "contact") + 1 : action.step),
        resuming: onCard || undefined,
      }
    }
    case "expired":
      return { ...state, passId: action.passId, clientSecret: undefined, sessionId: undefined, notice: action.message, failure: undefined, resuming: undefined, step: STEPS.findIndex((s) => s.key === "contact") + 1 }
  }
}

/** The sentence under the pass card on Done. */
export function doneSentence(state: Pick<CheckoutFields, "turnOnPreference" | "blowoutPreference" | "inspection" | "email" | "today">): string {
  const onSale = visitsOnSale(state.inspection, state.today).map((v) => v.key)
  const parts: string[] = []
  if (onSale.includes("turn-on")) parts.push(`Turn-on preferred ${preferencePhrase("turn-on", state.turnOnPreference)}`)
  if (onSale.includes("inspection")) parts.push("inspection in July")
  if (onSale.includes("blowout")) parts.push(`blowout preferred ${preferencePhrase("blowout", state.blowoutPreference)}`)
  const sentence = parts.join(", ")
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}. We'll email the details to ${state.email}.`
}

/** The consent the purchase records: the terms as accepted now, and the marketing channels whose boxes were ticked. */
export function toConsent(state: Pick<CheckoutFields, "marketingEmail" | "marketingSms">, at: string): Consent {
  const marketingChannels: Consent["marketingChannels"] = [...(state.marketingEmail ? ["email" as const] : []), ...(state.marketingSms ? ["sms" as const] : [])]
  return {
    termsAcceptedAt: at,
    termsVersion: TERMS_VERSION,
    marketingOptIn: marketingChannels.length > 0,
    marketingChannels,
    source: "checkout",
    recordedAt: at,
  }
}

/** The pass the last screen shows, built from the answers. Ids and links are placeholders until the wiring phase; `at` is when the terms were accepted. */
export function toPass(state: CheckoutState, season: number, at = new Date().toISOString()): Pass {
  const visits: PassVisit[] = visitsOnSale(state.inspection, state.today).map((v) => ({
    kind: v.key,
    window: VISIT_WINDOWS[v.key],
    amount: visitPrice(v, state.zones),
  }))
  return {
    id: "p-new",
    number: `TH-${season}-NEW`,
    season,
    clientId: "c-new",
    firstName: state.firstName.trim(),
    town: state.town ?? "Erie",
    zones: state.zones,
    turnOnPreference: state.turnOnPreference,
    blowoutPreference: state.blowoutPreference,
    status: "active",
    visits,
    stripeUrl: "https://dashboard.stripe.com/customers/cus_new",
    jobberUrl: "https://secure.getjobber.com/clients/new",
    cardLast4: state.cardSaved ? "4242" : undefined,
    consent: toConsent(state, at),
    needsCustomerHome: state.access === "no" || undefined,
    accessNote: state.access === "yes" && state.accessNote.trim() ? state.accessNote.trim() : undefined,
  }
}
