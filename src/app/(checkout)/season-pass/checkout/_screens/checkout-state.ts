/**
 * The state behind the six-screen Season Pass checkout: which step is on
 * screen and what the customer has answered so far. The reducer is pure and
 * `canContinue` holds every step's rule, so the flow can be tested without
 * rendering; `toPass` turns the answers into the `Pass` the last screen
 * shows. It imports no React, so the server runs the same `canContinue` over what the browser sent (src/lib/pass/server/create.ts);
 * `useCheckoutState`, the thin hook the screen calls, lives in use-checkout-state.ts.
 */
import type { Consent, Pass, PassVisit, TimingPreference, Town } from "@/lib/admin/types"
import { instantOf } from "@/lib/admin/shape"
import { emailProblem } from "@/lib/email-check"
import { outOfAreaMessage, serviceability, type PlaceSuggestion } from "@/lib/places"
import { daysComplete, choicesAfterOffer, type DayChoice, type Offers } from "./checkout-days"
import { MAX_ZONES, MIN_ZONES, TERMS_VERSION, visitPrice, visitsOnSale } from "@/lib/season-pass"

export type StepKey = "address" | "zones" | "inspection" | "days" | "contact" | "card" | "done"

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
  { key: "days", question: "Pick your days", action: "Continue" },
  { key: "contact", question: "Who should we reach?", action: "Continue" },
  { key: "card", question: "Save a card for after each visit.", action: "Save card and reserve" },
  { key: "done", question: "Your season is reserved" },
]
export const STEP_COUNT = STEPS.length
const CARD_STEP = STEPS.findIndex((s) => s.key === "card") + 1
/** Stripe closes a card form's session after this long; the pass is kept, the form is asked for again. */
export const SESSION_MAX_AGE_MS = 45 * 60 * 1000

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
  /** kept at the recommendation: the checkout no longer asks for a timing, it offers days (`days`) */
  turnOnPreference: TimingPreference
  blowoutPreference: TimingPreference
  /** the day held for each visit on the "Your days" step, the first offer unless the customer chose another */
  days: DayChoice[]
  firstName: string
  email: string
  phone: string
  /** the required box that ends the contact step: the Season Pass terms and the terms of service */
  termsAccepted: boolean
  /** the optional boxes under it: seasonal tips and offers by email, and by text */
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
  /** what "Try again" re-runs after a failure: the card step's activation, or the pending pass and card session (a fresh one when the old expired) */
  retry?: "finish" | "begin"
  /** when the card form's session was made (ms since the epoch); Stripe closes it after 45 minutes */
  sessionAt?: number
  /** the days the server offered per visit for this address and zone count; null while they load */
  offers: Offers | null
  /** a renewal on the card already on file: no contact or card step, and the terms are accepted on the days step */
  skipCard?: boolean
  /** a line that is not an error, such as "your saved checkout timed out"; cleared when the customer moves on */
  notice?: string
}

export type CheckoutAction =
  | { type: "set"; field: keyof CheckoutFields; value: CheckoutFields[keyof CheckoutFields] }
  | { type: "typeAddress"; text: string }
  | { type: "pickPlace"; place: PlaceSuggestion }
  /** the server's offered days arrived: keep a day still on offer, preselect the first otherwise */
  | { type: "offered"; offers: Offers }
  | { type: "next" }
  | { type: "back" }
  | { type: "goTo"; step: number }
  /** the server made the pending pass and the card form's session: open the card step */
  | { type: "begun"; passId: string; sessionId: string; clientSecret: string; at?: number }
  /** the card is saved and the pass is active: the season is reserved */
  | { type: "finished"; pass: Pass }
  | { type: "failed"; message: string; retry?: "finish" | "begin" }
  /** the browser kept this checkout from before a reload: its answers, its pending pass and the step the customer was on */
  | { type: "restore"; step: number; passId?: string; fields: Partial<CheckoutFields> }

/** Said once when a reload or a return visit lands on the contact step from the card step. */
export const RESTORED_CARD_NOTICE = "Welcome back. Your details are saved. Accept the terms and continue to open the card form."

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
    days: [],
    offers: null,
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

export const ACCESS_PROBLEM = "Tell us whether we can get to the system without you."
export const PICK_ADDRESS = "Pick your address from the list so we have it right."

/** The line under the address box: outside the six towns, or nothing picked after Enter; null when the step can pass. */
export function addressProblem(state: Pick<CheckoutFields, "place">, attempted: boolean): string | null {
  if (state.place) {
    const check = serviceability(state.place)
    return check.ok ? null : outOfAreaMessage(check)
  }
  return attempted ? PICK_ADDRESS : null
}

/** The fields of the step on screen that cannot pass yet, named for the error summary (each one's own message sits beside it). */
export function stepProblems(state: CheckoutState): string[] {
  const label = { firstName: "First name", email: "Email", phone: "Phone" } as const
  switch (STEPS[state.step - 1]?.key) {
    case "address":
      return [...(addressProblem(state, true) ? ["Address"] : []), ...(state.place && state.access === null ? ["Access"] : [])]
    case "contact":
      return [...(["firstName", "email", "phone"] as const).filter((f) => contactProblem(f, state[f]) !== null).map((f) => label[f]), ...(state.termsAccepted ? [] : ["Terms"])]
    case "days":
      return state.skipCard && !state.termsAccepted ? ["Terms"] : []
    default:
      return []
  }
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
      return true
    // Every visit with days on offer holds one (the first is preselected); with none on offer Ryan sets that day.
    case "days":
      return daysComplete(state.offers, state.days) && (!state.skipCard || state.termsAccepted)
    // The terms are accepted here, so Continue on the contact step is the moment of acceptance.
    case "contact":
      return state.termsAccepted && (["firstName", "email", "phone"] as const).every((f) => contactProblem(f, state[f]) === null)
    case "card":
      return true
    default:
      return false
  }
}

const isDone = (state: CheckoutState) => STEPS[state.step - 1]?.key === "done"

export function reducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "set":
      // New zones or add-on mean new days on offer.
      return { ...state, [action.field]: action.value, ...(action.field === "zones" || action.field === "inspection" ? { offers: null } : {}), failure: undefined, retry: undefined, notice: undefined }
    // Typing again drops the pick and the town it gave; a pick fills all three at once.
    case "typeAddress":
      return { ...state, address: action.text, place: null, town: null }
    case "pickPlace": {
      const check = serviceability(action.place)
      return { ...state, address: action.place.label, place: action.place, town: check.ok ? check.town : null, offers: null }
    }
    case "offered":
      return { ...state, offers: action.offers, days: choicesAfterOffer(action.offers, state.days) }
    case "next": {
      if (!canContinue(state)) return state
      const saved = STEPS[state.step - 1].key === "card" ? true : state.cardSaved
      return { ...state, step: clampStep(state.step + 1), cardSaved: saved }
    }
    // Done is terminal: the season is reserved, so there is no way back to the card step.
    case "back":
      return isDone(state) ? state : { ...state, step: clampStep(state.step - 1), failure: undefined, retry: undefined }
    case "goTo":
      return isDone(state) ? state : { ...state, step: clampStep(action.step) }
    // The card form is open: always the card step, also when a fresh session replaces one that expired while the customer sat on it.
    case "begun":
      return { ...state, passId: action.passId, sessionId: action.sessionId, clientSecret: action.clientSecret, sessionAt: action.at, failure: undefined, retry: undefined, notice: undefined, step: CARD_STEP }
    case "finished":
      return { ...state, pass: action.pass, cardSaved: true, failure: undefined, retry: undefined, step: STEP_COUNT }
    case "failed":
      return { ...state, failure: action.message, retry: action.retry }
    // A customer who was on the card step comes back to the contact step, where the terms are accepted again (they are never kept) before a new card form opens; the rest open where they were.
    case "restore": {
      const onCard = action.step >= STEPS.findIndex((s) => s.key === "card") + 1
      return {
        ...state,
        ...action.fields,
        ...(action.passId ? { passId: action.passId } : {}),
        step: clampStep(onCard ? STEPS.findIndex((s) => s.key === "contact") + 1 : action.step),
        ...(onCard ? { notice: RESTORED_CARD_NOTICE } : {}),
      }
    }
  }
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

const dayFields = (d: DayChoice | undefined): Partial<PassVisit> => (d ? { scheduledAt: instantOf(d.day, d.start), scheduledOn: d.day, startTime: d.start } : {})

/** The pass the last screen shows, built from the answers. Ids and links are placeholders until the wiring phase; `at` is when the terms were accepted. */
export function toPass(state: CheckoutState, season: number, at = new Date().toISOString()): Pass {
  const visits: PassVisit[] = visitsOnSale(state.inspection, state.today).map((v) => ({
    kind: v.key,
    window: VISIT_WINDOWS[v.key],
    amount: visitPrice(v, state.zones),
    ...dayFields(state.days.find((d) => d.kind === v.key)),
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
