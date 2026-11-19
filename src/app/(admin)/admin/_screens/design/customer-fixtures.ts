import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Message, Pass } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { PillData } from "./job-fixtures"

// Design fixtures for the customer page (docs/plans/2026-11-19-admin-page-layout-research.md): pure data in the shapes the page takes.
// "Today" is Wednesday, November 18, 2026. Six customers: a pass holder with an open job and an unpaid invoice, a two-season pass holder
// (the chain: 2027 renewed from 2026), a one-off customer, one whose pass ended, one with nothing yet, one whose card is expiring.

export type CustomerState = "pass-holder" | "two-seasons" | "one-off" | "reserve-next" | "nothing-yet" | "card-expiring"
export const CUSTOMER_STATES: readonly CustomerState[] = ["pass-holder", "two-seasons", "one-off", "reserve-next", "nothing-yet", "card-expiring"]

export interface CustomerJobRow {
  id: string
  title: string
  day: string
  status: "scheduled" | "done" | "needs-a-day" | "cancelled"
  /** the job's money word, empty while nothing is due */
  billing: string
  billingState: "owed" | "bill-sent" | "overdue" | "paid" | null
}

export interface CustomerInvoiceRow {
  id: string
  number: string
  due: string
  status: "bill-sent" | "overdue" | "paid"
  total: string
  balance: string
}

export interface SeasonLink {
  season: number
  number: string
}

export interface EarlierSeason extends SeasonLink {
  /** "Done", "Expired" */
  state: string
  renewedAs?: string
}

export type PassArea =
  | { kind: "pass"; pass: Pass; facts: RecordFact[]; card: string; renewedFrom?: SeasonLink; earlier: EarlierSeason[] }
  | { kind: "sell"; label: "Get a Season Pass" | "Reserve next season"; line: string; earlier: EarlierSeason[] }

export interface BandCell {
  value: string
  sub: string
  alert?: boolean
}

export interface CustomerPageData {
  name: string
  firstName: string
  phone: { text: string; href: string }
  email: string
  address: [string, string]
  subtitle: string
  pills: PillData[]
  band: { next: BandCell; unpaid: BandCell; pass: BandCell; card: BandCell }
  /** "$145" when something is unpaid; charging the card and sending an invoice read it */
  unpaid?: string
  cardLast4?: string
  jobs: CustomerJobRow[]
  invoices: CustomerInvoiceRow[]
  messages: Message[]
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

const REPAIR: CustomerJobRow = { id: "j1", title: "Sprinkler repair", day: "Thu, Nov 19 · 2:30 pm", status: "scheduled", billing: "", billingState: null }
const FALL: CustomerJobRow = { id: "j2", title: "Fall blowout", day: "Oct 12", status: "done", billing: "Paid, Venmo", billingState: "paid" }
const REPAIR_OLD: CustomerJobRow = { id: "j3", title: "Sprinkler repair", day: "Nov 12", status: "done", billing: "Invoice sent, due Dec 2", billingState: "bill-sent" }
const PASS_JOB = (season: number, number: string, day: string, status: CustomerJobRow["status"], billing: string): CustomerJobRow => ({ id: `p${season}`, title: `Season Pass ${season}, ${number}`, day, status, billing, billingState: billing.startsWith("Paid") ? "paid" : null })
const INV_OPEN: CustomerInvoiceRow = { id: "i1", number: "Invoice 1042", due: "Dec 2", status: "bill-sent", total: "$145", balance: "$145" }
const INV_PAID: CustomerInvoiceRow = { id: "i0", number: "Invoice 1031", due: "Apr 28", status: "paid", total: "$145", balance: "$0" }

const nobodyNotes = [event("n0", "2026-11-18T15:00:00Z", "Added Priya Nair as a customer")]

const base = (over: Partial<CustomerPageData>): CustomerPageData => ({
  name: "Andrea Dalton",
  firstName: "Andrea",
  phone: PHONE,
  email: "andrea.dalton@example.com",
  address: ["480 Briggs St", "Erie, CO"],
  subtitle: "Customer since Apr 2026 · 480 Briggs St, Erie",
  pills: [],
  band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "Visa 4242", sub: "Expires 08/28" } },
  cardLast4: "4242",
  jobs: [],
  invoices: [],
  messages: [],
  notes: [],
  property: PROPERTY,
  consent: "Texts and email, agreed Apr 14, 2026 on the website",
  area: { kind: "sell", label: "Get a Season Pass", line: "Reserve the spring turn-on and the fall blowout at today's per-zone prices, with the days picked now.", earlier: [] },
  ...over,
})

export function customerPageOf(state: CustomerState): CustomerPageData {
  switch (state) {
    case "pass-holder":
      return base({
        pills: [{ status: "active", label: "Season Pass 2027" }, { status: "owed", label: "Unpaid $145" }],
        band: { next: { value: "Thu, Nov 19", sub: "2:30 pm, Ryan" }, unpaid: { value: "$145", sub: "Invoice sent, due Dec 2" }, pass: { value: "2027", sub: "Active" }, card: { value: "Visa 4242", sub: "Expires 08/28" } },
        unpaid: "$145",
        jobs: [REPAIR, PASS_JOB(2027, "TH-2027-0008", "May 3, 2027", "scheduled", "Charged after each visit"), REPAIR_OLD, FALL],
        invoices: [INV_OPEN, INV_PAID],
        messages: [
          msg("m1", "2026-11-12T21:42:00Z", "email", "invoice", "Invoice 1042: $145 for your repair at 480 Briggs St", "sent"),
          msg("m2", "2026-11-12T21:41:00Z", "sms", "date-set", "Trailhead: Ryan is coming Thu, Nov 19. We'll text your window the day before."),
          msg("m3", "2026-11-02T15:11:00Z", "email", "purchase-confirmation", "Your Season Pass is reserved: TH-2027-0008"),
        ],
        notes: [event("n1", "2026-11-12T21:40:00Z", "Sent Invoice 1042, $145, due Dec 2"), event("n2", "2026-11-02T15:10:00Z", "Sold the Season Pass online, TH-2027-0008")],
        area: { kind: "pass", pass: passRow({ season: 2027, number: "TH-2027-0008" }), facts: passFacts("8", "Active", "$0 of $260 paid"), card: "Visa ending 4242", earlier: [] },
      })
    case "two-seasons":
      return base({
        name: "Dale Whitaker",
        firstName: "Dale",
        email: "dale.whitaker@example.com",
        address: ["212 Main St", "Lafayette, CO"],
        subtitle: "Customer since Mar 2026 · 212 Main St, Lafayette",
        pills: [{ status: "active", label: "Season Pass 2027" }],
        band: { next: { value: "Mon, May 3", sub: "Any time, Ryan" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "2027", sub: "Active, renewed" }, card: { value: "Visa 1881", sub: "Expires 02/29" } },
        cardLast4: "1881",
        jobs: [PASS_JOB(2027, "TH-2027-0011", "May 3, 2027", "scheduled", "Charged after each visit"), PASS_JOB(2026, "TH-2026-0003", "Oct 14, 2026", "done", "Paid, card")],
        invoices: [],
        messages: [msg("m1", "2026-11-03T15:11:00Z", "email", "purchase-confirmation", "Your Season Pass is reserved: TH-2027-0011")],
        notes: [event("n1", "2026-11-03T15:10:00Z", "Renewed Season Pass 2026 as TH-2027-0011"), event("n0", "2026-03-02T15:10:00Z", "Sold the Season Pass online, TH-2026-0003")],
        area: {
          kind: "pass",
          pass: passRow({ season: 2027, number: "TH-2027-0011", firstName: "Dale", lastName: "Whitaker" }),
          facts: passFacts("6", "Active", "$0 of $210 paid"),
          card: "Visa ending 1881",
          renewedFrom: { season: 2026, number: "TH-2026-0003" },
          earlier: [{ season: 2026, number: "TH-2026-0003", state: "Done", renewedAs: "TH-2027-0011" }],
        },
      })
    case "one-off":
      return base({
        name: "Marcus Webb",
        firstName: "Marcus",
        email: "marcus.webb@example.com",
        address: ["35 Cherry Ln", "Longmont, CO"],
        subtitle: "Customer since Jun 2026 · 35 Cherry Ln, Longmont",
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "Visa 7713", sub: "Expires 05/28" } },
        cardLast4: "7713",
        jobs: [{ id: "j1", title: "Sprinkler repair", day: "Jun 9", status: "done", billing: "Paid, card", billingState: "paid" }],
        invoices: [{ id: "i1", number: "Invoice 1007", due: "Jun 23", status: "paid", total: "$145", balance: "$0" }],
        messages: [msg("m1", "2026-06-09T22:00:00Z", "email", "receipt", "Receipt: $145 for your repair at 35 Cherry Ln")],
        notes: [event("n1", "2026-06-09T21:50:00Z", "Marked the repair done")],
      })
    case "reserve-next":
      return base({
        name: "Tessa Brandt",
        firstName: "Tessa",
        email: "tessa.brandt@example.com",
        address: ["9 Pine Ct", "Louisville, CO"],
        subtitle: "Customer since Mar 2026 · 9 Pine Ct, Louisville",
        pills: [{ status: "lapsed", label: "Season Pass 2026 ended" }],
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "2026", sub: "Expired, not renewed" }, card: { value: "Visa 0042", sub: "Expires 09/27" } },
        cardLast4: "0042",
        jobs: [PASS_JOB(2026, "TH-2026-0007", "Oct 20, 2026", "done", "Paid, card")],
        invoices: [],
        messages: [msg("m1", "2026-10-20T16:00:00Z", "email", "receipt", "Receipt: $115 for your fall blowout at 9 Pine Ct")],
        notes: [event("n1", "2026-10-20T15:50:00Z", "Marked the fall blowout done")],
        area: { kind: "sell", label: "Reserve next season", line: "Tessa's 2026 pass is done. Reserve 2027 to keep the same spring and fall days and repair priority.", earlier: [{ season: 2026, number: "TH-2026-0007", state: "Expired" }] },
      })
    case "nothing-yet":
      return base({
        name: "Priya Nair",
        firstName: "Priya",
        email: "priya.nair@example.com",
        address: ["77 Aspen Way", "Firestone, CO"],
        subtitle: "Added today · 77 Aspen Way, Firestone",
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "None", sub: "No card on file" } },
        cardLast4: undefined,
        property: [["Zones", "Not set"], ["Controller", "Not set"], ["Gate code", "None"], ["Must be home", "Not set"]],
        notes: nobodyNotes,
        consent: "Not asked yet",
      })
    case "card-expiring":
      return base({
        name: "Sam Ortiz",
        firstName: "Sam",
        email: "sam.ortiz@example.com",
        address: ["58 Harper Dr", "Broomfield, CO"],
        subtitle: "Customer since Apr 2026 · 58 Harper Dr, Broomfield",
        pills: [{ status: "active", label: "Season Pass 2027" }, { status: "waiting", label: "Card expires Dec 2026" }],
        band: { next: { value: "Mon, May 3", sub: "Any time, Ryan" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "2027", sub: "Active" }, card: { value: "Visa 3310", sub: "Expires 12/26, next month" } },
        cardLast4: "3310",
        jobs: [PASS_JOB(2027, "TH-2027-0014", "May 3, 2027", "scheduled", "Charged after each visit")],
        invoices: [],
        messages: [msg("m1", "2026-11-17T16:00:00Z", "email", "card-expiring", "Your card ending 3310 expires next month")],
        notes: [event("n1", "2026-11-17T16:00:00Z", "Sent the card-expiring email")],
        area: { kind: "pass", pass: passRow({ season: 2027, number: "TH-2027-0014", firstName: "Sam", lastName: "Ortiz" }), facts: passFacts("7", "Active", "$0 of $235 paid"), card: "Visa ending 3310, expires 12/26", earlier: [] },
      })
  }
}

export const STATE_NOTES: Record<CustomerState, string> = {
  "pass-holder": "Ryan sees a Season Pass holder with a repair on Thursday and an unpaid invoice. The one primary action is New job; Unpaid $145 is a badge beside the name.",
  "two-seasons": "Ryan sees the 2027 pass renewed from 2026: the Season Pass card links back to TH-2026-0003, the folded earlier season links forward to TH-2027-0011, and the band reads 2027, Active, renewed.",
  "one-off": "Ryan sees a customer who has only had a repair. The aside offers Get a Season Pass.",
  "reserve-next": "Ryan sees a customer whose 2026 pass ended and was not renewed. The aside offers Reserve next season.",
  "nothing-yet": "Ryan sees a customer with no work yet. Every empty card invites the first job.",
  "card-expiring": "Ryan sees a card that expires next month: the band says so and a waiting badge sits beside the name.",
}
