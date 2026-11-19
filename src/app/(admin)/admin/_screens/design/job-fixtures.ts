import type { FooterAction } from "@/components/blocks/RecordFooter"
import type { LineItem, LineTotal } from "@/components/blocks/LineItemList"
import type { BillingRowData } from "@/components/blocks/BillingSection"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { PillStatus } from "@/components/blocks/StatusPill"
import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import { collectPlan, type CollectPlan } from "@/lib/money/collect"

// Design fixtures for the job object (docs/plans/2026-11-19-job-object-design.md): pure data in the shapes the screens take, nothing read
// from an API. "Today" is Wednesday, November 18, 2026. Andrea Dalton in Erie has a repair; the words are the ones of `words.ts`.

export const NOW = new Date("2026-11-18T18:00:00Z")
export const noop = () => undefined
export const noteOk = async () => ({ ok: true as const })

export type JobState = "unscheduled" | "scheduled" | "today" | "late" | "done-unpaid" | "done-paid" | "invoice-sent" | "past-due" | "canceled"
export const JOB_STATES: readonly JobState[] = ["unscheduled", "scheduled", "today", "late", "done-unpaid", "done-paid", "invoice-sent", "past-due", "canceled"]

export interface FooterPlan {
  primary?: FooterAction
  secondary?: [FooterAction] | [FooterAction, FooterAction]
  more?: FooterAction[]
  destructive?: FooterAction
  /** beat two draws its button in the footer */
  slot?: boolean
}

export interface PillData {
  status: PillStatus
  label?: string
}

export interface JobPageData {
  customer: string
  phone: { text: string; href: string }
  subtitle: string
  pills: PillData[]
  /** muted words next to the pills: "day passed" */
  pillNote?: string
  notice?: string
  when: RecordFact[]
  where: RecordFact[]
  lines: LineItem[]
  totals: LineTotal[]
  billing: { summary: [string, string][]; rows: BillingRowData[]; emptyLine?: string; status?: { text: string; tone?: "past-due" } }
  collect?: { plan: CollectPlan; summary: string }
  notes: TimelineLine[]
  messages: Message[]
  footer: FooterPlan
}

const act = (label: string): FooterAction => ({ label, onClick: noop })
const PHONE = { text: "(970) 555-0123", href: "tel:+19705550123" }
const WHERE: RecordFact[] = [["Address", "480 Briggs St, Erie"], ["Gate code", "4417"], ["Must be home", "No"], ["Access note", "Side gate by the garage, dog is friendly."]]
const WHO = "Ryan Garner"
const LINE: LineItem[] = [{ name: "Repair", description: "A visit to find the problem and fix what we can that day.", amount: "$145" }]
const CARD: [string, string] = ["Card on file", "Visa ending 4242"]
const ADDED = (id: string, at = "2026-11-18T16:10:00Z"): TimelineLine => ({ id, at, actor: "Ryan", what: "Added the job", kind: "event" })
const msg = (id: string, at: string, channel: "email" | "sms", kind: Message["kind"], body: string, jobId = "job-1"): Message => ({ id, clientId: "c-1", jobId, channel, kind, body, at, status: "delivered" })
const base: Omit<JobPageData, "when" | "pills" | "footer" | "billing" | "totals" | "notes" | "messages"> = { customer: "Andrea Dalton", phone: PHONE, subtitle: "Sprinkler repair visit · Added Nov 18", where: WHERE, lines: LINE }
const owedTotals: LineTotal[] = [["Total", "$145", "strong"], ["Paid", "$0"], ["Unpaid", "$145", "alert"]]
const openTotals: LineTotal[] = [["Total", "$145", "strong"], ["Paid", "$0"]]
const waiting = { summary: [["Total", "$145"], CARD] as [string, string][], rows: [], emptyLine: "Nothing to bill until the trip is done." }
const day = (d: string, t: string): RecordFact[] => [["Day", d], ["Time", t], ["Who", WHO]]
const more = (...labels: string[]) => labels.map(act)
const visa = { brand: "visa", last4: "4242" }
const input = { amount: 145, isPass: false, invoiceOpen: false, canInvoice: true, declined: false, charging: false }

const PAID_NOTES: TimelineLine[] = [{ id: "n3", at: "2026-11-18T17:50:00Z", actor: "Ryan", what: "Marked done and recorded $145, Venmo", kind: "event" }]
const invoice = (sent: string, due: string, id = "i1"): BillingRowData => ({ id, kind: "invoice", title: "Invoice 1042", detail: `Sent ${sent} · due ${due} · $145`, onOpen: noop })

export function jobPageOf(state: JobState): JobPageData {
  const scheduledMsgs = [msg("m1", "2026-11-18T16:30:00Z", "sms", "date-set", "Trailhead: your repair is Tue, Nov 24. We'll text your window the day before.")]
  switch (state) {
    case "unscheduled":
      return { ...base, pills: [{ status: "needs-a-day" }], when: day("No day yet", "Any time").map((r) => (r[0] === "Who" ? ["Who", "No one yet"] : r)), billing: waiting, totals: openTotals, notes: [ADDED("n1")], messages: [], footer: { primary: act("Schedule"), secondary: [act("Mark done"), act("Send a text")], more: more("Edit", "Add a note"), destructive: act("Cancel job") } }
    case "scheduled":
      return { ...base, pills: [{ status: "scheduled" }], when: day("Tue, Nov 24", "Any time"), billing: waiting, totals: openTotals, notes: [ADDED("n1"), { id: "n2", at: "2026-11-18T16:30:00Z", actor: "Ryan", what: "Set the day to Tue, Nov 24", kind: "event" }], messages: scheduledMsgs, footer: { primary: act("Move"), secondary: [act("Mark done"), act("Send a text")], more: more("Edit", "Add a note"), destructive: act("Cancel job") } }
    case "today":
      return { ...base, pills: [{ status: "scheduled" }], when: day("Today, Wed Nov 18", "Between 8 and 10 am"), billing: waiting, totals: openTotals, notes: [ADDED("n1")], messages: [...scheduledMsgs, msg("m2", "2026-11-17T23:00:00Z", "sms", "day-before", "Trailhead: Ryan is coming tomorrow, between 8 and 10 am.")], footer: { primary: act("On my way"), secondary: [act("Mark done"), act("Send a text")], more: more("Move", "Edit", "Add a note"), destructive: act("Cancel job") } }
    case "late":
      return { ...base, pills: [{ status: "scheduled" }], pillNote: "day passed", notice: "This trip was Mon, Nov 16 and was never marked done. Mark done or Skip.", when: day("Mon, Nov 16", "Any time"), billing: waiting, totals: openTotals, notes: [ADDED("n1", "2026-11-10T16:10:00Z")], messages: scheduledMsgs, footer: { primary: act("Mark done"), secondary: [act("Skip"), act("Move")], more: more("Send a text", "Edit"), destructive: act("Cancel job") } }
    case "done-unpaid":
      return { ...base, pills: [{ status: "done" }, { status: "owed" }], when: day("Today, Wed Nov 18", "Done at 9:40 am"), billing: { summary: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD], rows: [], emptyLine: "No invoice or payment yet." }, totals: owedTotals, collect: { plan: collectPlan({ ...input, card: visa }), summary: "Repair · $145 unpaid" }, notes: [{ id: "n3", at: "2026-11-18T16:40:00Z", actor: "Ryan", what: "Marked done", kind: "event" }, ADDED("n1")], messages: scheduledMsgs, footer: { slot: true, secondary: [act("Send a text")], more: more("Undo done", "Edit") } }
    case "done-paid":
      return { ...base, pills: [{ status: "done" }, { status: "paid", label: "Paid, Venmo" }], when: day("Today, Wed Nov 18", "Done at 9:40 am"), billing: { summary: [["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"]], rows: [{ id: "p1", kind: "payment", title: "Venmo", detail: "Nov 18 · @andrea-d", amount: "$145" }] }, totals: [["Total", "$145", "strong"], ["Paid", "$145"], ["Unpaid", "$0"]], notes: [...PAID_NOTES, ADDED("n1")], messages: [...scheduledMsgs, msg("m3", "2026-11-18T17:51:00Z", "email", "receipt", "Receipt: $145 for your repair at 480 Briggs St")], footer: { more: more("Refund $145", "Send a text", "Undo done") } }
    case "invoice-sent":
      return { ...base, pills: [{ status: "done" }, { status: "bill-sent" }], when: day("Today, Wed Nov 18", "Done at 9:40 am"), billing: { summary: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"]], rows: [invoice("Nov 18", "Dec 2")], status: { text: "Invoice sent, due Dec 2" } }, totals: owedTotals, notes: [{ id: "n4", at: "2026-11-18T17:55:00Z", actor: "Ryan", what: "Sent invoice 1042, due Dec 2", kind: "event" }, ADDED("n1")], messages: [...scheduledMsgs, msg("m4", "2026-11-18T17:55:00Z", "sms", "invoice", "Trailhead: invoice for your repair, $145, due Dec 2.")], footer: { primary: act("Remind"), secondary: [act("Record the payment")], more: more("Send a text", "Undo done") } }
    case "past-due":
      return { ...base, pills: [{ status: "done" }, { status: "overdue" }], when: day("Tue, Nov 3", "Done at 11:20 am"), billing: { summary: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"]], rows: [{ ...invoice("Nov 3", "Nov 17"), id: "i2" }], status: { text: "Past due since Nov 17", tone: "past-due" } }, totals: owedTotals, notes: [{ id: "n5", at: "2026-11-10T17:00:00Z", actor: "Ryan", what: "Reminded Andrea about invoice 1042", kind: "event" }, ADDED("n1", "2026-11-02T16:10:00Z")], messages: [msg("m5", "2026-11-10T17:00:00Z", "sms", "invoice-reminder", "Trailhead: a reminder that invoice 1042, $145, is due Nov 17."), msg("m4", "2026-11-03T20:00:00Z", "sms", "invoice", "Trailhead: invoice for your repair, $145, due Nov 17.")], footer: { primary: act("Remind"), secondary: [act("Record the payment")], more: more("Send a text") } }
    case "canceled":
      return { ...base, pills: [{ status: "cancelled" }], notice: "Canceled Nov 17. Nothing is owed.", when: [["Day", "None"], ["Who", "No one"]], billing: { summary: [], rows: [], emptyLine: "Nothing was billed." }, lines: [{ ...LINE[0], canceled: true }], totals: [], notes: [{ id: "n6", at: "2026-11-17T20:00:00Z", actor: "Ryan", what: "Canceled the job", kind: "event" }, ADDED("n1", "2026-11-12T16:10:00Z")], messages: [msg("m6", "2026-11-17T20:00:00Z", "email", "visit-cancelled", "Your repair on Tue, Nov 24 is canceled")], footer: {} }
  }
}

export const STATE_NOTES: Record<JobState, string> = {
  unscheduled: "Ryan sees a repair with no day. The one primary action is Schedule.",
  scheduled: "Ryan sees the day, who and Any time. The one primary action is Move; Mark done is one tap beside it.",
  today: "Ryan sees today with the window the customer was told. The one primary action is On my way, then Mark done.",
  late: "Ryan sees a trip whose day passed with no Mark done. The one primary action is Mark done, with Skip beside it.",
  "done-unpaid": "Ryan sees How is this paid? right on the page, card selected. The one primary action is Charge $145, in the footer.",
  "done-paid": "Ryan sees Billing read Paid, Venmo. There is no primary action; the quiet ones are under More.",
  "invoice-sent": "Ryan sees the invoice as a Billing row, Invoice sent, due Dec 2. The one primary action is Remind.",
  "past-due": "Ryan sees Past due since Nov 17 in red on one row. The one primary action is Remind.",
  canceled: "Ryan sees a canceled job with nothing owed. There are no buttons.",
}
