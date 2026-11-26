import { repairChecklist, type ChecklistItem } from "@/components/blocks/Checklist"
import type { FooterAction } from "@/components/blocks/RecordFooter"
import type { LineItem, LineTotal } from "@/components/blocks/LineItemList"
import type { BillingRowData } from "@/components/blocks/BillingSection"
import type { InvoiceRowData, PaymentMethod, PaymentRowData } from "@/components/blocks/BillingTables"
import type { BillingLine } from "@/components/blocks/BillingBody"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { PillStatus } from "@/components/blocks/StatusPill"
import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { PhotoItem } from "@/lib/photos/types"
import { collectPlan, type CollectPlan } from "@/lib/money/collect"

// Design fixtures for the job object (docs/plans/2026-11-19-job-object-design.md): pure data in the shapes the screens take, nothing read
// from an API. "Today" is Wednesday, November 18, 2026. Andrea Dalton in Erie has a repair; the words are the ones of `words.ts`.

export const NOW = new Date("2026-11-18T18:00:00Z")
export const noop = () => undefined
export const noteOk = async () => ({ ok: true as const })

export type JobState = "unscheduled" | "scheduled" | "today" | "on-the-way" | "active" | "late" | "done-unpaid" | "done-paid" | "paid-check" | "paid-card" | "paid-deposit" | "refunded" | "part-refunded" | "invoice-sent" | "past-due" | "canceled"
export const JOB_STATES: readonly JobState[] = ["unscheduled", "scheduled", "today", "on-the-way", "active", "late", "done-unpaid", "done-paid", "paid-check", "paid-card", "paid-deposit", "refunded", "part-refunded", "invoice-sent", "past-due", "canceled"]

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

export interface PastVisit {
  id: string
  /** the job that visit belonged to: the service links to its page */
  jobId: string
  /** "Oct 14, 2026" */
  date: string
  service: string
  who: string
  /** the note left on that visit, a tech's or the office's */
  note?: string
}

/**
 * What Billing shows. `paidLine` is the headline in every state (green "Paid in full", gold "$145 unpaid. Invoice ... sent Nov 18, due Dec 2.",
 * red "Past due since Nov 17", grey "Refunded"); `summary` holds the Total, Paid, Unpaid (or Refunded) and Card on file the card draws only when
 * they add something (`billingFigures`); `payments` and `invoices` are the rows, and a payment with an `invoiceId` is merged into that invoice's
 * row. `emptyLine` only when there are none. `rows` and `status` are the older one-line rows the pass and return-trip pages still use.
 */
export interface BillingData {
  summary: [string, string][]
  rows: BillingRowData[]
  emptyLine?: string
  status?: { text: string; tone?: "past-due" }
  /** the one status line at the top of Billing, in every state: paid (green), unpaid (waiting grey), past due (red), refunded (grey). `{invoice}` in `text` is the invoice's chip. */
  paidLine?: BillingLine
  payments?: PaymentRowData[]
  invoices?: InvoiceRowData[]
}

export interface JobPageData {
  /** the customer's contact preference: how notices reach them (text unless set) */
  contact?: { channel: "text" | "email"; email: string }
  /** the customer's earlier visits at this property, newest first (three shown); `pastTotal` is how many there are in all */
  pastVisits: PastVisit[]
  pastTotal: number
  customer: string
  /** the customer's id: the Customer card's name and "See all" open that customer's own page */
  customerId: string
  phone: { text: string; href: string }
  subtitle: string
  pills: PillData[]
  /** muted words next to the pills: "day passed" */
  pillNote?: string
  /** the band's When cell, under the time: "Active since 9:12 am" */
  activeSince?: string
  notice?: string
  when: RecordFact[]
  where: RecordFact[]
  lines: LineItem[]
  totals: LineTotal[]
  billing: BillingData
  collect?: { plan: CollectPlan; summary: string }
  notes: TimelineLine[]
  messages: Message[]
  /** the crew's checklist for the service; none for a canceled job */
  checklist?: ChecklistItem[]
  /** the visit's photos: the customer's (at booking or later) and the crew's */
  photos: PhotoItem[]
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
const PAST: PastVisit[] = [
  { id: "pv1", jobId: "job-pv1", date: "Oct 14, 2026", service: "Fall blowout", who: "Ryan", note: "Blew out all 8 zones. Zone 5 head by the fence is cracked; replace next spring." },
  { id: "pv2", jobId: "job-pv2", date: "Apr 28, 2026", service: "Spring turn-on", who: "Ryan", note: "Backflow valve is behind the green box on the south side. Controller battery replaced." },
  { id: "pv3", jobId: "job-pv3", date: "Jul 9, 2025", service: "Repair", who: "Tech Two", note: "Replaced a broken rotor in zone 3. Customer asked for a quote on drip lines for the garden bed." },
]
const base: Omit<JobPageData, "when" | "pills" | "footer" | "billing" | "totals" | "notes" | "messages"> = { photos: [], pastVisits: PAST, pastTotal: 7, customer: "Andrea Dalton", customerId: "c-1", phone: PHONE, subtitle: "Sprinkler repair · Added Nov 18", where: WHERE, lines: LINE }
const owedTotals: LineTotal[] = [["Total", "$145", "strong"], ["Paid", "$0"], ["Unpaid", "$145", "alert"]]
const openTotals: LineTotal[] = [["Total", "$145", "strong"], ["Paid", "$0"]]
const waiting = { summary: [["Total", "$145"], CARD] as [string, string][], rows: [], emptyLine: "Nothing to bill until the trip is done." }
const day = (d: string, t: string): RecordFact[] => [["Day", d], ["Time", t], ["Who", WHO]]
const more = (...labels: string[]) => labels.map(act)
export const visa = { brand: "visa", last4: "4242" }
const input = { amount: 145, isPass: false, invoiceOpen: false, canInvoice: true, declined: false, charging: false }

const withRef = (ref?: string) => (ref ? (ref.startsWith("#") || ref.startsWith("@") ? ref : `#${ref}`) : "")
const methodLabel = (by: PaymentMethod, ref?: string) => (by === "card" ? "Visa ending 4242" : by === "check" ? `Check ${withRef(ref)}`.trim() : by === "venmo" ? `Venmo ${withRef(ref)}`.trim() : "Cash")
const asWords = (by: PaymentMethod, ref?: string) => (by === "card" ? "card, Visa ending 4242" : by === "check" ? `check ${withRef(ref)}`.trim() : by === "venmo" ? `Venmo ${withRef(ref)}`.trim() : "cash")

/** The one payment of a $145 job, in the Payments table's shape: a card payment also has its Stripe link. */
export const paymentRow = (by: PaymentMethod, ref?: string, id = "p1"): PaymentRowData => ({
  id, at: "2026-11-18T17:50:00Z", method: by, methodLabel: methodLabel(by, ref), amount: "$145", by: "Ryan", receiptHref: `/account/receipts/${id}`, canRefund: true,
  ...(by === "card" ? { stripeHref: "https://dashboard.stripe.com/payments/pi_3QxK1042" } : {}),
})

export const invoiceRow = (sent: string, due: string, status: InvoiceRowData["status"], statusLabel?: string): InvoiceRowData => ({ id: "i1", number: "INV-2026-0001", amount: "$145", sent, due, status, statusLabel, href: "/admin/invoices?invoice=inv-1", canRemind: status !== "paid" })

/** A job paid in full: the green headline, and the one payment (merged into its invoice's row when the payment settled an invoice). */
export function paidBilling(by: PaymentMethod, ref?: string, settledInvoice = false): BillingData {
  return {
    summary: [["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"], ...(by === "card" ? [CARD] : [])],
    rows: [],
    paidLine: { tone: "paid", title: "Paid in full" },
    payments: [{ ...paymentRow(by, ref), ...(settledInvoice ? { invoiceId: "i1" } : {}) }],
    ...(settledInvoice ? { invoices: [invoiceRow("Nov 18", "Dec 2", "paid")] } : {}),
  }
}

/**
 * Paid with a deposit: $50 came in by check on Nov 10 with no invoice (a payment of its own), then the final invoice credited it, was $95,
 * and was paid by card on Nov 18 (one row). The three figures show, because they say what the line and the rows do not.
 */
export function depositBilling(): BillingData {
  return {
    summary: [["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"], CARD],
    rows: [],
    paidLine: { tone: "paid", title: "Paid in full" },
    payments: [
      { ...paymentRow("card"), amount: "$95", invoiceId: "i1" },
      { ...paymentRow("check", "1031", "dp"), at: "2026-11-10T17:00:00Z", amount: "$50", reference: "Deposit · Ryan" },
    ],
    invoices: [{ ...invoiceRow("Nov 18", "Dec 2", "paid"), amount: "$95", note: "$145 less the $50 deposit" }],
  }
}

/** Some of it came back: $50 of the card payment refunded, $95 stays paid, and the job reads "Paid, $50 refunded" in green. */
export function partRefundedBilling(): BillingData {
  return {
    summary: [["Total", "$145"], ["Paid", "$95"], ["Refunded", "$50"], CARD],
    rows: [],
    paidLine: { tone: "paid", title: "Paid, $50 refunded" },
    payments: [
      paymentRow("card"),
      { id: "r2", at: "2026-11-19T15:00:00Z", method: "card", methodLabel: methodLabel("card"), amount: "-$50", by: "Ryan", refund: true, refundOf: "p1", receiptHref: "/account/receipts/r2" },
    ],
  }
}

/** A paid job that was refunded in full: the refund is its own negative row in grey under the payment, which stays; the job reads Refunded, never Unpaid. */
export function refundedBilling(by: PaymentMethod = "card", ref?: string): BillingData {
  return {
    summary: [["Total", "$145"], ["Paid", "$0"], ["Refunded", "$145"], CARD],
    rows: [],
    paidLine: { tone: "refunded", title: "Refunded" },
    payments: [
      { ...paymentRow(by, ref), canRefund: false },
      { id: "r1", at: "2026-11-19T15:00:00Z", method: by, methodLabel: methodLabel(by, ref), amount: "-$145", by: "Ryan", refund: true, refundOf: "p1", receiptHref: "/account/receipts/r1" },
    ],
  }
}

/** The history line of a payment, in the words of the payment itself. */
export const paymentNote = (by: PaymentMethod, ref?: string): TimelineLine => ({
  id: "n3", at: "2026-11-18T17:50:00Z", actor: "Ryan", kind: "event",
  what: by === "card" ? "Charged $145 to Visa ending 4242" : by === "check" ? `Recorded a $145 check${ref ? `, ${withRef(ref)}` : ""}` : by === "venmo" ? `Recorded a $145 Venmo payment${ref ? `, ${withRef(ref)}` : ""}` : "Recorded $145 in cash",
})
export const refundNote = (by: PaymentMethod, ref?: string): TimelineLine => ({ id: "n7", at: "2026-11-19T15:00:00Z", actor: "Ryan", kind: "event", what: by === "card" ? "Refunded $145 to the card" : `Refunded $145, ${asWords(by, ref)}` })
const MARKED_DONE: TimelineLine = { id: "n2d", at: "2026-11-18T16:40:00Z", actor: "Ryan", what: "Marked done", kind: "event" }

const CHECKLIST: Record<JobState, number | null> = { unscheduled: 0, scheduled: 0, today: 0, "on-the-way": 0, "active": 2, late: 0, "done-unpaid": 5, "done-paid": 5, "paid-check": 5, "paid-card": 5, "paid-deposit": 5, refunded: 5, "part-refunded": 5, "invoice-sent": 5, "past-due": 5, canceled: null }

const SKY = ["darkseagreen", "tan", "lightsteelblue", "rosybrown"]
const pic = (n: number) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${SKY[n % SKY.length]}"/><circle cx="200" cy="170" r="70" fill="white" fill-opacity="0.5"/><rect y="290" width="400" height="110" fill="black" fill-opacity="0.35"/></svg>`)}`
export const photo = (n: number, over: Partial<PhotoItem>): PhotoItem => ({ id: `ph${n}`, visitId: "v1", jobId: "job-1", customerId: "c-1", url: pic(n), contentType: "image/jpeg", bytes: 2_000_000, addedBy: "ryan@trailheadirrigation.com", addedByName: "Ryan Garner", byCustomer: false, shownToCustomer: false, canRemove: true, createdAt: "2026-11-18T17:00:00Z", ...over })
export const FROM_ANDREA = { addedBy: "customer", addedByName: null, byCustomer: true, shownToCustomer: true, canRemove: false }

/** Two photos from the customer on every job with a visit (one sent when she booked, one from the text's link), and the crew's own once the work has started. */
function photosOf(state: JobState): PhotoItem[] {
  if (state === "canceled") return []
  const theirs = [photo(1, { ...FROM_ANDREA, addedAtBooking: true, createdAt: "2026-11-12T16:08:00Z" }), photo(2, { ...FROM_ANDREA, createdAt: "2026-11-17T21:30:00Z" })]
  const started = !["unscheduled", "scheduled", "today", "late"].includes(state)
  return started ? [...theirs, photo(3, { shownToCustomer: true }), photo(4, {})] : theirs
}

export function jobPageOf(state: JobState): JobPageData {
  const n = CHECKLIST[state]
  return { ...withDelete(buildJob(state)), checklist: n === null ? undefined : repairChecklist(n), photos: photosOf(state) }
}

export const NO_DELETE = "A job with a payment or a sent message can't be deleted, only canceled."

/** Delete job is under More only while nothing has happened (no message sent, no payment, no invoice, no visit done); after that More says why it is not offered. */
function withDelete(job: JobPageData): JobPageData {
  if (!job.footer.more) return job
  const untouched = job.messages.length === 0 && job.pills.length === 1 && job.pills[0].status === "needs-a-day"
  const item: FooterAction = untouched ? { label: "Delete job", onClick: noop } : { label: NO_DELETE, disabled: true }
  return { ...job, footer: { ...job.footer, more: [...job.footer.more, item] } }
}

function buildJob(state: JobState): JobPageData {
  const scheduledMsgs = [msg("m1", "2026-11-18T16:30:00Z", "sms", "date-set", "Trailhead: your repair is Tue, Nov 24.")]
  switch (state) {
    case "unscheduled":
      return { ...base, pastVisits: [], pastTotal: 0, pills: [{ status: "needs-a-day" }], when: day("No day yet", "Any time").map((r) => (r[0] === "Who" ? ["Who", "No one yet"] : r)), billing: waiting, totals: openTotals, notes: [ADDED("n1")], messages: [], footer: { primary: act("Schedule"), secondary: [act("Mark done"), act("Send a message")], more: more("Edit", "Add a note"), destructive: act("Cancel job") } }
    case "scheduled":
      return { ...base, pills: [{ status: "scheduled" }], when: day("Tue, Nov 24", "Any time"), billing: waiting, totals: openTotals, notes: [ADDED("n1"), { id: "n2", at: "2026-11-18T16:30:00Z", actor: "Ryan", what: "Set the day to Tue, Nov 24", kind: "event" }], messages: scheduledMsgs, footer: { primary: act("Move"), secondary: [act("Mark done"), act("Send a message")], more: more("Edit", "Add a note"), destructive: act("Cancel job") } }
    case "on-the-way":
      return { ...buildJob("today"), pills: [{ status: "job-active" }], activeSince: "Active since 9:12 am", pillNote: "On my way sent 9:12 am", footer: { primary: act("Mark done"), secondary: [act("Send a message")], more: more("Move", "Edit", "Add a note"), destructive: act("Cancel job") } }
    case "active":
      return { ...buildJob("today"), pills: [{ status: "job-active" }], activeSince: "Active since 9:12 am", pillNote: "On my way sent 9:12 am", footer: { primary: act("Mark done"), secondary: [act("Send a message")], more: more("Move", "Edit", "Add a note"), destructive: act("Cancel job") } }
    case "today":
      return { ...base, pills: [{ status: "today" }], when: day("Today, Wed Nov 18", "9:00 am"), billing: waiting, totals: openTotals, notes: [ADDED("n1")], messages: [...scheduledMsgs, msg("m2", "2026-11-17T23:00:00Z", "sms", "day-before", "Trailhead: your repair is tomorrow, Wed, Nov 18 at 9:00 am.")], footer: { primary: act("On my way"), secondary: [act("Mark done"), act("Send a message")], more: more("Move", "Edit", "Add a note"), destructive: act("Cancel job") } }
    case "late":
      return { ...base, pills: [{ status: "scheduled" }], pillNote: "day passed", notice: "This trip was Mon, Nov 16 and was never marked done. Mark done or Skip.", when: day("Mon, Nov 16", "Any time"), billing: waiting, totals: openTotals, notes: [ADDED("n1", "2026-11-10T16:10:00Z")], messages: scheduledMsgs, footer: { primary: act("Mark done"), secondary: [act("Skip"), act("Move")], more: more("Send a message", "Edit"), destructive: act("Cancel job") } }
    case "done-unpaid":
      return { ...base, pills: [{ status: "done" }, { status: "owed" }], when: day("Today, Wed Nov 18", "Done at 9:40 am"), billing: { summary: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD], rows: [], paidLine: { tone: "unpaid", title: "$145 unpaid", text: "No invoice yet." } }, totals: owedTotals, collect: { plan: collectPlan({ ...input, card: visa }), summary: "Repair · $145 unpaid" }, notes: [{ id: "n3", at: "2026-11-18T16:40:00Z", actor: "Ryan", what: "Marked done", kind: "event" }, ADDED("n1")], messages: scheduledMsgs, footer: { primary: act("Collect payment"), secondary: [act("Send a message")], more: more("Undo done", "Edit") } }
    case "done-paid":
      return { ...base, pills: [{ status: "done" }, { status: "paid", label: "Paid, Venmo" }], when: day("Today, Wed Nov 18", "Done at 9:40 am"), billing: paidBilling("venmo", "@andrea-d"), totals: [["Total", "$145", "strong"], ["Paid", "$145"], ["Unpaid", "$0"]], notes: [paymentNote("venmo", "@andrea-d"), MARKED_DONE, ADDED("n1")], messages: [...scheduledMsgs, msg("m3", "2026-11-18T17:51:00Z", "email", "receipt", "Receipt: $145 for your repair at 480 Briggs St")], footer: { more: more("Refund $145", "Send a message", "Undo done") } }
    case "paid-check":
      return { ...buildJob("done-paid"), pills: [{ status: "done" }, { status: "paid", label: "Paid, Check" }], billing: paidBilling("check", "#1042"), notes: [paymentNote("check", "#1042"), MARKED_DONE, ADDED("n1")] }
    case "paid-card":
      return { ...buildJob("done-paid"), pills: [{ status: "done" }, { status: "paid", label: "Paid, Card" }], billing: paidBilling("card", undefined, true), notes: [paymentNote("card"), MARKED_DONE, ADDED("n1")] }
    case "paid-deposit":
      return { ...buildJob("paid-card"), billing: depositBilling(), footer: { more: more("Send a message", "Undo done") }, notes: [paymentNote("card"), { id: "n9", at: "2026-11-10T17:00:00Z", actor: "Ryan", what: "Recorded a $50 check, #1031, as the deposit", kind: "event" }, MARKED_DONE, ADDED("n1")] }
    case "refunded":
      return { ...buildJob("done-unpaid"), pills: [{ status: "done" }, { status: "refunded" }], footer: { secondary: [act("Send a message")], more: more("Collect payment", "Undo done", "Edit") }, billing: refundedBilling(), collect: { plan: collectPlan({ ...input, card: visa }), summary: "Repair · $145" }, notes: [refundNote("card"), paymentNote("card"), MARKED_DONE, ADDED("n1")] }
    case "part-refunded":
      return { ...buildJob("paid-card"), pills: [{ status: "done" }, { status: "paid", label: "Paid, $50 refunded" }], billing: partRefundedBilling(), notes: [{ id: "n8", at: "2026-11-19T15:00:00Z", actor: "Ryan", what: "Refunded $50 to the card", kind: "event" }, paymentNote("card"), MARKED_DONE, ADDED("n1")] }
    case "invoice-sent":
      return { ...base, pills: [{ status: "done" }, { status: "bill-sent" }], when: day("Today, Wed Nov 18", "Done at 9:40 am"), billing: { summary: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD], rows: [], paidLine: { tone: "unpaid", title: "$145 unpaid", text: "Invoice {invoice} sent Nov 18, due Dec 2.", invoice: { name: "INV-2026-0001", href: "/admin/invoices?invoice=inv-1" } }, invoices: [{ ...invoiceRow("Nov 18", "Dec 2", "bill-sent"), note: "Includes the visit report" }] }, collect: { plan: collectPlan({ ...input, card: visa, canInvoice: false }), summary: "Repair · $145 unpaid" }, totals: owedTotals, notes: [{ id: "n4", at: "2026-11-18T17:55:00Z", actor: "Ryan", what: "Sent invoice INV-2026-0001, due Dec 2", kind: "event" }, ADDED("n1")], messages: [...scheduledMsgs, msg("m4", "2026-11-18T17:55:00Z", "sms", "invoice", "Trailhead: invoice for your repair, $145, due Dec 2.")], footer: { primary: act("Send a payment reminder"), secondary: [act("Collect payment")], more: more("Send a message", "Undo done") } }
    case "past-due":
      return { ...base, pills: [{ status: "done" }, { status: "overdue" }], when: day("Tue, Nov 3", "Done at 11:20 am"), billing: { summary: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD], rows: [], status: { text: "Past due since Nov 17", tone: "past-due" }, paidLine: { tone: "pastdue", title: "Past due since Nov 17", text: "$145 unpaid. Invoice {invoice} sent Nov 3.", invoice: { name: "INV-2026-0001", href: "/admin/invoices?invoice=inv-1" } }, invoices: [invoiceRow("Nov 3", "Nov 17", "overdue")] }, collect: { plan: collectPlan({ ...input, card: visa, canInvoice: false }), summary: "Repair · $145 unpaid" }, totals: owedTotals, notes: [{ id: "n5", at: "2026-11-10T17:00:00Z", actor: "Ryan", what: "Reminded Andrea about invoice INV-2026-0001", kind: "event" }, ADDED("n1", "2026-11-02T16:10:00Z")], messages: [msg("m5", "2026-11-10T17:00:00Z", "sms", "invoice-reminder", "Trailhead: a reminder that invoice 1042, $145, is due Nov 17."), msg("m4", "2026-11-03T20:00:00Z", "sms", "invoice", "Trailhead: invoice for your repair, $145, due Nov 17.")], footer: { primary: act("Send a payment reminder"), secondary: [act("Collect payment")], more: more("Send a message") } }
    case "canceled":
      return { ...base, pills: [{ status: "cancelled" }], notice: "Canceled Nov 17. Nothing is owed.", when: [["Day", "None"], ["Who", "No one"]], billing: { summary: [], rows: [], emptyLine: "Nothing was billed." }, lines: [{ ...LINE[0], canceled: true }], totals: [], notes: [{ id: "n6", at: "2026-11-17T20:00:00Z", actor: "Ryan", what: "Canceled the job", kind: "event" }, ADDED("n1", "2026-11-12T16:10:00Z")], messages: [msg("m6", "2026-11-17T20:00:00Z", "email", "visit-cancelled", "Your repair on Tue, Nov 24 is canceled")], footer: {} }
  }
}

export const STATE_NOTES: Record<JobState, string> = {
  unscheduled: "Ryan sees a repair with no day. The one primary action is Schedule.",
  scheduled: "Ryan sees the day, who and Any time. The one primary action is Move; Mark done is one tap beside it.",
  today: "Ryan sees today with the time the customer was told. The one primary action is On my way: it opens its confirmation (Text Andrea that Ryan is on the way to 480 Briggs St.) and on Send the job becomes Active and Mark done takes over. More has Start without texting for a customer with no mobile.",
  "on-the-way": "Ryan pressed On my way and sent the text, so the job is Active since 9:12 am, in the band under the time. The one primary action is Mark done, which leads to How is this paid?.",
  "active": "Ryan sees Active since 9:12 am and the checklist half done. The one primary action is Mark done.",
  late: "Ryan sees a trip whose day passed with no Mark done. The one primary action is Mark done, with Skip beside it.",
  "done-unpaid": "Right after Mark done, How is this paid? opens as its own dialog (Not now leaves the job Done and unpaid). Here Ryan sees Billing say $145 unpaid. No invoice yet. (no figures, because nothing has been paid) with the card on file, and the header's one primary is Collect payment, which opens the same How is this paid? dialog: the card on file first and preselected.",
  "done-paid": "Ryan sees Billing read Paid in full in green (Venmo has no invoice, so its one payment is the Payments table's one row). No figures and no card: nothing needs explaining. There is no primary action; the quiet ones are under More.",
  "paid-check": "Paid by check: the green headline Paid in full and one Payments row (a check has no invoice) with View receipt and, under its More menu, Refund. The check number is the row's quiet line.",
  "paid-card": "Paid by card: the invoice and its payment are one row of Invoices and payments (\"Paid by Visa ending 4242 on Nov 18 · Ryan\") with View receipt, Open in Stripe and Open invoice as icons; Refund is under More. The headline says Paid in full and nothing repeats the $145.",
  "paid-deposit": "Paid with a deposit: the $50 deposit is a payment with no invoice (in Payments), the final invoice credits it and is one row with the card payment that settled it. Total, Paid and Unpaid show because two payments need explaining.",
  refunded: "Refunded: a grey Refunded headline, the card payment, and the refund as its own negative grey row under it (never a delete). The job reads Refunded, never Unpaid; the header has no Collect payment primary and Collect payment is under More.",
  "part-refunded": "A partial refund: the job reads \"Paid, $50 refunded\" in green, Total, Paid and Refunded show because they add to the headline, and a negative grey $50 row sits under the card payment.",
  "invoice-sent": "Ryan sees \"$145 unpaid. Invoice INV-2026-0001 sent Nov 18, due Dec 2.\", the card on file, and the invoice as one row of Invoices and payments, Invoice sent, with Remind and Open invoice beside it. The one primary action is Send a payment reminder; Collect payment sits beside it.",
  "past-due": "Ryan sees Past due since Nov 17 in red on one row. The one primary action is Send a payment reminder, which shows the exact text first.",
  canceled: "Ryan sees a canceled job with nothing owed. There are no buttons.",
}
