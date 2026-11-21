import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { InvoicePage } from "../InvoicePanel"
import { JobsGridDesign } from "../JobsGridDesign"
import { finalInvoiceOf } from "./price-change-invoice"
import { allRows } from "../walkthrough/jobs-data"
import { QuoteJobPage, type QuoteJobPageProps } from "./QuoteJobPage"
import { QuotesList } from "./QuotesList"
import type { QuoteTab } from "./quote-list-model"
import { QuotesShell } from "./QuotesShell"
import { QUOTE_HISTORY_FIXTURES } from "./quote-history-fixtures"
import { DESIGN_VISIT_JOB, QUOTES_NOW, QUOTE_JOB_FIXTURES, fixtureJob, jobFromRequest, type QuoteJob } from "./quote-model"
import { createQuoteStore } from "./quote-store"

// The quote on the job (Hannah, Nov 20 2026): a job from a request reads Needs a quote, Ryan prices its lines and sends a quote with an optional deposit, the
// job reads Quote sent, and the customer approves or declines. A quote is a section of its job, and Jobs' Status filter
// lists Needs a quote and Quote sent. Each story says what Ryan sees. Pure screens over fixtures: nothing is wired and nothing is sent.

const meta = {
  title: "Admin/Quotes",
  component: QuoteJobPage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The job page in its quote states: Needs a quote (one Quote card: price the lines in their rows, an optional deposit set in the card (none by default, dollars or percent, never above the total), then Send a quote), the send dialog with its without-notifying caret, Quote sent (Remind, Revise, Mark approved by hand), Approved with its deposit and Billing, and Declined. Lines are locked while a quote is out. The clickable version is Admin / Walkthrough (clickable): accept a request, then send its quote.",
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
/** Beth's job after Ryan pressed Revise on the quote that was out: built by the store, so the replaced quote is listed, her $300 deposit (25%) is where the next quote starts, and the roofline is the line he is changing. */
const revising = (): QuoteJob => {
  const store = createQuoteStore([beth()])
  store.revise("q-beth", "2026-11-17T18:00:00Z")
  store.updateLine("q-beth", "b1", { amount: 1000 }, "2026-11-17T18:05:00Z")
  return structuredClone(store.getSnapshot()["q-beth"]!)
}
/** Priced lines with a deposit already set in the card. */
const withDeposit = (mode: "dollars" | "percent", value: string): QuoteJob => ({ ...priced(), depositDraft: { mode, value } })
/** The quote after Ryan pressed Send: built by the store, so the quote number, the frozen lines and the history line are the store's own. */
const justSent = (): QuoteJob => {
  const store = createQuoteStore([withDeposit("dollars", "150")])
  store.send("q-dana", { via: "text", deposit: { amount: 150 }, at: QUOTES_NOW })
  return structuredClone(store.getSnapshot()["q-dana"]!)
}

const args = { store: createQuoteStore([]), jobId: "x" }
const s = (job: () => QuoteJob, globals: typeof laptop, extra: Omit<QuoteJobPageProps, "store" | "jobId"> = {}): Story => ({ args, globals, render: () => <Stage job={job()} {...extra} /> })

// ---------------------------------------------------------------------------------------------------------------------- the Quote editor
// Hannah, Nov 20 2026: "Create a quote here. What's the flow?" A job in Needs a quote leads with ONE Quote card: Ryan prices the lines in their rows, sets an optional
// deposit and presses Send a quote. The band holds the job's own facts (When, Who, Where, Contact) so no tile repeats the card.

/** Just created from a request, nothing priced: "1 Price  2 Send  3 They approve", what the customer asked, the one line (the service, never the customer's words) with an empty price box, and Send a quote off with one line saying what is missing. */
export const NeedsAQuote: Story = { ...s(dana, laptop), name: "Needs a quote, nothing priced" }
export const NeedsAQuotePhone: Story = { ...s(dana, phone), name: "Needs a quote, nothing priced, phone" }

/** One line priced, a second added and still empty: the total follows the box, Send a quote is on and the step moves to 2. */
const onePriced = (): QuoteJob => ({ ...dana(), lines: [{ id: "d1", name: "Larger sprinkler repair", amount: 380 }, { id: "d2", name: "Zone 3 line", amount: 0 }] })
export const OneLinePriced: Story = { ...s(onePriced, laptop), name: "One line priced" }
export const OneLinePricedPhone: Story = { ...s(onePriced, phone), name: "One line priced, phone" }

/** A deposit set in dollars: the dollars it comes to are written under the box. */
export const DepositDollars: Story = { ...s(() => withDeposit("dollars", "150"), laptop), name: "Deposit in dollars" }
export const DepositDollarsPhone: Story = { ...s(() => withDeposit("dollars", "150"), phone), name: "Deposit in dollars, phone" }

/** A deposit set as a percent of the total: 25% of $525 comes to $131. */
export const DepositPercent: Story = { ...s(() => withDeposit("percent", "25"), laptop), name: "Deposit in percent" }
export const DepositPercentPhone: Story = { ...s(() => withDeposit("percent", "25"), phone), name: "Deposit in percent, phone" }

/** A deposit above the total: Send a quote is off and the one line beside it says why. */
export const DepositTooHigh: Story = { ...s(() => withDeposit("dollars", "900"), laptop), name: "Deposit above the total" }

/** A quantity shows in the row only when it is more than one: three of the same line, the price is for one. */
const withQuantity = (): QuoteJob => ({ ...dana(), lines: [{ id: "d1", name: "Larger sprinkler repair", amount: 380 }, { id: "d2", name: "Replacement head", amount: 18, quantity: 3 }] })
export const QuantityMoreThanOne: Story = { ...s(withQuantity, laptop), name: "A quantity of three" }

/** After Send: the same card, in the same place, is the sent quote (its pill, the facts, Remind, Revise, Mark approved by hand) and the lines are locked below it. */
export const AfterSend: Story = { ...s(justSent, laptop), name: "After send" }
export const AfterSendPhone: Story = { ...s(justSent, phone), name: "After send, phone" }

// Change service (Hannah, Nov 21 2026): under More while no quote has been sent. The same "What is this for?" picker as the convert sheet.

/** Change service opened on a job: the picker starts on the job's own service, and the button stays off until Ryan chooses a different one ("This is the current service."). */
export const ChangeServiceCurrent: Story = { ...s(dana, laptop, { initialDialog: "service" }), name: "Change service, current service" }

/** The wrong service being changed: the larger repair becomes a sprinkler repair, and the sentence says what happens to the service line and what stays. */
export const ChangeServiceDialog: Story = { ...s(dana, laptop, { initialDialog: "service", initialServicePick: { key: "repair", other: "" } }), name: "Change service, a wrong service being changed" }
export const ChangeServiceDialogPhone: Story = { ...s(dana, phone, { initialDialog: "service", initialServicePick: { key: "repair", other: "" } }), name: "Change service, a wrong service being changed, phone" }

/** After the change: built by the store, so the service line is the new service with its catalogue price, the notes and the other lines stay, and Notes and history says "Service changed from Larger sprinkler repair to Sprinkler repair". */
const afterChange = (): QuoteJob => {
  const store = createQuoteStore([dana()])
  store.addLine("q-dana", { name: "Zone 3 line", amount: 0 }, "2026-11-18T17:00:00Z")
  store.changeService("q-dana", { name: "Sprinkler repair", price: 145, at: "2026-11-18T17:30:00Z" })
  return structuredClone(store.getSnapshot()["q-dana"]!)
}
export const ServiceChanged: Story = { ...s(afterChange, laptop), name: "Service changed" }
export const ServiceChangedPhone: Story = { ...s(afterChange, phone), name: "Service changed, phone" }

/** The path: More, Change service, choose another service, confirm; the title line, the service line and the history follow, and a quote that is out has no Change service. */
export const ChangeServiceTest: Story = {
  name: "Change service (test)",
  tags: HIDDEN,
  ...s(dana, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "More" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "Change service" }))
    const dialog = within(await body.findByRole("dialog"))
    await expect(dialog.getByRole("button", { name: "Change service" })).toBeDisabled()
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "What is this for?" }), "repair")
    await userEvent.click(dialog.getByRole("button", { name: "Change service" }))
    await expect((await c.findAllByText("Service changed from Larger sprinkler repair to Sprinkler repair")).length).toBeGreaterThan(0)
    await expect(await c.findByRole("textbox", { name: "Price for Sprinkler repair" })).toHaveValue("145")
  },
}

/** Revise: the quote that was out is Replaced and listed under Earlier quotes in the editor, the deposit starts where it was, and the lines are open again. */
export const Revising: Story = { ...s(revising, laptop), name: "Revising" }
export const RevisingPhone: Story = { ...s(revising, phone), name: "Revising, phone" }

/** An installation booked online as a design visit: the visit is on the job and done, the price reads "Set at the visit", the job needs a quote, and Ryan sends the quote from the job once he has priced the line. The Quote section is first. */
const install = (): QuoteJob => structuredClone(DESIGN_VISIT_JOB)
export const InstallAfterDesignVisit: Story = { ...s(install, laptop), name: "Installation after its design visit" }
export const InstallAfterDesignVisitPhone: Story = { ...s(install, phone), name: "Installation after its design visit, phone" }

/** Create job on a priced service (a $145 repair): the job is ready to schedule, Unscheduled, with no quote. The customer's words are its first note and it reads "Created from a request". */
const direct = (): QuoteJob => jobFromRequest({ jobId: "q-tom", requestId: "rq-tom", customerId: "other-tom-ellis", customer: "Tom Ellis", first: "Tom", phone: "(970) 555-0133", email: "tom.ellis@example.com", contact: "text", service: "Sprinkler repair", street: "64 Hollis Ct", town: "Louisville", words: "Two heads in the side yard are spraying the fence. Hoping someone can come this week.", receivedAt: "2026-11-17T15:00:00Z", at: QUOTES_NOW, price: 145, quote: false })
export const CreatedFromARequest: Story = { ...s(direct, laptop), name: "Created from a request, ready to schedule" }

/** Priced lines, no deposit: Send a quote is the one primary action and nothing is said to be missing. */
export const ReadyToSend: Story = { ...s(priced, laptop), name: "Ready to send" }
export const ReadyToSendPhone: Story = { ...s(priced, phone), name: "Ready to send, phone" }

/** Add a line: a name, an optional description and a price. */
export const AddALine: Story = { ...s(dana, laptop, { initialDialog: { line: "new" } }), name: "Add a line" }

/** Send a quote, no deposit: the channel is the customer's contact preference, the sentence names the effect, the caret sends without notifying. */
export const SendNoDeposit: Story = { ...s(priced, laptop, { initialDialog: "send" }), name: "Send dialog, no deposit" }
export const SendNoDepositPhone: Story = { ...s(priced, phone, { initialDialog: "send" }), name: "Send dialog, no deposit, phone" }

/** A deposit set in the card in dollars: the dialog's sentence says the customer pays it when approving. The dialog has no deposit control of its own. */
export const SendDollars: Story = { ...s(() => withDeposit("dollars", "150"), laptop, { initialDialog: "send" }), name: "Send dialog, dollars" }
export const SendDollarsPhone: Story = { ...s(() => withDeposit("dollars", "150"), phone, { initialDialog: "send" }), name: "Send dialog, dollars, phone" }

/** A deposit set as a percent: the dialog names the dollars it comes to, frozen when the quote is sent. */
export const SendPercent: Story = { ...s(() => withDeposit("percent", "25"), laptop, { initialDialog: "send" }), name: "Send dialog, percent" }

/** Sent with a $300 deposit: the job reads Quote sent, the quote is Sent, the lines are locked. The primary is Send a quote reminder; Mark approved and Revise sit beside it. */
export const QuoteSent: Story = { ...s(beth, laptop), name: "Quote sent, with a deposit" }
export const QuoteSentPhone: Story = { ...s(beth, phone), name: "Quote sent, with a deposit, phone" }

/** Sent with no deposit and reminded once. */
export const QuoteSentReminded: Story = { ...s(greg, laptop), name: "Quote sent, no deposit, reminded" }

/** A reminder is the notification, so it has no without-notifying caret: text, email or both, a fixed preview and one optional line. */
export const Reminder: Story = { ...s(beth, laptop, { initialDialog: "remind" }), name: "Quote reminder" }

/** Revise marks the quote Replaced and returns the job to Needs a quote. */
export const ReviseDialog: Story = { ...s(greg, laptop, { initialDialog: "revise" }), name: "Revise" }

/** Mark approved by hand with a deposit: Ryan says how it was paid, a receipt goes out, and he chooses whether to tell the customer. */
export const ApproveByHand: Story = { ...s(beth, laptop, { initialDialog: "approve" }), name: "Mark approved by hand" }

/** No deposit was set: the dialog has no payment question. */
export const ApproveByHandNoDeposit: Story = { ...s(greg, laptop, { initialDialog: "approve" }), name: "Mark approved by hand, no deposit" }

/** The customer approved and the card deposit went through: Open and ready to schedule, with Billing, the payment and the invoice note. The lines are now Ryan's to change: each has Edit and the card has Add a line (while a quote is out and waiting they stay locked). */
export const ApprovedByCustomer: Story = { ...s(approvedByCard, laptop), name: "Approved, deposit paid by card" }
export const ApprovedByCustomerPhone: Story = { ...s(approvedByCard, phone), name: "Approved, deposit paid by card, phone" }

// ---------------------------------------------------------------------------------------------------------------------- a price change after approval
// Hannah, Nov 20 2026: after the customer approved, Ryan edits the lines and tells the customer. There is no second approval and no change-order quote.

/** Beth's approved job after Ryan raised the roofline from $900 to $1,200: built by the store, so the history is the store's own line ("Price changed from $1,200 to $1,500") and the total follows the lines. `told` adds the step after. */
const afterPriceChange = (told?: "email" | "none"): QuoteJob => {
  const store = createQuoteStore([approvedByCard()])
  store.updateLine("q-beth", "b1", { amount: 1200 }, "2026-11-18T18:20:00Z")
  if (told) store.tellPrice("q-beth", { via: told, at: "2026-11-18T18:22:00Z" })
  return structuredClone(store.getSnapshot()["q-beth"]!)
}

/** Editing an approved job's line: the same Edit dialog as before approval, now saying the customer approved and that the change moves the total. A line can be canceled here, never removed. */
export const ApprovedEditLine: Story = { ...s(approvedByCard, laptop, { initialDialog: { line: "b1" } }), name: "Approved, changing a line" }
export const ApprovedEditLinePhone: Story = { ...s(approvedByCard, phone, { initialDialog: { line: "b1" } }), name: "Approved, changing a line, phone" }

/** Saving a price that moves the total opens Tell the customer: the new total and the old one, Text, Email or Both from the contact preference, a preview of exactly what the customer reads (only the job, the new total and the old one), and a caret that keeps the change without telling. */
export const TellTheCustomer: Story = { ...s(() => afterPriceChange(), laptop, { initialTell: { from: 1200, to: 1500 } }), name: "Price changed, tell the customer" }
export const TellTheCustomerPhone: Story = { ...s(() => afterPriceChange(), phone, { initialTell: { from: 1200, to: 1500 } }), name: "Price changed, tell the customer, phone" }

/** After: the lines and the total are $1,500 (the Total tile says Was $1,200), Billing shows the new total with the $300 deposit credited, Notes and history records the change and the telling. */
export const PriceChangedAndTold: Story = { ...s(() => afterPriceChange("email"), laptop), name: "Price changed and told" }
export const PriceChangedAndToldPhone: Story = { ...s(() => afterPriceChange("email"), phone), name: "Price changed and told, phone" }

/** Ryan closed the dialog without choosing: the change is recorded, and a quiet line under the total says the customer has not been told, with Tell Beth to open the dialog again. */
export const PriceChangedNotTold: Story = { ...s(() => afterPriceChange(), laptop), name: "Price changed, not told yet" }

/** A canceled line is struck through and out of the total; the total moved, so the same step opens. */
const canceledLine = (): QuoteJob => {
  const store = createQuoteStore([approvedByCard()])
  store.cancelLine("q-beth", "b2", "2026-11-18T18:20:00Z")
  return structuredClone(store.getSnapshot()["q-beth"]!)
}
export const ApprovedLineCanceled: Story = { ...s(canceledLine, laptop), name: "A line canceled after approval" }

/** The final invoice of that job: the new total on its lines, the $300 deposit credited as its own line, so $1,200 is unpaid. */
export const FinalInvoiceAfterChange: Story = {
  name: "Final invoice after a price change",
  args,
  globals: laptop,
  render: () => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <InvoicePage invoice={finalInvoiceOf(afterPriceChange("email"), { number: "INV-2026-0045", sentOn: "2026-11-24", dueOn: "2026-12-08" })} />
    </AdminShell>
  ),
}
export const FinalInvoiceAfterChangePhone: Story = { ...FinalInvoiceAfterChange, name: "Final invoice after a price change, phone", globals: phone }

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

// ---------------------------------------------------------------------------------------------------------------------- the Quotes list

const ALL = [...QUOTE_JOB_FIXTURES, ...QUOTE_HISTORY_FIXTURES]
const list = (jobs: readonly QuoteJob[], globals: typeof laptop, o: { initialTab?: QuoteTab } = {}): Story => ({
  args,
  globals,
  render: () => (
    <QuotesShell jobs={jobs}>
      <QuotesList jobs={jobs} now={QUOTES_NOW} {...o} />
    </QuotesShell>
  ),
})

/** Quotes as a pipeline, a rail item after Jobs with the count of quotes still waiting (2). Five tiles by stage (Open pipeline, Waiting for an answer with the age of the oldest, Approved this month, Declined this month, Close rate), each one that has something also the tab it sets; the status tabs carry live counts; every quote is a row, the two Sent ones first with Remind as the Next action, then Approved, Declined and Replaced with Open. */
export const List: Story = { ...list(ALL, laptop), name: "List" }
export const ListPhone: Story = { ...list(ALL, phone), name: "List, phone" }
/** No quotes yet: the band reads Nothing waiting and the table says how one gets made. */
export const ListEmpty: Story = { ...list([], laptop), name: "List empty" }
/** A tab with no quotes in it (nothing is approved yet): "No quotes match." Close rate is not shown either, because nothing is decided. */
export const ListNoMatch: Story = { ...list(QUOTE_JOB_FIXTURES, laptop, { initialTab: "approved" }), name: "List no match" }

/** The Sent tab, as a tile or Home's Quote waiting row opens it: only the two quotes still waiting, each with Remind. */
export const ListSentTab: Story = { ...list(ALL, laptop, { initialTab: "sent" }), name: "List, Sent tab" }
export const ListSentTabPhone: Story = { ...list(ALL, phone, { initialTab: "sent" }), name: "List, Sent tab, phone" }

/** Cmd+K has a Quotes group: type a quote number or a customer's name and the quote opens its job at the Quote section. */
export const Search: Story = {
  name: "Cmd+K finds a quote",
  args,
  globals: laptop,
  render: () => (
    <QuotesShell jobs={ALL} defaultSearchOpen defaultSearchQuery="Beth">
      <QuotesList jobs={ALL} now={QUOTES_NOW} />
    </QuotesShell>
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
    const card = within(canvasElement.querySelector<HTMLElement>("#quote-h")!.closest("section")!)
    // the deposit is set in the card, and what is wrong with it is the one line beside Send a quote
    await userEvent.click(await card.findByRole("radio", { name: "Dollars" }))
    await userEvent.type(await card.findByRole("textbox", { name: "Deposit in dollars" }), "900")
    await expect(await card.findByText(/cannot be more than the total/)).toBeInTheDocument()
    await expect(card.getByRole("button", { name: "Send a quote" })).toBeDisabled()
    await userEvent.clear(card.getByRole("textbox", { name: "Deposit in dollars" }))
    await userEvent.type(card.getByRole("textbox", { name: "Deposit in dollars" }), "150")
    await userEvent.click(card.getByRole("button", { name: "Send a quote" }))
    const body = within(document.body)
    await userEvent.click(await body.findByRole("button", { name: "Send the quote" }))
    await expect((await c.findAllByText("Quote sent")).length).toBeGreaterThan(0)
    await expect(await c.findByText(/Locked while quote/)).toBeInTheDocument()
    await expect(await c.findByRole("button", { name: "Send a quote reminder" })).toBeInTheDocument()
  },
}

/** Typing a price in the line's row is the edit: the one line saying what is missing goes away, the step moves on and the total follows. */
export const PriceInCardTest: Story = {
  name: "Price in the card (test)",
  tags: HIDDEN,
  ...s(dana, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const card = within(canvasElement.querySelector<HTMLElement>("#quote-h")!.closest("section")!)
    await expect(card.getByText("Add a price to a line to send.")).toBeInTheDocument()
    await expect(card.getByRole("button", { name: "Send a quote" })).toBeDisabled()
    await userEvent.type(card.getByRole("textbox", { name: "Price for Larger sprinkler repair" }), "380")
    await expect(card.queryByText("Add a price to a line to send.")).toBeNull()
    await expect(card.getByRole("button", { name: "Send a quote" })).toBeEnabled()
    await expect((await c.findAllByText("$380")).length).toBeGreaterThan(0)
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

/** The path: change the roofline's price on the approved job, the Tell the customer dialog opens with $1,500 and $1,200, telling Beth records it, and the page follows the lines. */
export const PriceChangeTest: Story = {
  name: "Price change after approval (test)",
  tags: HIDDEN,
  ...s(approvedByCard, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "Edit Roofline lights" }))
    const price = await body.findByRole("textbox", { name: "Price in dollars" })
    await userEvent.clear(price)
    await userEvent.type(price, "1200")
    await userEvent.click(await body.findByRole("button", { name: "Save the line" }))
    const dialog = await body.findByRole("dialog", { name: /Tell Beth the new total/ })
    await expect(within(dialog).getByText("$1,500")).toBeInTheDocument()
    await expect(within(dialog).getByText("$1,200")).toBeInTheDocument()
    await expect(within(dialog).getByText(/changed from \$1,200 to \$1,500/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Tell Beth" }))
    await expect(await c.findByText("Price changed from $1,200 to $1,500")).toBeInTheDocument()
    await expect(await c.findByText(/Told Beth the new total, \$1,500, by email/)).toBeInTheDocument()
    await expect(await c.findByText("$1,200 unpaid.")).toBeInTheDocument()
    await expect(await c.findByText(/The invoice will show the new total, \$1,500 and the \$300 deposit as already paid/)).toBeInTheDocument()
    await expect(c.queryByText(/has not been told/)).toBeNull()
  },
}

/** Closing the dialog leaves the change recorded and untold: Tell Beth under the total opens it again, and the caret keeps the change without telling. */
export const PriceChangeQuietTest: Story = {
  name: "Price change, not told (test)",
  tags: HIDDEN,
  ...s(approvedByCard, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "Edit Porch columns" }))
    await userEvent.click(await body.findByRole("button", { name: "Cancel this line" }))
    const first = await body.findByRole("dialog", { name: /Tell Beth the new total/ })
    await expect(within(first).getByText(/changed from \$1,200 to \$900/)).toBeInTheDocument()
    await userEvent.click(within(first).getByRole("button", { name: "Cancel" }))
    await expect(await c.findByText(/Beth has not been told the new total, \$900/)).toBeInTheDocument()
    await userEvent.click(await c.findByRole("button", { name: "Tell Beth" }))
    const again = await body.findByRole("dialog", { name: /Tell Beth the new total/ })
    await userEvent.click(within(again).getByRole("button", { name: "More ways" }))
    await userEvent.click(await body.findByRole("menuitem", { name: /Keep the change without telling Beth/ }))
    await expect(await c.findByText(/Kept the new total, \$900, without notifying Beth/)).toBeInTheDocument()
    await expect(c.queryByText(/has not been told/)).toBeNull()
  },
}
