import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Message, Pass } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { PhotoItem } from "@/lib/photos/types"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { PillStatus } from "@/components/blocks/StatusPill"
import type { PillData } from "./job-fixtures"

// Design fixtures for the customer page (docs/plans/2026-11-19-admin-page-layout-research.md): pure data in the shapes the page takes.
// "Today" is Wednesday, November 18, 2026. Four customers: a pass holder with an open repair and an unpaid invoice, a two-season pass holder
// (the chain: 2027 renewed from 2026), a one-off customer paid in full, and one with nothing yet. Every record named here carries an id the
// page turns into a RecordChip link; a fact with nothing behind it ("Nothing unpaid", "No card") carries no link.

export type CustomerState = "pass-holder" | "two-seasons" | "one-off" | "nothing-yet"
export const CUSTOMER_STATES: readonly CustomerState[] = ["pass-holder", "two-seasons", "one-off", "nothing-yet"]

export interface MoneyWord {
  /** the word, from `words.ts`: "Paid, card", "$145 unpaid", "Invoice sent", "Past due" */
  word: string
  tone?: "past-due" | "failed" | "plain"
  /** the quiet second line: "due Dec 2", "Charged after each visit" */
  note?: string
}

export interface CustomerJobRow {
  id: string
  name: string
  /** open jobs sort above closed ones */
  open: boolean
  /** newest first within open and closed: the day of its next or last visit, ISO */
  sortDay: string
  day?: { iso: string; label: string; time: string; stops: number }
  who?: string
  status: PillStatus
  statusLabel: string
  /** what has happened so far; null when nothing is due yet */
  money: MoneyWord | null
  /** a quiet line under the money word, or under the dash when nothing is due: "Charged after each visit" */
  note?: string
}

export interface CustomerInvoiceRow {
  id: string
  /** "INV-2026-0042" */
  number: string
  jobId: string
  jobName: string
  amount: string
  sent: string
  due: string
  status: PillStatus
  statusLabel: string
  sortDay: string
}

export interface CustomerPaymentRow {
  id: string
  /** the receipt's number: "R-1031" */
  receipt: string
  date: string
  sortDay: string
  jobId: string
  jobName: string
  /** "Card", "Check 2210", "Venmo @andrea-d" */
  how: string
  amount: string
  /** a card payment opens in Stripe */
  stripeUrl?: string
}

export interface SeasonLink {
  season: number
  number: string
  jobId: string
}

export interface EarlierSeason extends SeasonLink {
  state: string
  renewedAs?: SeasonLink
}

export type PassArea =
  | { kind: "pass"; jobId: string; /** from November 1 the block and More offer Reserve next season */ reserveNext?: boolean; pass: Pass; facts: RecordFact[]; card: string; renewedFrom?: SeasonLink; renewedAs?: SeasonLink; earlier: EarlierSeason[] }
  | { kind: "sell"; label: "Get a Season Pass" | "Reserve next season"; line: string; earlier: EarlierSeason[] }

export interface BandCell {
  value: string
  sub: string
  alert?: boolean
  /** the job, invoice or pass the tile opens; none for a tile with nothing behind it */
  jobId?: string
  invoiceId?: string
}

export interface CustomerBillingData {
  /** "Paid in full", "$145 unpaid", "Nothing billed yet" */
  line: string
  tone: "past-due" | "failed" | "plain"
  total: string
  paid: string
  unpaid: string
  card?: { brand: string; last4: string; expires: string; stripeUrl: string }
  payments: CustomerPaymentRow[]
  invoices: CustomerInvoiceRow[]
}

export interface CustomerPageData {
  id: string
  name: string
  firstName: string
  /** how the customer wants to hear from us: every customer-facing confirmation names this channel and its address */
  contact: { channel: "text" | "email"; phone: { text: string; href: string }; email: string }
  address: [string, string]
  subtitle: string
  pills: PillData[]
  band: { next: BandCell; unpaid: BandCell; pass: BandCell; card: BandCell }
  /** the amount of the open invoice or unpaid job, when something is unpaid ("$145") */
  unpaid?: string
  openInvoice?: { id: string; number: string; amount: string; jobName: string; due: string }
  /** nothing has ever happened for this customer: Delete is offered */
  untouched?: boolean
  jobs: CustomerJobRow[]
  billing: CustomerBillingData
  messages: Message[]
  photos: PhotoItem[]
  notes: TimelineLine[]
  property: RecordFact[]
  consent: string
  area: PassArea
}

const PHONE = { text: "(970) 555-0123", href: "tel:+19705550123" }
const PROPERTY: RecordFact[] = [["Zones", "8"], ["Controller", "Rachio 3, garage"], ["Backflow", "Front yard, green box"], ["Gate code", "4417"], ["Must be home", "No"], ["Access note", "Side gate by the garage, dog is friendly."]]
const msg = (id: string, at: string, channel: "email" | "sms", kind: Message["kind"], body: string, status: Message["status"] = "delivered"): Message => ({ id, clientId: "c-1", channel, kind, body, at, status })
const event = (id: string, at: string, what: string): TimelineLine => ({ id, at, actor: "Ryan", what, kind: "event" })
const passRow = (over: Partial<Pass>): Pass => ({ ...(snapshot.passes as Pass[])[0], ...over })
const passFacts = (zones: string, status: string, money: string): RecordFact[] => [["Zones", zones], ["Status", status], ["Money", money]]
const photo = (id: string, by: string, mine: boolean, at: string): PhotoItem => ({ id, visitId: "v1", jobId: "j1", customerId: "c1", url: "/images/sprinkler-spray-head-lawn.jpg", contentType: "image/jpeg", bytes: 180000, addedBy: by, addedByName: by === "customer" ? null : "Ryan", byCustomer: mine, shownToCustomer: true, canRemove: false, createdAt: at })

const RYAN = "Ryan Garner"
const day = (iso: string, label: string, time: string, stops = 3) => ({ iso, label, time, stops })
const EMPTY_BILLING: CustomerBillingData = { line: "Nothing billed yet", tone: "plain", total: "$0", paid: "$0", unpaid: "$0", payments: [], invoices: [] }

const base = (over: Partial<CustomerPageData>): CustomerPageData => ({
  id: "c1",
  name: "Andrea Dalton",
  firstName: "Andrea",
  contact: { channel: "text", phone: PHONE, email: "andrea.dalton@example.com" },
  address: ["480 Briggs St", "Erie, CO"],
  subtitle: "Customer since Apr 2026 · 480 Briggs St, Erie",
  pills: [],
  band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "No card", sub: "Add one when you collect" } },
  jobs: [],
  billing: EMPTY_BILLING,
  messages: [],
  photos: [],
  notes: [],
  property: PROPERTY,
  consent: "Texts and email, agreed Apr 14, 2026 on the website",
  area: { kind: "sell", label: "Get a Season Pass", line: "Reserve the spring turn-on and the fall blowout at today's per-zone prices, with the days picked now.", earlier: [] },
  ...over,
})

const VISA = (last4: string, expires: string) => ({ brand: "Visa", last4, expires, stripeUrl: "https://dashboard.stripe.com/customers/cus_demo" })

export function customerPageOf(state: CustomerState): CustomerPageData {
  switch (state) {
    case "pass-holder":
      return base({
        pills: [{ status: "active", label: "Season Pass 2027" }, { status: "owed", label: "Unpaid $145" }],
        band: {
          next: { value: "Thu, Nov 19", sub: "2:30 pm, Ryan", jobId: "j1" },
          unpaid: { value: "$145", sub: "Invoice sent, due Dec 2", invoiceId: "i1" },
          pass: { value: "Season Pass 2027", sub: "TH-2027-0008, active", jobId: "p2027" },
          card: { value: "Visa 4242", sub: "Expires 08/28" },
        },
        unpaid: "$145",
        openInvoice: { id: "i1", number: "INV-2026-0042", amount: "$145", jobName: "Sprinkler repair", due: "Dec 2" },
        jobs: [
          { id: "p2027", name: "Season Pass 2027", open: true, sortDay: "2027-05-03", day: day("2027-05-03", "May 3, 2027", "Any time", 2), who: RYAN, status: "scheduled", statusLabel: "Scheduled", money: null, note: "Charged after each visit" },
          { id: "j1", name: "Sprinkler repair", open: true, sortDay: "2026-11-19", day: day("2026-11-19", "Nov 19, 2026", "2:30 pm"), who: RYAN, status: "scheduled", statusLabel: "Scheduled", money: null },
          { id: "j3", name: "Sprinkler repair", open: false, sortDay: "2026-11-12", day: day("2026-11-12", "Nov 12, 2026", "9:00 am"), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Invoice sent", note: "due Dec 2" } },
          { id: "j2", name: "Fall blowout", open: false, sortDay: "2026-10-12", day: day("2026-10-12", "Oct 12, 2026", "Any time", 4), who: "Hannah Garner", status: "done", statusLabel: "Done", money: { word: "Paid, Venmo" } },
          { id: "j0", name: "Spring turn-on", open: false, sortDay: "2026-04-14", day: day("2026-04-14", "Apr 14, 2026", "Any time", 5), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, card" } },
        ],
        billing: {
          line: "$145 unpaid",
          tone: "plain",
          total: "$405",
          paid: "$260",
          unpaid: "$145",
          card: VISA("4242", "08/28"),
          invoices: [
            { id: "i1", number: "INV-2026-0042", jobId: "j3", jobName: "Sprinkler repair", amount: "$145", sent: "Nov 12", due: "Dec 2", status: "bill-sent", statusLabel: "Invoice sent", sortDay: "2026-11-12" },
            { id: "i0", number: "INV-2026-0031", jobId: "j0", jobName: "Spring turn-on", amount: "$145", sent: "Apr 14", due: "Apr 28", status: "paid", statusLabel: "Paid", sortDay: "2026-04-14" },
          ],
          payments: [
            { id: "p-venmo", receipt: "R-1058", date: "Oct 12", sortDay: "2026-10-12", jobId: "j2", jobName: "Fall blowout", how: "Venmo @andrea-d", amount: "$115" },
            { id: "p-card", receipt: "R-1031", date: "Apr 20", sortDay: "2026-04-20", jobId: "j0", jobName: "Spring turn-on", how: "Card", amount: "$145", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo" },
          ],
        },
        messages: [
          msg("m1", "2026-11-12T21:42:00Z", "email", "invoice", "Invoice INV-2026-0042: $145 for your repair at 480 Briggs St", "sent"),
          msg("m2", "2026-11-12T21:41:00Z", "sms", "date-set", "Trailhead: Ryan is coming Thu, Nov 19. We'll text your window the day before."),
          msg("m3", "2026-11-02T15:11:00Z", "email", "purchase-confirmation", "Your Season Pass is reserved: TH-2027-0008"),
        ],
        photos: [photo("ph1", "customer", true, "2026-11-12T20:00:00Z"), photo("ph2", "customer", true, "2026-11-12T20:01:00Z")],
        notes: [event("n1", "2026-11-12T21:40:00Z", "Sent Invoice INV-2026-0042, $145, due Dec 2"), event("n2", "2026-11-02T15:10:00Z", "Sold the Season Pass online, TH-2027-0008")],
        area: { kind: "pass", jobId: "p2027", pass: passRow({ season: 2027, number: "TH-2027-0008" }), facts: passFacts("8", "Active", "$0 of $260 paid"), card: "Visa ending 4242", earlier: [] },
      })
    case "two-seasons":
      return base({
        id: "c2",
        name: "Dale Whitaker",
        firstName: "Dale",
        contact: { channel: "email", phone: PHONE, email: "dale.whitaker@example.com" },
        address: ["212 Main St", "Lafayette, CO"],
        subtitle: "Customer since Mar 2026 · 212 Main St, Lafayette",
        pills: [{ status: "active", label: "Season Pass 2027" }],
        band: {
          next: { value: "Mon, May 3", sub: "Any time, Ryan", jobId: "p2027" },
          unpaid: { value: "$0", sub: "Nothing unpaid" },
          pass: { value: "Season Pass 2027", sub: "TH-2027-0011, renewed", jobId: "p2027" },
          card: { value: "Visa 1881", sub: "Expires 02/29" },
        },
        jobs: [
          { id: "p2027", name: "Season Pass 2027", open: true, sortDay: "2027-05-03", day: day("2027-05-03", "May 3, 2027", "Any time", 2), who: RYAN, status: "scheduled", statusLabel: "Scheduled", money: null, note: "Charged after each visit" },
          { id: "p2026", name: "Season Pass 2026", open: false, sortDay: "2026-10-14", day: day("2026-10-14", "Oct 14, 2026", "Any time", 4), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, card" } },
        ],
        billing: {
          line: "Paid in full",
          tone: "plain",
          total: "$210",
          paid: "$210",
          unpaid: "$0",
          card: VISA("1881", "02/29"),
          invoices: [],
          payments: [
            { id: "p-b", receipt: "R-1060", date: "Oct 14", sortDay: "2026-10-14", jobId: "p2026", jobName: "Season Pass 2026", how: "Card", amount: "$115", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo2" },
            { id: "p-a", receipt: "R-1012", date: "Apr 14", sortDay: "2026-04-14", jobId: "p2026", jobName: "Season Pass 2026", how: "Card", amount: "$95", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo3" },
          ],
        },
        messages: [msg("m1", "2026-11-03T15:11:00Z", "email", "purchase-confirmation", "Your Season Pass is reserved: TH-2027-0011")],
        notes: [event("n1", "2026-11-03T15:10:00Z", "Renewed Season Pass 2026 as TH-2027-0011"), event("n0", "2026-03-02T15:10:00Z", "Sold the Season Pass online, TH-2026-0003")],
        area: {
          kind: "pass",
          jobId: "p2027",
          pass: passRow({ season: 2027, number: "TH-2027-0011", firstName: "Dale", lastName: "Whitaker" }),
          facts: passFacts("6", "Active", "$0 of $210 paid"),
          card: "Visa ending 1881",
          renewedFrom: { season: 2026, number: "TH-2026-0003", jobId: "p2026" },
          earlier: [{ season: 2026, number: "TH-2026-0003", jobId: "p2026", state: "Done", renewedAs: { season: 2027, number: "TH-2027-0011", jobId: "p2027" } }],
        },
      })
    case "one-off":
      return base({
        id: "c3",
        name: "Marcus Webb",
        firstName: "Marcus",
        contact: { channel: "text", phone: PHONE, email: "marcus.webb@example.com" },
        address: ["35 Cherry Ln", "Longmont, CO"],
        subtitle: "Customer since Jun 2026 · 35 Cherry Ln, Longmont",
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "Visa 7713", sub: "Expires 05/28" } },
        jobs: [{ id: "j1", name: "Sprinkler repair", open: false, sortDay: "2026-06-09", day: day("2026-06-09", "Jun 9, 2026", "1:00 pm", 4), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, card" } }],
        billing: {
          line: "Paid in full",
          tone: "plain",
          total: "$145",
          paid: "$145",
          unpaid: "$0",
          card: VISA("7713", "05/28"),
          invoices: [{ id: "i1", number: "INV-2026-0007", jobId: "j1", jobName: "Sprinkler repair", amount: "$145", sent: "Jun 9", due: "Jun 23", status: "paid", statusLabel: "Paid", sortDay: "2026-06-09" }],
          payments: [{ id: "p1", receipt: "R-1007", date: "Jun 9", sortDay: "2026-06-09", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "$145", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo4" }],
        },
        messages: [msg("m1", "2026-06-09T22:00:00Z", "sms", "receipt", "Trailhead: receipt for $145, your repair at 35 Cherry Ln.")],
        notes: [event("n1", "2026-06-09T21:50:00Z", "Marked the repair done")],
      })
    case "nothing-yet":
      return base({
        id: "c4",
        name: "Priya Nair",
        firstName: "Priya",
        contact: { channel: "text", phone: PHONE, email: "priya.nair@example.com" },
        address: ["77 Aspen Way", "Firestone, CO"],
        subtitle: "Added today · 77 Aspen Way, Firestone",
        property: [["Zones", "Not set"], ["Controller", "Not set"], ["Gate code", "None"], ["Must be home", "Not set"]],
        notes: [event("n0", "2026-11-18T15:00:00Z", "Added Priya Nair as a customer")],
        consent: "Not asked yet",
        untouched: true,
      })
  }
}

export const STATE_NOTES: Record<CustomerState, string> = {
  "pass-holder": "Ryan sees a Season Pass holder with a repair on Thursday and an unpaid invoice. The one primary action is New job; Collect payment sits beside Send a message, Unpaid $145 is a badge beside the name and every tile in the band opens what it summarises.",
  "two-seasons": "Ryan sees the 2027 pass renewed from 2026: the Season Pass card links back to the 2026 pass, the folded earlier season links forward to the 2027 one, and the Jobs table lists both.",
  "one-off": "Ryan sees a customer who has had one repair and paid in full: Billing says Paid in full, the card and the one payment with its receipt and Stripe link. The aside offers Get a Season Pass.",
  "nothing-yet": "Ryan sees a customer with no work yet. Every empty card invites the first job, a tile with nothing behind it is not a link, and Delete is offered under More because nothing has happened.",
}
