import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Message, Pass } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { PhotoItem } from "@/lib/photos/types"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { PillStatus } from "@/components/blocks/StatusPill"
import type { PillData } from "./job-fixtures"

// Design fixtures for the customer page (docs/plans/2026-11-19-admin-page-layout-research.md): pure data in the shapes the page takes.
// Customers of every kind: a pass holder with an open repair, two seasons, a one-off, nothing yet, opted out, refunded, and the five statuses. Every record
// named here carries an id the page turns into a RecordChip link; a fact with nothing behind it carries no link. Status is set by `customerStatusOf`.

import { withStatus } from "./customer-status-fixtures"
import { depositCustomer } from "./customer-deposit-fixture"
import type { ConsentData, CustomerBillingData, CustomerPageData, CustomerState, PassArea } from "./customer-types"
export * from "./customer-types"
export { AS_OF, STATUS_PILL, statusFactsOf, withStatus } from "./customer-status-fixtures"
export { STATE_NOTES } from "./customer-state-notes"
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
  status: "new",
  statusFacts: { jobs: [], visitAhead: false, passInForce: false },
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
  consent: {
    agreed: "Agreed Apr 14, 2026 on the website, terms v3",
    email: { on: false },
    text: { on: false },
    contactBy: "text",
    history: [{ id: "k0", on: "Apr 14, 2026", what: "Agreed to texts and email about visits and billing", source: "Website", who: "The customer" }],
  },
  area: { kind: "sell", label: "Get a Season Pass", line: "Reserve the spring turn-on and the fall blowout at today's per-zone prices, with the days picked now.", earlier: [] },
  ...over,
})

const VISA = (last4: string, expires: string) => ({ brand: "Visa", last4, expires, stripeUrl: "https://dashboard.stripe.com/customers/cus_demo" })
export const customerPageOf = (state: CustomerState): CustomerPageData => withStatus(rawCustomer(state))
function rawCustomer(state: CustomerState): CustomerPageData {
  switch (state) {
    case "pass-holder":
      return base({
        pills: [{ status: "active", label: "Season Pass 2027" }],
        band: {
          next: { value: "Thu, Nov 19", sub: "2:30 pm, Ryan", jobId: "j1" },
          unpaid: { value: "$145", sub: "Invoice sent, due Dec 2", invoiceId: "i1" },
          pass: { value: "Season Pass 2027", sub: "TH-2027-0008, active", jobId: "p2027" },
          card: { value: "Visa 4242", sub: "Expires 08/28" },
        },
        consent: { agreed: "Agreed Apr 14, 2026 on the website, terms v3", email: { on: true, note: "Opted in Nov 2 by the customer on the website" }, text: { on: false }, contactBy: "text", history: [{ id: "k1", on: "Nov 2, 2026", what: "Opted in to marketing email", source: "Website", who: "The customer" }, { id: "k0", on: "Apr 14, 2026", what: "Agreed to texts and email about visits and billing", source: "Website", who: "The customer" }] },
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
            { id: "p-card", receipt: "R-1031", date: "Apr 20", sortDay: "2026-04-20", jobId: "j0", jobName: "Spring turn-on", how: "Card", amount: "$145", invoiceId: "i0", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo" },
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
        consent: { agreed: "Agreed Mar 2, 2026 on the website, terms v3", stoppedOn: "Oct 3", email: { on: false }, text: { on: false }, contactBy: "email", history: [{ id: "k1", on: "Oct 3, 2026", what: "Replied STOP: texts stopped, every message goes by email", source: "Reply STOP", who: "The customer" }, { id: "k0", on: "Mar 2, 2026", what: "Agreed to texts and email about visits and billing", source: "Website", who: "The customer" }] },
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
          settled: "paid",
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
          settled: "paid",
          tone: "plain",
          total: "$145",
          paid: "$145",
          unpaid: "$0",
          card: VISA("7713", "05/28"),
          invoices: [{ id: "i1", number: "INV-2026-0007", jobId: "j1", jobName: "Sprinkler repair", amount: "$145", sent: "Jun 9", due: "Jun 23", status: "paid", statusLabel: "Paid", sortDay: "2026-06-09" }],
          payments: [{ id: "p1", receipt: "R-1007", date: "Jun 9", sortDay: "2026-06-09", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "$145", invoiceId: "i1", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo4" }],
        },
        messages: [msg("m1", "2026-06-09T22:00:00Z", "sms", "receipt", "Trailhead: receipt for $145, your repair at 35 Cherry Ln.")],
        notes: [event("n1", "2026-06-09T21:50:00Z", "Marked the repair done")],
      })
    case "opted-out":
      return base({
        id: "c5",
        name: "Rosa Medina",
        firstName: "Rosa",
        contact: { channel: "text", phone: PHONE, email: "rosa.medina@example.com" },
        address: ["14 Willow Way", "Erie, CO"],
        subtitle: "Customer since May 2026 · 14 Willow Way, Erie",
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "No card", sub: "Add one when you collect" } },
        jobs: [{ id: "j1", name: "Sprinkler repair", open: false, sortDay: "2026-06-02", day: day("2026-06-02", "Jun 2, 2026", "10:00 am", 3), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, check" } }],
        billing: { line: "Paid in full", settled: "paid", tone: "plain", total: "$145", paid: "$145", unpaid: "$0", invoices: [], payments: [{ id: "p1", receipt: "R-1004", date: "Jun 2", sortDay: "2026-06-02", jobId: "j1", jobName: "Sprinkler repair", how: "Check 2188", amount: "$145" }] },
        notes: [event("n1", "2026-11-09T16:00:00Z", "Turned marketing email off, asked by phone")],
        consent: { agreed: "Agreed May 6, 2026 on the website, terms v3", email: { on: false, note: "Opted out Nov 9, asked by phone, Ryan" }, text: { on: false }, contactBy: "text", history: [{ id: "k2", on: "Nov 9, 2026", what: "Opted out of marketing email", source: "Phone, by the office", who: "Ryan" }, { id: "k1", on: "Nov 2, 2026", what: "Opted in to marketing email", source: "Website", who: "The customer" }, { id: "k0", on: "May 6, 2026", what: "Agreed to texts and email about visits and billing", source: "Website", who: "The customer" }] },
      })
    case "refunded":
      return base({
        id: "c6",
        name: "Nora Quinn",
        firstName: "Nora",
        contact: { channel: "text", phone: PHONE, email: "nora.quinn@example.com" },
        address: ["203 Maple Ct", "Lafayette, CO"],
        subtitle: "Customer since Aug 2026 · 203 Maple Ct, Lafayette",
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "Visa 4242", sub: "Expires 08/28" } },
        jobs: [{ id: "j1", name: "Sprinkler repair", open: false, sortDay: "2026-11-18", day: day("2026-11-18", "Nov 18, 2026", "9:00 am", 4), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Refunded" } }],
        billing: {
          line: "Refunded",
          settled: "refunded",
          tone: "plain",
          total: "$145", paid: "$0", unpaid: "$0", refunded: "$145",
          card: VISA("4242", "08/28"),
          invoices: [{ id: "i1", number: "INV-2026-0051", jobId: "j1", jobName: "Sprinkler repair", amount: "$145", sent: "Nov 18", due: "Dec 2", status: "refunded", statusLabel: "Refunded", sortDay: "2026-11-18" }],
          payments: [
            { id: "r1", receipt: "R-1102", date: "Nov 19", sortDay: "2026-11-19", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "-$145", refund: true, refundOf: "p1" },
            { id: "p1", receipt: "R-1101", date: "Nov 18", sortDay: "2026-11-18", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "$145", invoiceId: "i1", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo5", refunded: true },
          ],
        },
        messages: [msg("m1", "2026-11-19T15:01:00Z", "sms", "receipt", "Trailhead: $145 was refunded to your card for the repair at 203 Maple Ct.")],
        notes: [event("n2", "2026-11-19T15:00:00Z", "Refunded $145 to the card"), event("n1", "2026-11-18T17:50:00Z", "Charged $145 to the card")],
      })
    case "part-refunded":
      return base({
        id: "c7",
        name: "Kyle Brandt",
        firstName: "Kyle",
        contact: { channel: "text", phone: PHONE, email: "kyle.brandt@example.com" },
        address: ["88 Orchard Ln", "Louisville, CO"],
        subtitle: "Customer since Sep 2026 · 88 Orchard Ln, Louisville",
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$0", sub: "Nothing unpaid" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "Visa 4242", sub: "Expires 08/28" } },
        jobs: [{ id: "j1", name: "Sprinkler repair", open: false, sortDay: "2026-11-18", day: day("2026-11-18", "Nov 18, 2026", "9:00 am", 4), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, $50 refunded" } }],
        billing: {
          line: "Paid, $50 refunded",
          settled: "paid",
          tone: "plain",
          total: "$145",
          paid: "$95",
          unpaid: "$0",
          refunded: "$50",
          card: VISA("4242", "08/28"),
          invoices: [],
          payments: [
            { id: "r1", receipt: "R-1112", date: "Nov 19", sortDay: "2026-11-19", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "-$50", refund: true, refundOf: "p1" },
            { id: "p1", receipt: "R-1111", date: "Nov 18", sortDay: "2026-11-18", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "$145", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo6" },
          ],
        },
        notes: [event("n2", "2026-11-19T15:00:00Z", "Refunded $50 to the card"), event("n1", "2026-11-18T17:50:00Z", "Charged $145 to the card")],
      })
    case "deposit": return depositCustomer(customerPageOf("one-off"))
    case "active-recent":
      return base({
        id: "c8",
        name: "Hal Reed",
        firstName: "Hal",
        contact: { channel: "text", phone: PHONE, email: "hal.reed@example.com" },
        address: ["41 Cottonwood Dr", "Erie, CO"],
        subtitle: "Customer since Mar 2025 · 41 Cottonwood Dr, Erie",
        band: { next: { value: "None", sub: "Nothing scheduled" }, unpaid: { value: "$145", sub: "Past due since Apr 3, 2025", alert: true, invoiceId: "i1" }, pass: { value: "None", sub: "No Season Pass" }, card: { value: "No card", sub: "Add one when you collect" } },
        unpaid: "$145",
        openInvoice: { id: "i1", number: "INV-2026-0003", amount: "$145", jobName: "Spring turn-on", due: "Apr 3, 2025" },
        jobs: [{ id: "j1", name: "Spring turn-on", open: false, sortDay: "2025-03-20", day: day("2025-03-20", "Mar 20, 2025", "Any time", 5), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Past due since Apr 3", tone: "past-due" } }],
        billing: { line: "Past due since Apr 3, 2025", tone: "past-due", total: "$145", paid: "$0", unpaid: "$145", invoices: [{ id: "i1", number: "INV-2026-0003", jobId: "j1", jobName: "Spring turn-on", amount: "$145", sent: "Mar 20, 2025", due: "Apr 3, 2025", status: "overdue", statusLabel: "Past due", sortDay: "2025-03-20" }], payments: [] },
        notes: [event("n1", "2025-03-20T21:00:00Z", "Sent invoice INV-2026-0003, $145, due Apr 3, 2025")],
      })
    case "past-customer":
      return base({
        id: "c9",
        name: "Ivy Lund",
        firstName: "Ivy",
        contact: { channel: "email", phone: PHONE, email: "ivy.lund@example.com" },
        address: ["9 Meadow Ln", "Louisville, CO"],
        subtitle: "Customer since Apr 2024 · 9 Meadow Ln, Louisville",
        doNotService: { reason: "Would not let us in the gate twice." },
        jobs: [{ id: "j1", name: "Sprinkler repair", open: false, sortDay: "2024-05-10", day: day("2024-05-10", "May 10, 2024", "10:00 am", 3), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, check" } }],
        billing: { line: "Paid in full", settled: "paid", tone: "plain", total: "$145", paid: "$145", unpaid: "$0", invoices: [], payments: [{ id: "p1", receipt: "R-0602", date: "May 10, 2024", sortDay: "2024-05-10", jobId: "j1", jobName: "Sprinkler repair", how: "Check 1180", amount: "$145" }] },
        notes: [event("n2", "2026-09-02T16:00:00Z", "Marked Do not service: Would not let us in the gate twice."), event("n1", "2024-05-10T21:00:00Z", "Marked the repair done")],
      })
    case "archived":
      return base({
        id: "c10",
        name: "Gus Pratt",
        firstName: "Gus",
        contact: { channel: "text", phone: PHONE, email: "gus.pratt@example.com" },
        address: ["70 Ridge Rd", "Lafayette, CO"],
        subtitle: "Customer since Apr 2023 · 70 Ridge Rd, Lafayette",
        statusFacts: { archivedAt: "2026-11-20", jobs: [], visitAhead: false, passInForce: false },
        jobs: [{ id: "j1", name: "Fall blowout", open: false, sortDay: "2023-10-12", day: day("2023-10-12", "Oct 12, 2023", "Any time", 4), who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, card" } }],
        billing: { line: "Paid in full", settled: "paid", tone: "plain", total: "$95", paid: "$95", unpaid: "$0", invoices: [], payments: [{ id: "p1", receipt: "R-0455", date: "Oct 12, 2023", sortDay: "2023-10-12", jobId: "j1", jobName: "Fall blowout", how: "Card", amount: "$95" }] },
        notes: [event("n2", "2026-11-20T15:00:00Z", "Archived the customer"), event("n1", "2023-10-12T21:00:00Z", "Marked the fall blowout done")],
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
        consent: { agreed: "", email: { on: false }, text: { on: false }, contactBy: "text", history: [] },
        untouched: true,
      })
  }
}
