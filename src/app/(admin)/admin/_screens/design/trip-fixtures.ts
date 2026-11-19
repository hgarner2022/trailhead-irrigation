import type { FooterAction } from "@/components/blocks/RecordFooter"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { BillingRowData } from "@/components/blocks/BillingSection"
import type { LineItem, LineTotal } from "@/components/blocks/LineItemList"
import type { Message, Pass } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { noop, type FooterPlan, type PillData } from "./job-fixtures"

// Design fixtures for a job with more than one trip: Andrea's Season Pass (Spring turn-on, Fall blowout) in four states, and a repair that
// needed a return trip. Money words are `words.ts`'s: "$145, charged after the visit", "Paid, card". No wiring.

/** a headed list of facts; the page reads the Where column's address and property facts */
export interface RecordPageColumn {
  heading: string
  rows: readonly RecordFact[]
}

export interface TripData {
  id: string
  title: string
  detail: string
  pills: PillData[]
  money: string | null
  actions: FooterAction[]
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
  billing: { summary: [string, string][]; rows: BillingRowData[]; emptyLine?: string }
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

const SPRING = { title: "Spring turn-on", ahead: "Mon, May 3 · Ryan · Any time", done: "Mon, May 3 · Ryan · Done at 9:15 am" }
const FALL = { title: "Fall blowout", ahead: "Tue, Oct 12 · Ryan · Any time", done: "Tue, Oct 12 · Ryan · Done at 10:05 am" }
const ahead = (t: typeof SPRING, price: string, id: string): TripData => ({ id, title: t.title, detail: t.ahead, pills: [{ status: "scheduled" }], money: `${price}, charged after the visit`, actions: [act("Move"), act("Mark done")] })
const done = (t: typeof SPRING, id: string): TripData => ({ id, title: t.title, detail: t.done, pills: [{ status: "done" }], money: "Paid, card", actions: [] })
const gone = (t: typeof SPRING, id: string): TripData => ({ id, title: t.title, detail: "Canceled with the pass", pills: [{ status: "cancelled" }], money: null, actions: [] })

const passColumns: RecordPageColumn[] = [
  { heading: "Season Pass", rows: [["Season", "2027"], ["Zones", "8"], ["Card", "Visa ending 4242"], ["Timing", "Spring first week of May, fall mid October"]] },
  { heading: "Where", rows: WHERE },
]
const charge = (id: string, title: string, day: string): BillingRowData => ({ id, kind: "payment", title: "Card", detail: `${title} · ${day}`, amount: title === "Spring turn-on" ? "$145" : "$115" })
const PASS_LINES: LineItem[] = [{ name: "Spring turn-on", description: "Turn the system on, check every zone and set the controller.", amount: "$145" }, { name: "Fall blowout", description: "Clear the lines with compressed air before the first freeze.", amount: "$115" }]
const MORE: FooterAction[] = [act("Send card link"), act("Resend confirmation"), { label: "Open in Stripe", href: "https://dashboard.stripe.com", external: true }]
const passNotes = [event("n2", "2026-11-02T15:10:00Z", "Sold the Season Pass online, TH-2027-0008")]
const passMsgs = [msg("m1", "2026-11-02T15:11:00Z", "email", "purchase-confirmation", "Your Season Pass is reserved: TH-2027-0008")]

export function passPageOf(state: PassState, renewal?: MultiTripData["renewal"]): MultiTripData {
  const pass = (snapshot.passes as Pass[])[0]
  const spring = state === "ahead" ? ahead(SPRING, "$145", "t1") : state === "canceled" ? gone(SPRING, "t1") : done(SPRING, "t1")
  const fall = state === "both-done" ? done(FALL, "t2") : state === "canceled" ? gone(FALL, "t2") : ahead(FALL, "$115", "t2")
  const paid = state === "both-done" ? ["Spring turn-on", "Fall blowout"] : state === "one-done" ? ["Spring turn-on"] : []
  const sum = (state === "both-done" ? "$260" : state === "one-done" ? "$145" : "$0")
  return {
    title: "Season Pass TH-2027-0008",
    subtitle: "Andrea Dalton · Sold Nov 2, website",
    pills: [state === "canceled" ? { status: "cancelled" } : state === "both-done" ? { status: "done" } : { status: "active" }],
    notice: state === "canceled" ? "Pass canceled Nov 10. Nothing more will be charged." : undefined,
    columns: passColumns,
    tripsHeading: "Visits",
    trips: [spring, fall],
    lines: PASS_LINES,
    totals: [["Season total", "$260", "strong"], ["Paid so far", sum]],
    billing: { summary: [["Season total", "$260"], ["Paid so far", sum], ["Card", "Visa ending 4242"]], rows: paid.map((t, i) => charge(`c${i}`, t, t === "Spring turn-on" ? "May 3" : "Oct 12")), emptyLine: "Each visit is charged to the card after it is done." },
    notes: passNotes,
    messages: passMsgs,
    footer: state === "canceled" ? {} : state === "both-done" ? { more: MORE } : { secondary: [act("Change the pass"), act("Send a message")], more: MORE, destructive: act("Cancel pass") },
    pass: state === "canceled" ? { ...pass, status: "cancelled" } : pass,
    renewal,
  }
}

export function returnTripOf(): MultiTripData {
  return {
    title: "Andrea Dalton",
    subtitle: "Sprinkler repair visit, 2 trips · Added Nov 12",
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
