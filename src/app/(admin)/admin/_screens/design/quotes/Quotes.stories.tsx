import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobsGridDesign } from "../JobsGridDesign"
import { allRows } from "../walkthrough/jobs-data"
import { QuoteJobPage, type QuoteJobPageProps } from "./QuoteJobPage"
import { DESIGN_VISIT_JOB, QUOTES_NOW, QUOTE_JOB_FIXTURES, fixtureJob, jobFromRequest, type QuoteJob } from "./quote-model"
import { createQuoteStore } from "./quote-store"

// The quote on the job (Hannah, Nov 20 2026): a job from a request reads Needs a quote, Ryan prices its lines and sends a quote with an optional deposit, the
// job reads Quote sent, and the customer approves or declines. There is no Quotes item in the nav: a quote is a section of its job, and Jobs' Status filter
// lists Needs a quote and Quote sent. Each story says what Ryan sees. Pure screens over fixtures: nothing is wired and nothing is sent.

const meta = {
  title: "Admin/Quotes",
  component: QuoteJobPage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The job page in its quote states: Needs a quote (add lines, then Send a quote), the send dialog with its deposit control (none by default, dollars or percent, never above the total) and a without-notifying caret, Quote sent (Remind, Revise, Mark approved by hand), Approved with its deposit and Billing, and Declined. Lines are locked while a quote is out. The clickable version is Admin / Walkthrough (clickable): accept a request, then send its quote.",
      },
    },
  },
} satisfies Meta<typeof QuoteJobPage>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const HIDDEN = ["!dev", "!autodocs"]

/** A story's own store, so one story that sends a quote never changes another. */
function Stage({ job, ...rest }: { job: QuoteJob } & Omit<QuoteJobPageProps, "store" | "jobId">) {
  const [store] = useState(() => createQuoteStore([job, ...QUOTE_JOB_FIXTURES.filter((f) => f.jobId !== job.jobId)]))
  return (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <QuoteJobPage store={store} jobId={job.jobId} now={QUOTES_NOW} {...rest} />
    </AdminShell>
  )
}

const dana = () => fixtureJob("q-dana")
const priced = (): QuoteJob => ({ ...dana(), lines: [{ id: "d1", name: "Zone 3 line", description: "A new line for zone 3 by the driveway.", amount: 380 }, { id: "d2", name: "Sprinkler repair visit", amount: 145 }] })
const beth = () => fixtureJob("q-beth")
const greg = () => fixtureJob("q-greg")
const approvedByCard = (): QuoteJob => {
  const j = beth()
  const q = j.quotes[0]!
  q.state = "approved"
  q.decidedBy = "customer"
  q.decidedOn = "2026-11-12T16:30:00Z"
  q.deposit = { amount: 300, percent: 25, paid: { how: "card", on: "2026-11-12T16:30:00Z" } }
  j.history = [...j.history, { at: "2026-11-12T16:30:00Z", actor: "Beth", what: `Approved quote ${q.id}` }]
  return j
}
const approvedByHand = (): QuoteJob => {
  const j = greg()
  const q = j.quotes[0]!
  q.state = "approved"
  q.decidedBy = "Ryan"
  q.decidedOn = "2026-11-17T20:00:00Z"
  j.history = [...j.history, { at: "2026-11-17T20:00:00Z", actor: "Ryan", what: `Marked quote ${q.id} approved` }]
  return j
}
const declined = (): QuoteJob => {
  const j = greg()
  const q = j.quotes[0]!
  q.state = "declined"
  q.decidedBy = "customer"
  q.decidedOn = "2026-11-17T15:00:00Z"
  j.history = [...j.history, { at: "2026-11-17T15:00:00Z", actor: "Greg", what: `Declined quote ${q.id}` }]
  return j
}
const revised = (): QuoteJob => {
  const j = greg()
  j.quotes[0]!.state = "replaced"
  j.lines = [...j.lines.slice(0, 2), { id: "g3", name: "New lines, zone 6", description: "Three heads added.", amount: 520 }]
  j.history = [...j.history, { at: "2026-11-17T18:00:00Z", actor: "Ryan", what: "Revised quote Q-2026-0008: it is now Replaced and the job needs a quote" }]
  return j
}

const args = { store: createQuoteStore([]), jobId: "x" }
const s = (job: () => QuoteJob, globals: typeof laptop, extra: Omit<QuoteJobPageProps, "store" | "jobId"> = {}): Story => ({ args, globals, render: () => <Stage job={job()} {...extra} /> })

/** A job from a request: one unpriced line holds the customer's words. The primary, Send a quote, is off until a line has a price. */
export const NeedsAQuote: Story = { ...s(dana, laptop), name: "Needs a quote" }
export const NeedsAQuotePhone: Story = { ...s(dana, phone), name: "Needs a quote, phone" }

/** An installation booked online as a design visit: the visit is on the job and done, the price reads "Set at the visit", the job needs a quote, and Ryan sends the quote from the job once he has priced the line. The Quote section is first. */
const install = (): QuoteJob => structuredClone(DESIGN_VISIT_JOB)
export const InstallAfterDesignVisit: Story = { ...s(install, laptop), name: "Installation after its design visit" }
export const InstallAfterDesignVisitPhone: Story = { ...s(install, phone), name: "Installation after its design visit, phone" }

/** Create job on a priced service (a $145 repair): the job is ready to schedule, Unscheduled, with no quote. The customer's words are its first note and it reads "Created from a request". */
const direct = (): QuoteJob => jobFromRequest({ jobId: "q-tom", requestId: "rq-tom", customerId: "other-tom-ellis", customer: "Tom Ellis", first: "Tom", phone: "(970) 555-0133", email: "tom.ellis@example.com", contact: "text", service: "Sprinkler repair", street: "64 Hollis Ct", town: "Louisville", words: "Two heads in the side yard are spraying the fence. Hoping someone can come this week.", receivedAt: "2026-11-17T15:00:00Z", at: QUOTES_NOW, price: 145, quote: false })
export const CreatedFromARequest: Story = { ...s(direct, laptop), name: "Created from a request, ready to schedule" }

/** Priced lines: Send a quote is the one primary action. */
export const ReadyToSend: Story = { ...s(priced, laptop), name: "Ready to send" }

/** Add a line: a name, an optional description and a price. */
export const AddALine: Story = { ...s(dana, laptop, { initialDialog: { line: "new" } }), name: "Add a line" }

/** Send a quote, no deposit: the channel is the customer's contact preference, the sentence names the effect, the caret sends without notifying. */
export const SendNoDeposit: Story = { ...s(priced, laptop, { initialDialog: "send" }), name: "Send dialog, no deposit" }
export const SendNoDepositPhone: Story = { ...s(priced, phone, { initialDialog: "send" }), name: "Send dialog, no deposit, phone" }

/** A deposit typed in dollars. */
export const SendDollars: Story = { ...s(priced, laptop, { initialDialog: "send", sendInitial: { mode: "dollars", value: "150" } }), name: "Send dialog, dollars" }

/** A deposit typed as a percent: the dialog shows the dollars it comes to, frozen when the quote is sent. */
export const SendPercent: Story = { ...s(priced, laptop, { initialDialog: "send", sendInitial: { mode: "percent", value: "25" } }), name: "Send dialog, percent" }

/** A deposit above the total: the problem is written under the box and the send button is off. */
export const SendTooHigh: Story = { ...s(priced, laptop, { initialDialog: "send", sendInitial: { mode: "dollars", value: "900" } }), name: "Send dialog, above the total" }

/** Sent with a $300 deposit: the job reads Quote sent, the quote is Sent, the lines are locked. The primary is Send a quote reminder; Mark approved and Revise sit beside it. */
export const QuoteSent: Story = { ...s(beth, laptop), name: "Quote sent, with a deposit" }
export const QuoteSentPhone: Story = { ...s(beth, phone), name: "Quote sent, with a deposit, phone" }

/** Sent with no deposit and reminded once. */
export const QuoteSentReminded: Story = { ...s(greg, laptop), name: "Quote sent, no deposit, reminded" }

/** A reminder is the notification, so it has no without-notifying caret: text, email or both, a fixed preview and one optional line. */
export const Reminder: Story = { ...s(beth, laptop, { initialDialog: "remind" }), name: "Quote reminder" }

/** Revise marks the quote Replaced and returns the job to Needs a quote. */
export const ReviseDialog: Story = { ...s(greg, laptop, { initialDialog: "revise" }), name: "Revise" }

/** After a revise: Needs a quote again, the lines open, the replaced quote listed under Earlier quotes. */
export const Revised: Story = { ...s(revised, laptop), name: "Revised, needs a quote again" }

/** Mark approved by hand with a deposit: Ryan says how it was paid, a receipt goes out, and he chooses whether to tell the customer. */
export const ApproveByHand: Story = { ...s(beth, laptop, { initialDialog: "approve" }), name: "Mark approved by hand" }

/** No deposit was set: the dialog has no payment question. */
export const ApproveByHandNoDeposit: Story = { ...s(greg, laptop, { initialDialog: "approve" }), name: "Mark approved by hand, no deposit" }

/** The customer approved and the card deposit went through: Open and ready to schedule, with Billing, the payment and the invoice note. */
export const ApprovedByCustomer: Story = { ...s(approvedByCard, laptop), name: "Approved, deposit paid by card" }
export const ApprovedByCustomerPhone: Story = { ...s(approvedByCard, phone), name: "Approved, deposit paid by card, phone" }

/** Ryan marked it approved after a call; no deposit. */
export const ApprovedByHand: Story = { ...s(approvedByHand, laptop), name: "Approved by hand, no deposit" }

/** Cancel after a deposit is paid is blocked until Ryan refunds it himself. */
export const CancelBlocked: Story = { ...s(approvedByCard, laptop, { initialDialog: "cancel" }), name: "Cancel is blocked by the deposit" }

/** Refund is Ryan's own decision: it states the amount and what the customer is told. */
export const RefundDeposit: Story = { ...s(approvedByCard, laptop, { initialDialog: "refund" }), name: "Refund the deposit" }

/** The customer declined: the job is canceled and there are no actions. */
export const Declined: Story = { ...s(declined, laptop), name: "Declined" }

/** The Jobs grid's Status filter lists Needs a quote and Quote sent beside the rest; here it is set to them. */
export const JobsStatusFilter: Story = {
  name: "Jobs, Status filter",
  args,
  globals: laptop,
  render: () => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobsGridDesign rows={allRows()} defaultFilters={[{ column: "stage", values: ["needs-a-quote", "quote-sent"] }]} />
    </AdminShell>
  ),
}

// ---------------------------------------------------------------------------------------------------------------------- hidden twins (they play)

/** Price a line, send with a $300 deposit: the job reads Quote sent and the lines lock. */
export const SendTest: Story = {
  name: "Send a quote (test)",
  tags: HIDDEN,
  ...s(priced, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Send a quote" }))
    const body = within(document.body)
    await userEvent.click(await body.findByRole("radio", { name: "Dollars" }))
    await userEvent.type(await body.findByRole("textbox", { name: "Deposit in dollars" }), "900")
    await expect(await body.findByText(/cannot be more than the total/)).toBeInTheDocument()
    await userEvent.clear(body.getByRole("textbox", { name: "Deposit in dollars" }))
    await userEvent.type(body.getByRole("textbox", { name: "Deposit in dollars" }), "150")
    await userEvent.click(await body.findByRole("button", { name: "Send the quote" }))
    await expect((await c.findAllByText("Quote sent")).length).toBeGreaterThan(0)
    await expect(await c.findByText(/Locked while quote/)).toBeInTheDocument()
    await expect(await c.findByRole("button", { name: "Send a quote reminder" })).toBeInTheDocument()
  },
}

/** Revise returns the job to Needs a quote and lists the replaced quote. */
export const ReviseTest: Story = {
  name: "Revise (test)",
  tags: HIDDEN,
  ...s(greg, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Revise" }))
    await userEvent.click(await within(document.body).findByRole("button", { name: "Revise the quote" }))
    await expect(await c.findByText("Earlier quotes")).toBeInTheDocument()
    await expect((await c.findAllByText("Needs a quote")).length).toBeGreaterThan(0)
  },
}
