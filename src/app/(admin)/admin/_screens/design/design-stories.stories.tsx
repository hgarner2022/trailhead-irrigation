import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomerBilling } from "./CustomerBilling"
import { InvoicePanel } from "./InvoicePanel"
import { InvoicesPage } from "./InvoicesPage"
import { JobsGridDesign, type GridJob } from "./JobsGridDesign"
import { INVOICE_NOTES, INVOICE_ROWS, invoiceOf, type InvoiceStatus } from "./invoice-fixtures"

// D to G of the job object design (docs/plans/2026-11-19-job-object-design.md): the Jobs grid with its Billing column, the Invoices screen,
// the invoice panel in every state and the customer's Billing section, each at 1280 (Laptop) and 375 (Phone). Pure screens over fixtures.

const meta = { title: "Design/Jobs, Invoices and Billing", parameters: { layout: "fullscreen" } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const shell = (children: React.ReactNode) => <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>{children}</AdminShell>
const page = (children: React.ReactNode) => <div className="min-h-screen bg-cream p-4 md:p-6">{children}</div>

const job = (id: string, name: string, service: string, title: string, property: string, stage: GridJob["stage"], visits: string, total: number, billingState: GridJob["billingState"], billing: string, next: string): GridJob =>
  ({ id, name, service, title, property, stage, visits, total, billingState, billing, next })
const JOBS: GridJob[] = [
  job("j1", "Reese Holloway", "Fall blowout", "Fall blowout", "51 Shadow Ln, Firestone", "done", "1 of 1 done", 115, "overdue", "Past due since Nov 17", "None"),
  job("j2", "Marcus Bell", "Sprinkler repair visit", "Sprinkler repair visit", "91 Main St, Longmont", "done", "1 of 1 done", 145, "bill-sent", "Invoice sent, due Dec 2", "None"),
  job("j3", "Joe Alvarez", "Sprinkler repair visit", "Sprinkler repair visit", "22 Pine St, Louisville", "done", "1 of 1 done", 145, "owed", "$145 unpaid", "None"),
  job("j4", "Andrea Dalton", "Season Pass", "Season Pass TH-2027-0008", "480 Briggs St, Erie", "open", "0 of 2 done", 260, null, "", "Mon, May 3"),
  job("j5", "Sam Ortiz", "Sprinkler repair visit", "Sprinkler repair visit", "14 Aspen Dr, Firestone", "open", "0 of 1 done", 145, null, "", "Today"),
  job("j6", "Dana Cho", "Spring turn-on", "Spring turn-on", "18 Cedar Way, Erie", "done", "1 of 1 done", 145, "paid", "Paid, card", "None"),
  job("j7", "Priya Shah", "Sprinkler repair visit", "Sprinkler repair visit", "330 Elm Dr, Lafayette", "done", "1 of 1 done", 145, "paid", "Paid, Venmo", "None"),
  job("j8", "Tom Becker", "New sprinkler system installation", "New sprinkler system installation", "600 Hill Rd, Broomfield", "needs-a-quote", "0 of 1 done", 0, null, "", "Unscheduled"),
  job("j9", "Lena Park", "Christmas lights", "Christmas lights", "7 Oak Ct, Lafayette", "quoted", "0 of 1 done", 600, null, "", "Unscheduled"),
  job("j10", "Greg Olsen", "Core aeration", "Core aeration", "5 Birch Ln, Erie", "cancelled", "0 of 1 done", 95, null, "", "None"),
]

/** Ryan sees every job with a Billing column (Past due, Invoice sent, Unpaid, Paid) and the Job filter listing the services. Open a row for its page. */
export const JobsGrid: Story = { globals: laptop, render: () => shell(<JobsGridDesign rows={JOBS} />) }
export const JobsGridPhone: Story = { globals: phone, render: () => shell(<JobsGridDesign rows={JOBS} />) }
/** No jobs yet: the empty state says how to add one. */
export const JobsGridEmpty: Story = { globals: laptop, render: () => shell(<JobsGridDesign rows={[]} />) }
/** The filters hide every row: "No jobs match." with Clear filters. */
export const JobsGridNoMatch: Story = { globals: laptop, render: () => shell(<JobsGridDesign rows={JOBS} defaultFilters={[{ column: "billing", values: ["paid"] }, { column: "service", values: ["Core aeration"] }]} />) }

/** Ryan sees four tiles and every invoice, past due first. The one primary action is New invoice. */
export const InvoicesRows: Story = { globals: laptop, render: () => page(<InvoicesPage rows={INVOICE_ROWS} />) }
export const InvoicesRowsPhone: Story = { globals: phone, render: () => page(<InvoicesPage rows={INVOICE_ROWS} />) }
/** Ryan sees no invoices yet and is told how one gets made. */
export const InvoicesEmpty: Story = { globals: laptop, render: () => page(<InvoicesPage rows={[]} />) }
export const InvoicesEmptyPhone: Story = { globals: phone, render: () => page(<InvoicesPage rows={[]} />) }
/** The filters hide every row: "No invoices match." with Clear filters. */
export const InvoicesNoMatch: Story = { globals: laptop, render: () => page(<InvoicesPage rows={INVOICE_ROWS} defaultFilters={[{ column: "status", values: ["voided"] }, { column: "range", values: ["this-month"] }]} />) }
export const InvoicesNoMatchPhone: Story = { globals: phone, render: () => page(<InvoicesPage rows={INVOICE_ROWS} defaultFilters={[{ column: "status", values: ["voided"] }, { column: "range", values: ["this-month"] }]} />) }

const panel = (status: InvoiceStatus | "sent-reminded", globals: typeof laptop): Story => ({ globals, parameters: { docs: { description: { story: INVOICE_NOTES[status] } } }, render: () => page(<InvoicePanel invoice={invoiceOf(status)} />) })

/** Ryan sees a sent invoice with its reminder schedule and the next reminder date. The one primary action is Remind. */
export const InvoiceSent: Story = panel("sent", laptop)
export const InvoiceSentPhone: Story = panel("sent", phone)
/** Ryan sees Reminded today greyed until tomorrow. The one primary action waits; Record the payment is still there. */
export const InvoiceRemindedToday: Story = panel("sent-reminded", laptop)
export const InvoiceRemindedTodayPhone: Story = panel("sent-reminded", phone)
/** Ryan sees Past due in red with the reminders already sent. The one primary action is Remind. */
export const InvoicePastDue: Story = panel("past-due", laptop)
export const InvoicePastDuePhone: Story = panel("past-due", phone)
/** Ryan sees a check recorded by hand and $85 still open. The one primary action is Remind. */
export const InvoicePartPaid: Story = panel("part-paid", laptop)
export const InvoicePartPaidPhone: Story = panel("part-paid", phone)
/** Ryan sees Paid with the payment and the receipt text. No primary action. */
export const InvoicePaid: Story = panel("paid", laptop)
export const InvoicePaidPhone: Story = panel("paid", phone)
/** Ryan sees a voided invoice kept on record. No primary action. */
export const InvoiceVoided: Story = panel("voided", laptop)
export const InvoiceVoidedPhone: Story = panel("voided", phone)

/** The customer's Billing section: Unpaid and Paid this year, then every invoice and payment, newest first. An invoice row opens the invoice. */
export const CustomerBillingSection: Story = { globals: laptop, render: () => page(<CustomerBilling />) }
export const CustomerBillingSectionPhone: Story = { globals: phone, render: () => page(<CustomerBilling />) }
