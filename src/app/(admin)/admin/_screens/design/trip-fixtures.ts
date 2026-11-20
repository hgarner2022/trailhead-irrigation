import type { FooterAction } from "@/components/blocks/RecordFooter"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { ChecklistItem } from "@/components/blocks/Checklist"
import type { PaymentRowData } from "@/components/blocks/BillingTables"
import type { LineItem, LineTotal } from "@/components/blocks/LineItemList"
import type { Message, Pass } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { PhotoItem } from "@/lib/photos/types"
import { collectPlan } from "@/lib/money/collect"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { FROM_ANDREA, noop, photo, visa, type BillingData, type FooterPlan, type JobPageData, type PillData } from "./job-fixtures"

// Design fixtures for a job with more than one trip: Andrea's Season Pass (Spring turn-on, Fall blowout) in four states, and a repair that
// needed a return trip. A Season Pass trip carries what a one-trip job's visit carries (Hannah, Nov 19 2026): when and who, its checklist
// from the service's template, its photos, its notes, its own actions by state and its own money word. Money words are `words.ts`'s:
// "Charged after this visit", "Paid, card". No wiring.

/** a headed list of facts; the page reads the Where column's address and property facts */
export interface RecordPageColumn {
  heading: string
  rows: readonly RecordFact[]
}

export type TripState = "scheduled" | "today" | "active" | "done" | "charged" | "canceled"

export interface TripData {
  id: string
  title: string
  detail: string
  pills: PillData[]
  money: string | null
  /** the row's own buttons, for a trip that does not open (the repair's return trip) */
  actions: FooterAction[]
  /** a Season Pass visit that is months away and has only the customer's preference: "Early October". It has no day yet, so it does not open; Ryan schedules it from the row. */
  preference?: string
  /** a Season Pass trip opens in place into its own content */
  trip?: {
    state: TripState
    service: string
    day: string
    time: string
    who: string
    /** everyone on the trip; the first is the one the customer hears */
    people: string[]
    price: number
    checklist: ChecklistItem[]
    photos: PhotoItem[]
    notes: TimelineLine[]
    footer: FooterPlan
    collect?: JobPageData["collect"]
  }
}

export interface MultiTripData {
  title: string
  subtitle: string
  pills: PillData[]
  notice?: string
  columns: RecordPageColumn[]
  tripsHeading: string
  trips: TripData[]
  lines: LineItem[]
  totals: LineTotal[]
  billing: BillingData
  notes: TimelineLine[]
  messages: Message[]
  footer: FooterPlan
  pass?: Pass
  /** a Season Pass linked across seasons: renewed from last season's (`renews_job_id` is set), or renewed as next season's */
  renewal?: { kind: "from" | "as"; number: string }
}

export type PassState = "ahead" | "one-done" | "both-done" | "canceled"
export const PASS_STATES: readonly PassState[] = ["ahead", "one-done", "both-done", "canceled"]

const act = (label: string): FooterAction => ({ label, onClick: noop })
const PHONE = { text: "(970) 555-0123", href: "tel:+19705550123" }
export const PHONE_LINK = PHONE
const WHERE: [string, string][] = [["Address", "480 Briggs St, Erie"], ["Gate code", "4417"], ["Must be home", "No"], ["Access note", "Side gate by the garage, dog is friendly."]]
const msg = (id: string, at: string, channel: "email" | "sms", kind: Message["kind"], body: string): Message => ({ id, clientId: "c-1", channel, kind, body, at, status: "delivered" })
const event = (id: string, at: string, what: string): TimelineLine => ({ id, at, actor: "Ryan", what, kind: "event" })

/** The checklist template of each service of a pass (Settings › Services builds these). */
export const TRIP_STEPS: Record<string, readonly string[]> = {
  "spring turn-on": ["Pressure test", "Run every zone", "Set the controller", "Note broken heads"],
  "fall blowout": ["Shut the water", "Blow out each zone", "Drain the backflow", "Set the controller to off"],
  "July inspection": ["Run every zone", "Adjust heads", "Check the controller schedule"],
}

interface Svc { title: string; service: string; day: string; iso: string; price: number }
export const SPRING: Svc = { title: "Spring turn-on", service: "spring turn-on", day: "Mon, May 3", iso: "2027-05-03T16:15:00Z", price: 145 }
export const FALL: Svc = { title: "Fall blowout", service: "fall blowout", day: "Tue, Oct 12", iso: "2027-10-12T17:05:00Z", price: 115 }

const checklistOf = (service: string, done: number): ChecklistItem[] => (TRIP_STEPS[service] ?? []).map((label, i) => ({ id: `${service}-${i}`, label, done: i < done }))
const TIME: Record<TripState, string> = { scheduled: "Any time", today: "9:00 am", active: "Active since 9:12 am", done: "Done at 9:15 am", charged: "Done at 9:15 am", canceled: "Canceled" }
const PILLS: Record<TripState, PillData[]> = {
  scheduled: [{ status: "scheduled" }],
  today: [{ status: "today" }],
  active: [{ status: "job-active" }],
  done: [{ status: "done" }, { status: "owed" }],
  charged: [{ status: "done" }, { status: "paid", label: "Paid, card" }],
  canceled: [{ status: "cancelled" }],
}
const MONEY = (state: TripState, price: number): string | null => (state === "done" ? `$${price} unpaid` : state === "charged" ? "Paid, card" : state === "canceled" ? null : "Charged after this visit")

/** The buttons a trip allows by its state, as the one-trip page has them (the same labels, so the same confirmations). */
const footerOf = (state: TripState, price: number): FooterPlan => {
  const more = (...labels: string[]) => labels.map(act)
  switch (state) {
    case "scheduled": return { primary: act("Move"), secondary: [act("Mark done"), act("Send a message")], more: more("Edit", "Add a note") }
    case "today": return { primary: act("On my way"), secondary: [act("Mark done"), act("Send a message")], more: more("Move", "Edit", "Add a note") }
    case "active": return { primary: act("Mark done"), secondary: [act("Send a message")], more: more("Move", "Edit", "Add a note") }
    case "done": return { primary: act("Collect payment"), secondary: [act("Send a message")], more: more("Undo done", "Edit") }
    case "charged": return { more: more(`Refund $${price}`, "Send a message", "Undo done") }
    case "canceled": return {}
  }
}

const trailOf = (s: Svc, state: TripState): TimelineLine[] => {
  const lines: TimelineLine[] = [event(`${s.service}-sched`, "2026-11-02T15:12:00Z", `Scheduled for ${s.day}`)]
  if (state === "done" || state === "charged") lines.unshift(event(`${s.service}-done`, s.iso, "Marked done"))
  if (state === "charged") lines.unshift(event(`${s.service}-charged`, s.iso, `Charged $${s.price} to Visa ending 4242`))
  if (state === "canceled") lines.unshift(event(`${s.service}-canceled`, "2026-11-10T20:00:00Z", "Canceled with the pass"))
  return lines
}

const photosOf = (s: Svc, state: TripState, first: boolean): PhotoItem[] => {
  const n = s === SPRING ? 10 : 20
  const theirs = first ? [photo(n + 1, { ...FROM_ANDREA, id: `${s.service}-b`, addedAtBooking: true, createdAt: "2026-11-02T15:08:00Z" }), photo(n + 2, { ...FROM_ANDREA, id: `${s.service}-l`, createdAt: "2026-11-17T21:30:00Z" })] : []
  const crew = state === "done" || state === "charged" ? [photo(n + 3, { id: `${s.service}-c1`, shownToCustomer: true, createdAt: s.iso }), photo(n + 4, { id: `${s.service}-c2`, createdAt: s.iso })] : []
  return state === "canceled" ? [] : [...theirs, ...crew]
}

/** One trip of a pass, in a state. The first trip of the pass has the customer's photos. */
export function tripOf(s: Svc, id: string, state: TripState, opts: { day?: string; time?: string; people?: string[]; instructions?: string } = {}): TripData {
  const day = opts.day ?? s.day
  const people = opts.people ?? ["Ryan Garner"]
  const done = state === "done" || state === "charged" ? 99 : state === "active" ? 2 : 0
  return {
    id,
    title: s.title,
    detail: state === "canceled" ? "Canceled with the pass" : `${day} · ${people.map((p) => p.split(" ")[0]).join(" and ")} · ${opts.time ?? TIME[state]}`,
    pills: PILLS[state],
    money: MONEY(state, s.price),
    actions: [],
    trip: {
      state,
      service: s.service,
      day,
      time: opts.time ?? TIME[state],
      who: people[0]!,
      people,
      price: s.price,
      checklist: checklistOf(s.service, done),
      photos: photosOf(s, state, id === "t1"),
      notes: [...(opts.instructions ? [event(`${s.service}-instr`, "2026-11-18T17:05:00Z", `Instructions for the crew: ${opts.instructions}`)] : []), ...trailOf(s, state)],
      footer: footerOf(state, s.price),
      // a pass trip with a card: "Charge the card as agreed" is chosen, the cash ways are behind "Paid another way"
      collect: state === "done" ? { plan: collectPlan({ amount: s.price, card: visa, isPass: true, invoiceOpen: false, canInvoice: true, declined: false, charging: false }), summary: `${s.title} · $${s.price} unpaid` } : undefined,
    },
  }
}

/**
 * A Season Pass visit that is months away: the customer gave only a preference ("Early October"), so there is no day, no person and no time. The row says the preference and that there is no day
 * yet, Schedule is on the row, and the money word is the pass's. Ryan sees what to schedule (Hannah, Nov 20 2026).
 */
export function preferenceTripOf(s: Svc, id: string, preference: string): TripData {
  return { id, title: s.title, detail: `Preference: ${preference} · No day yet`, pills: [{ status: "needs-a-day" }], money: "Charged after this visit", actions: [act("Schedule")], preference }
}

const passColumns: RecordPageColumn[] = [
  { heading: "Season Pass", rows: [["Season", "2027"], ["Zones", "8"], ["Card", "Visa ending 4242"], ["Timing", "Spring first week of May, fall mid October"]] },
  { heading: "Where", rows: WHERE },
]
const PASS_LINES: LineItem[] = [{ name: "Spring turn-on", description: "Turn the system on, check every zone and set the controller.", amount: "$145" }, { name: "Fall blowout", description: "Clear the lines with compressed air before the first freeze.", amount: "$115" }]
const MORE: FooterAction[] = [act("Skip a visit"), act("Send a message"), act("Send card link"), act("Resend confirmation"), { label: "Open in Stripe", href: "https://dashboard.stripe.com", external: true }]
const passNotes = [event("n2", "2026-11-02T15:10:00Z", "Sold the Season Pass online, TH-2027-0008")]
const passMsgs = [msg("m1", "2026-11-02T15:11:00Z", "email", "purchase-confirmation", "Your Season Pass is reserved: TH-2027-0008")]
const SVC_BY_TITLE: Record<string, Svc> = { [SPRING.title]: SPRING, [FALL.title]: FALL }

/** The pass's Billing from its trips: one Payments row per charged trip, and the one status line. */
function passBilling(trips: TripData[], canceled: boolean): BillingData {
  const charged = trips.filter((t) => t.trip?.state === "charged")
  const sum = charged.reduce((n, t) => n + (t.trip?.price ?? 0), 0)
  const left = trips.filter((t) => t.trip && t.trip.state !== "charged" && t.trip.state !== "canceled")
  const owed = left.reduce((n, t) => n + (t.trip?.price ?? 0), 0)
  const payments: PaymentRowData[] = [...charged].reverse().map((t) => ({
    id: `pay-${t.id}`, at: SVC_BY_TITLE[t.title]?.iso ?? "2027-05-03T16:15:00Z", method: "card", methodLabel: `${t.title}, Visa ending 4242`, amount: `$${t.trip!.price}`, by: "Ryan",
    receiptHref: `/account/receipts/pay-${t.id}`, stripeHref: `https://dashboard.stripe.com/payments/pi_pass_${t.id}`,
  }))
  const summary: [string, string][] = [["Season total", `$${sum + owed}`], ["Paid so far", `$${sum}`], ["Card", "Visa ending 4242"]]
  if (canceled) return { summary, rows: [], emptyLine: "Nothing more will be charged." }
  const paidLine: BillingData["paidLine"] = left.length === 0
    ? { tone: "paid", title: "Paid in full", text: `$${sum} charged to the card: ${charged.map((t) => t.title).reverse().join(" and ")}.` }
    : { tone: "unpaid", title: `$${owed} unpaid`, text: charged.length ? `${left[0]!.title} is charged to the card after the visit.` : "Each visit is charged to the card after it is done." }
  return { summary, rows: [], paidLine, payments }
}

/** A Season Pass page from its trips, so the clickable flow and the four states read the same. */
export function passPageFromTrips(trips: TripData[], o: { canceled?: boolean; renewal?: MultiTripData["renewal"] } = {}): MultiTripData {
  const pass = (snapshot.passes as Pass[])[0]
  const canceled = Boolean(o.canceled)
  const billing = passBilling(trips, canceled)
  const sum = billing.summary[1]![1]
  const allDone = trips.every((t) => t.trip?.state === "charged")
  return {
    title: "Season Pass TH-2027-0008",
    subtitle: "Andrea Dalton · Sold Nov 2, website",
    pills: [canceled ? { status: "cancelled" } : allDone ? { status: "done" } : { status: "active" }],
    notice: canceled ? "Pass canceled Nov 10. Nothing more will be charged." : undefined,
    columns: passColumns,
    tripsHeading: "Visits",
    trips,
    lines: PASS_LINES,
    totals: [["Season total", "$260", "strong"], ["Paid so far", sum]],
    billing,
    notes: passNotes,
    messages: passMsgs,
    // the pass's own actions stay in the header: Change the pass, Add July, Skip a visit, Cancel pass
    footer: canceled ? {} : allDone ? { more: MORE } : { secondary: [act("Change the pass"), act("Add July")], more: MORE, destructive: act("Cancel pass") },
    pass: canceled ? { ...pass, status: "cancelled" } : pass,
    renewal: o.renewal,
  }
}

export function passPageOf(state: PassState, renewal?: MultiTripData["renewal"]): MultiTripData {
  const spring = tripOf(SPRING, "t1", state === "ahead" ? "scheduled" : state === "canceled" ? "canceled" : "charged")
  const fall = tripOf(FALL, "t2", state === "both-done" ? "charged" : state === "canceled" ? "canceled" : "scheduled")
  return passPageFromTrips([spring, fall], { canceled: state === "canceled", renewal })
}

/**
 * The Season Pass right after an April purchase: the spring turn-on has its exact day and time and the fall blowout has only the customer's preference, so Ryan sees what to schedule. With
 * `january`, both visits have only a preference.
 */
export function passPageBoughtOf(when: "april" | "january"): MultiTripData {
  const spring = when === "april" ? tripOf(SPRING, "t1", "scheduled", { day: "Thu, Apr 29", time: "10:30 am" }) : preferenceTripOf(SPRING, "t1", "Early May")
  const fall = preferenceTripOf(FALL, "t2", when === "april" ? "Early October" : "Late October")
  const data = passPageFromTrips([spring, fall])
  return { ...data, subtitle: `Andrea Dalton · Sold ${when === "april" ? "Apr 14" : "Jan 12"}, website`, columns: data.columns.map((c) => (c.heading === "Season Pass" ? { ...c, rows: c.rows.filter(([k]) => k !== "Timing") } : c)) }
}

export function returnTripOf(): MultiTripData {
  return {
    title: "Andrea Dalton",
    subtitle: "Sprinkler repair, 2 trips · Added Nov 12",
    pills: [{ status: "scheduled" }, { status: "owed", label: "$85 unpaid" }],
    columns: [{ heading: "Where", rows: WHERE }, { heading: "Who", rows: [["Phone", "(970) 555-0123"], ["Who", "Ryan Garner"], ["Card on file", "Visa ending 4242"]] }],
    tripsHeading: "Visits",
    trips: [
      { id: "t1", title: "Sprinkler repair visit", detail: "Thu, Nov 12 · Ryan · Done at 2:30 pm", pills: [{ status: "done" }], money: "Paid, card", actions: [] },
      { id: "t2", title: "Return trip: new valve", detail: "Thu, Nov 19 · Ryan · Any time", pills: [{ status: "scheduled" }], money: null, actions: [act("Move"), act("Mark done")] },
    ],
    lines: [{ name: "Repair", description: "A visit to find the problem and fix what we can that day.", amount: "$145" }, { name: "Valve replacement", description: "A new zone valve for the front lawn, installed on the return trip.", amount: "$85" }],
    totals: [["Total", "$230", "strong"], ["Paid", "$145"], ["Unpaid", "$85", "alert"]],
    billing: { summary: [["Total", "$230"], ["Paid", "$145"], ["Unpaid", "$85"]], rows: [{ id: "p1", kind: "payment", title: "Card", detail: "Sprinkler repair visit · Nov 12", amount: "$145" }] },
    notes: [event("n1", "2026-11-12T21:40:00Z", "Added a return trip for the valve, Thu, Nov 19")],
    messages: [msg("m1", "2026-11-12T21:41:00Z", "sms", "date-set", "Trailhead: Ryan is back Thu, Nov 19.")],
    footer: { secondary: [act("Add a return trip"), act("Send a message")], more: [act("Edit"), act("Add a note")], destructive: act("Cancel job") },
  }
}
