/**
 * The state behind the six-screen Season Pass checkout: which step is on
 * screen and what the customer has answered so far. The reducer is pure and
 * `canContinue` holds every step's rule, so the flow can be tested without
 * rendering; `toPass` turns the answers into the `Pass` the last screen
 * shows. `useCheckoutState` is the thin hook the screen calls.
 */
import { useReducer } from "react"
import type { BlowoutWeek, Pass, PassVisit, Town } from "@/lib/admin/types"
import { spotsLeft } from "@/lib/admin/metrics"
import { MAX_ZONES, MIN_ZONES, SEASON_PASS_VISITS, visitPrice } from "@/lib/season-pass"

export type StepKey = "address" | "zones" | "week" | "contact" | "card" | "done"

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
  { key: "week", question: "Which week in October for your blowout?", action: "Continue" },
  { key: "contact", question: "Who should we reach?", action: "Continue" },
  { key: "card", question: "Save a card for after each visit.", action: "Save card and reserve" },
  { key: "done", question: "Your season is reserved" },
]
export const STEP_COUNT = STEPS.length

export const TOWNS: readonly Town[] = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

export interface CheckoutFields {
  address: string
  town: Town | null
  zones: number
  /** ISO date of the chosen week's Monday */
  weekStart: string | null
  firstName: string
  email: string
  phone: string
  cardSaved: boolean
}

export interface CheckoutState extends CheckoutFields {
  /** 1 to 6 */
  step: number
}

export type CheckoutAction =
  | { type: "set"; field: keyof CheckoutFields; value: CheckoutFields[keyof CheckoutFields] }
  | { type: "next"; weeks: BlowoutWeek[] }
  | { type: "back" }
  | { type: "goTo"; step: number }

const clampStep = (step: number) => Math.min(STEP_COUNT, Math.max(1, Math.trunc(step)))

export function initialState(prefill: Partial<CheckoutState> = {}): CheckoutState {
  return {
    step: 1,
    address: "",
    town: null,
    zones: MIN_ZONES,
    weekStart: null,
    firstName: "",
    email: "",
    phone: "",
    cardSaved: false,
    ...prefill,
    ...(prefill.step !== undefined ? { step: clampStep(prefill.step) } : {}),
  }
}

export const digits = (phone: string) => phone.replace(/\D/g, "")

/** Why a contact field cannot pass yet, in the words the screen shows; null when it can. */
export function contactProblem(field: "firstName" | "email" | "phone", value: string): string | null {
  if (field === "firstName") return value.trim() ? null : "We need a first name for the visit notes."
  if (field === "email") return value.includes("@") ? null : "We need an email for the receipt."
  return digits(value).length === 10 ? null : "We need a ten-digit phone number for the day-of text."
}

export function weekOpen(weekStart: string | null, weeks: BlowoutWeek[]): boolean {
  const week = weeks.find((w) => w.weekStart === weekStart)
  return !!week && spotsLeft(week) > 0
}

/** Whether the step on screen has what it needs to move on. */
export function canContinue(state: CheckoutState, weeks: BlowoutWeek[]): boolean {
  switch (STEPS[state.step - 1]?.key) {
    case "address":
      return state.address.trim().length > 0 && state.town !== null
    case "zones":
      return Number.isInteger(state.zones) && state.zones >= MIN_ZONES && state.zones <= MAX_ZONES
    case "week":
      return weekOpen(state.weekStart, weeks)
    case "contact":
      return (["firstName", "email", "phone"] as const).every((f) => contactProblem(f, state[f]) === null)
    case "card":
      return true
    default:
      return false
  }
}

export function reducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value }
    case "next": {
      if (!canContinue(state, action.weeks)) return state
      const saved = STEPS[state.step - 1].key === "card" ? true : state.cardSaved
      return { ...state, step: clampStep(state.step + 1), cardSaved: saved }
    }
    case "back":
      return { ...state, step: clampStep(state.step - 1) }
    case "goTo":
      return { ...state, step: clampStep(action.step) }
  }
}

export function useCheckoutState(prefill?: Partial<CheckoutState>) {
  return useReducer(reducer, prefill, initialState)
}

/** "4th", "11th", "22nd": the day of the month as the pass windows write it. */
export function ordinal(day: number): string {
  const tens = day % 100
  if (tens >= 11 && tens <= 13) return `${day}th`
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th"
  return `${day}${suffix}`
}

/** The pass the last screen shows, built from the answers. Ids and links are placeholders until the wiring phase. */
export function toPass(state: CheckoutState, season: number, weeks: BlowoutWeek[]): Pass {
  // The reducer never lets a full or missing week past step 3; the fallback only covers a story that skips it.
  const weekStart = state.weekStart ?? weeks[0]?.weekStart ?? `${season}-10-04`
  const day = Number(weekStart.slice(8, 10))
  const windows = ["April to May", "July", `October, week of the ${ordinal(day)}`]
  const visits: PassVisit[] = SEASON_PASS_VISITS.map((v, i) => ({
    kind: v.key,
    window: windows[i],
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
    blowoutWeek: weekStart,
    status: "active",
    visits,
    stripeUrl: "https://dashboard.stripe.com/customers/cus_new",
    jobberUrl: "https://secure.getjobber.com/clients/new",
    cardLast4: state.cardSaved ? "4242" : undefined,
  }
}
