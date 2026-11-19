import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordChip } from "./RecordChip"
import { RecordPreview } from "./RecordPreview"
import { StatusPill } from "./StatusPill"
import { customerPreview, invoicePreview, jobPreview, type RecordPreviewData } from "./record-preview-model"

// Two more places the rule applies, with the same chip and the same preview data (docs/plans/2026-11-19-record-links-research.md, rule 1 and 6):
// a Needs action row on Home and a Cmd+K result list. The job page, Season Pass visit rows, Billing rows and the invoice panel are in
// "Design/..." stories. Pure compositions over fixtures, nothing wired.

const meta = { title: "Blocks/RecordChip applied", parameters: { layout: "padded" } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

const ANDREA = customerPreview({ id: "c1", name: "Andrea Reyes", phone: "(970) 555-0123", address: "480 Briggs St, Erie", openJobs: 2, unpaid: "$145" })
const JOB = jobPreview({ id: "j1", name: "Sprinkler repair", customer: "Marcus Bell", status: "done", total: "$145" })
const INVOICE = invoicePreview({ id: "i1", number: "1038", customer: "Reese Holloway", status: "overdue", statusLabel: "Past due", total: "$145", balance: "$145", due: "Nov 17" })

function HomeRow({ chip, line, pill }: { chip: RecordPreviewData; line: string; pill: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-1">
      <span className="flex min-w-0 flex-col">
        <RecordChip kind={chip.kind} name={chip.name} href={chip.href} preview={chip} />
        <span className="text-sm text-muted-foreground">{line}</span>
      </span>
      {pill}
    </li>
  )
}

/** Home's Needs action: the customer, the job and the invoice are chips; the row says what to do about it. */
function Home() {
  return (
    <ul className="max-w-2xl rounded-lg border border-border bg-card px-4">
      <HomeRow chip={ANDREA} line="Card not charged · Spring turn-on, $145" pill={<StatusPill status="owed" />} />
      <HomeRow chip={JOB} line="Marcus Bell · done Nov 17, not paid" pill={<StatusPill status="owed" />} />
      <HomeRow chip={INVOICE} line="Reese Holloway · Remind" pill={<StatusPill status="overdue" />} />
    </ul>
  )
}
export const HomeNeedsAction: Story = { render: () => <Home />, globals: laptop }
export const HomeNeedsActionPhone: Story = { render: () => <Home />, globals: phone }

/** Cmd+K: each hit is the same chip with its sub line; the highlighted hit's card is the same `RecordPreview`, from the same data. */
function Search() {
  return (
    <div className="grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_18rem]">
      <ul aria-label="Results for erie">
        <li className="px-1 text-xs font-medium text-muted-foreground">Customers</li>
        <li><RecordChip kind="customer" name={ANDREA.name} href={ANDREA.href} /></li>
        <li className="mt-2 px-1 text-xs font-medium text-muted-foreground">Jobs</li>
        <li><RecordChip kind="job" name={JOB.name} href={JOB.href} /></li>
        <li className="mt-2 px-1 text-xs font-medium text-muted-foreground">Invoices</li>
        <li><RecordChip kind="invoice" name={INVOICE.name} href={INVOICE.href} /></li>
      </ul>
      <div className="hidden md:block">
        <RecordPreview data={ANDREA} className="shadow-none" />
      </div>
    </div>
  )
}
export const CommandKHits: Story = { render: () => <Search />, globals: laptop }
export const CommandKHitsPhone: Story = { render: () => <Search />, globals: phone }
