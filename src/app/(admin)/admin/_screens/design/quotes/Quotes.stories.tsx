import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { DesignShell } from "../DesignShell"
import { InvoicePage } from "../InvoicePanel"
import { WALK_DATA } from "../walkthrough/walk-new-job"
import { ApprovedJobPage, type ApprovedJobPageProps } from "./ApprovedJobPage"
import { NewQuoteSheet } from "./NewQuoteSheet"
import { QuotePage, type QuotePageProps } from "./QuotePage"
import { QuotesList } from "./QuotesList"
import { finalInvoiceOf } from "./price-change-invoice"
import type { QuoteTab } from "./quote-list-model"
import { QuotesShell } from "./QuotesShell"
import { ALL_QUOTE_FIXTURES, DESIGN_VISIT_QUOTE, HISTORY_QUOTES, QUOTE_FIXTURES, quoteByHand } from "./quote-fixtures"
import { QUOTES_NOW } from "./quote-model"
import { createQuoteStore, type QuoteStore } from "./quote-store"

// A quote is its own record (Hannah, Nov 22 2026): it has its own page, built like the invoice page, and its own list. Ryan prices a Draft in its rows and sends it with an optional deposit;
// the customer approves or declines; and the job is created only when the quote is approved, with the quote's frozen lines copied once. Each story says what Ryan sees. Pure screens over
// fixtures: nothing is wired and nothing is sent.

const meta = {
  title: "Admin/Quotes",
  component: QuotePage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A quote's own page in its states: Draft (one Quote card: price the lines in their rows, an optional deposit set in the card (none by default, dollars or percent, never above the total), then Send a quote), the send dialog with its without-notifying caret, Sent (Remind, Revise, Mark approved by hand, lines locked), Approved (\"Job created\" with the job's chip), Declined, Replaced and Archived (which archives the request it came from). The job page made from an approved quote, the Quotes list and the New quote sheet follow. The clickable version is Admin / Walkthrough (clickable): send a quote from a request, approve it, and the job appears.",
      },
    },
  },
} satisfies Meta<typeof QuotePage>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const HIDDEN = ["!dev", "!autodocs"]

const DANA = "Q-2026-0004"
const BETH = "Q-2026-0007"
const GREG = "Q-2026-0008"
const NORA_JOB = "qj-0005"

/** A story's own store, so one story that sends a quote never changes another. */
function QuoteStage({ make, id, ...rest }: { make: () => QuoteStore; id: string } & Omit<QuotePageProps, "store" | "quoteId">) {
  const [store] = useState(make)
  return (
    <DesignShell current="quotes">
      <QuotePage store={store} quoteId={id} now={QUOTES_NOW} {...rest} />
    </DesignShell>
  )
}

function JobStage({ make, id, ...rest }: { make: () => QuoteStore; id: string } & Omit<ApprovedJobPageProps, "store" | "jobId">) {
  const [store] = useState(make)
  return (
    <DesignShell current="jobs">
      <ApprovedJobPage store={store} jobId={id} now={QUOTES_NOW} {...rest} />
    </DesignShell>
  )
}

const fresh = () => createQuoteStore()
/** Dana's Draft with two lines priced, and the deposit when one is given. */
const priced = (deposit?: { mode: "dollars" | "percent"; value: string }) => () => {
  const s = fresh()
  s.updateLine(DANA, "d1", { name: "Zone 3 line", description: "A new line for zone 3 by the driveway.", amount: 380 })
  s.addLine(DANA, { name: "Sprinkler repair visit", amount: 145 })
  if (deposit) s.setDeposit(DANA, deposit)
  return s
}
const withQuantity = () => {
  const s = priced()()
  s.addLine(DANA, { name: "Valve box", amount: 60, quantity: 3 })
  return s
}
/** The quote after Ryan pressed Send: built by the store, so the lines and the deposit are frozen by the store's own action. */
const justSent = () => {
  const s = priced({ mode: "dollars", value: "150" })()
  s.send(DANA, { via: "text", deposit: { amount: 150 }, at: QUOTES_NOW })
  return s
}
/** Dana's Draft after Change service: the service line takes the new service's name and catalogue price, the notes and the other lines stay. */
const serviceChanged = () => {
  const s = fresh()
  s.addLine(DANA, { name: "Zone 3 line", amount: 0 })
  s.changeService(DANA, { name: "Sprinkler repair", price: 145, at: "2026-11-18T17:30:00Z" })
  return s
}
/** Beth's quote approved by the customer with the $300 deposit paid by card: the job is made now. */
const approvedByCard = () => {
  const s = fresh()
  s.approve(BETH, { by: "customer", deposit: { how: "card" }, at: "2026-11-12T16:30:00Z" })
  return s
}
const approvedByHand = () => {
  const s = fresh()
  s.approve(GREG, { by: "Ryan", at: "2026-11-17T20:00:00Z" })
  return s
}
const declined = () => {
  const s = fresh()
  s.decline(GREG, "2026-11-17T15:00:00Z")
  return s
}
const archivedDraft = () => {
  const s = fresh()
  s.archive(DANA, "No answer", QUOTES_NOW)
  return s
}
/** A quote made by hand, with no request: Ryan's own words are the first line of its history. */
const byHand = () => {
  const s = fresh()
  s.add(quoteByHand({ id: "Q-2026-0009", customerId: "andrea", customer: "Andrea Dalton", first: "Andrea", phone: "(970) 555-0123", email: "andrea.dalton@example.com", contact: "text", service: "Sprinkler repair", street: "480 Briggs St", town: "Erie", at: QUOTES_NOW, price: 145 }))
  return s
}
/** Beth's job after Ryan raised the roofline from $900 to $1,200: built by the store, so the history is the store's own line ("Price changed from $1,200 to $1,500") and the total follows the lines. `told` adds the step after. */
const afterPriceChange = (told?: "email" | "none") => () => {
  const s = approvedByCard()
  s.updateJobLine("qj-0007", "b1", { amount: 1200 }, "2026-11-18T18:20:00Z")
  if (told) s.tellPrice("qj-0007", { via: told, at: "2026-11-18T18:22:00Z" })
  return s
}
const canceledLine = () => {
  const s = approvedByCard()
  s.cancelJobLine("qj-0007", "b2", "2026-11-18T18:20:00Z")
  return s
}

const args = { store: createQuoteStore([]), quoteId: "x" }
const q = (make: () => QuoteStore, id: string, globals: typeof laptop, extra: Omit<QuotePageProps, "store" | "quoteId"> = {}): Story => ({ args, globals, render: () => <QuoteStage make={make} id={id} {...extra} /> })
const j = (make: () => QuoteStore, id: string, globals: typeof laptop, extra: Omit<ApprovedJobPageProps, "store" | "jobId"> = {}): Story => ({ args, globals, render: () => <JobStage make={make} id={id} {...extra} /> })

// ---------------------------------------------------------------------------------------------------------------------- the Quote editor (a Draft)
// Hannah, Nov 20 2026: "Create a quote here. What's the flow?" A Draft leads with ONE Quote card: Ryan prices the lines in their rows, sets an optional deposit and presses Send a quote.
// The band holds the quote's own facts (Created, For, Where, Contact) so no tile repeats the card; no job exists yet.

/** Just made from a request, nothing priced: "1 Price  2 Send  3 They approve", what the customer asked, the one line (the service, never the customer's words) with an empty price box, and Send a quote off with one line saying what is missing. */
export const Draft: Story = { ...q(fresh, DANA, laptop), name: "Draft, nothing priced" }
export const DraftPhone: Story = { ...q(fresh, DANA, phone), name: "Draft, nothing priced, phone" }

/** One line priced: step 2 and Send a quote is on. */
export const ReadyToSend: Story = { ...q(priced(), DANA, laptop), name: "Draft, ready to send" }
export const ReadyToSendPhone: Story = { ...q(priced(), DANA, phone), name: "Draft, ready to send, phone" }

/** The deposit is optional and none by default; typed as dollars it shows what it comes to and is frozen as dollars when sent. */
export const DepositDollars: Story = { ...q(priced({ mode: "dollars", value: "150" }), DANA, laptop), name: "Deposit in dollars" }
export const DepositDollarsPhone: Story = { ...q(priced({ mode: "dollars", value: "150" }), DANA, phone), name: "Deposit in dollars, phone" }
export const DepositPercent: Story = { ...q(priced({ mode: "percent", value: "25" }), DANA, laptop), name: "Deposit in percent" }
export const DepositPercentPhone: Story = { ...q(priced({ mode: "percent", value: "25" }), DANA, phone), name: "Deposit in percent, phone" }
/** A deposit above the total: one quiet line beside Send a quote says so, and Send is off. */
export const DepositTooHigh: Story = { ...q(priced({ mode: "dollars", value: "900" }), DANA, laptop), name: "Deposit above the total" }
/** A quantity is shown only when it is more than one. */
export const QuantityMoreThanOne: Story = { ...q(withQuantity, DANA, laptop), name: "A quantity of three" }
export const AddALine: Story = { ...q(fresh, DANA, laptop, { initialDialog: { line: "new" } }), name: "Add a line" }

/** A quote made by hand with no request (New quote): the same Draft, with the service's catalogue price on the line and nothing under "What they asked". */
export const MadeByHand: Story = { ...q(byHand, "Q-2026-0009", laptop), name: "Draft, made by hand" }
export const MadeByHandPhone: Story = { ...q(byHand, "Q-2026-0009", phone), name: "Draft, made by hand, phone" }

/** An installation booked online as a design visit: the visit is on the quote and done, and Ryan sends the quote once he has priced the line. */
const install = () => createQuoteStore([DESIGN_VISIT_QUOTE, ...QUOTE_FIXTURES, ...HISTORY_QUOTES], [])
export const InstallAfterDesignVisit: Story = { ...q(install, DESIGN_VISIT_QUOTE.id, laptop), name: "Installation after its design visit" }
export const InstallAfterDesignVisitPhone: Story = { ...q(install, DESIGN_VISIT_QUOTE.id, phone), name: "Installation after its design visit, phone" }

// ---------------------------------------------------------------------------------------------------------------------- Change service (on the Draft)

export const ChangeServiceCurrent: Story = { ...q(fresh, DANA, laptop, { initialDialog: "service" }), name: "Change service, current service" }
/** The picker with a different service chosen: the effect is stated before the button does it. */
export const ChangeServiceDialog: Story = { ...q(fresh, DANA, laptop, { initialDialog: "service", initialServicePick: { key: "repair", other: "" } }), name: "Change service, a wrong service being changed" }
export const ChangeServiceDialogPhone: Story = { ...q(fresh, DANA, phone, { initialDialog: "service", initialServicePick: { key: "repair", other: "" } }), name: "Change service, a wrong service being changed, phone" }
/** After the change: the service line is the new service with its catalogue price, the notes and the other lines stay, and Notes and history says "Service changed from Larger sprinkler repair to Sprinkler repair". */
export const ServiceChanged: Story = { ...q(serviceChanged, DANA, laptop), name: "Service changed" }
export const ServiceChangedPhone: Story = { ...q(serviceChanged, DANA, phone), name: "Service changed, phone" }

// ---------------------------------------------------------------------------------------------------------------------- Send a quote

export const SendNoDeposit: Story = { ...q(priced(), DANA, laptop, { initialDialog: "send" }), name: "Send dialog, no deposit" }
export const SendNoDepositPhone: Story = { ...q(priced(), DANA, phone, { initialDialog: "send" }), name: "Send dialog, no deposit, phone" }
export const SendDollars: Story = { ...q(priced({ mode: "dollars", value: "150" }), DANA, laptop, { initialDialog: "send" }), name: "Send dialog, dollars" }
export const SendDollarsPhone: Story = { ...q(priced({ mode: "dollars", value: "150" }), DANA, phone, { initialDialog: "send" }), name: "Send dialog, dollars, phone" }
export const SendPercent: Story = { ...q(priced({ mode: "percent", value: "25" }), DANA, laptop, { initialDialog: "send" }), name: "Send dialog, percent" }

/** After send: the quote is Sent, its lines and deposit are frozen and locked, and the Quote card says how it went. No job exists. */
export const AfterSend: Story = { ...q(justSent, DANA, laptop), name: "After send" }
export const AfterSendPhone: Story = { ...q(justSent, DANA, phone), name: "After send, phone" }

/** A quote that is out, with a deposit, sent nine days ago. */
export const QuoteSent: Story = { ...q(fresh, BETH, laptop), name: "Sent, with a deposit" }
export const QuoteSentPhone: Story = { ...q(fresh, BETH, phone), name: "Sent, with a deposit, phone" }
/** Greg's: no deposit, sent four days ago and reminded once. */
export const QuoteSentReminded: Story = { ...q(fresh, GREG, laptop), name: "Sent, no deposit, reminded" }
export const Reminder: Story = { ...q(fresh, BETH, laptop, { initialDialog: "remind" }), name: "Quote reminder" }
export const ReviseDialog: Story = { ...q(fresh, GREG, laptop, { initialDialog: "revise" }), name: "Revise" }

/** A revision: the quote that was out is Replaced and this is the new Draft made from it, with its lines, and the $300 deposit (25%) where the next quote starts. */
const revision = () => {
  const s = fresh()
  const next = s.revise(BETH, "2026-11-17T18:00:00Z")
  s.updateLine(next, "b1", { amount: 1000 })
  return s
}
export const Revision: Story = { ...q(revision, "Q-2026-0009", laptop), name: "A revision, Draft" }
export const RevisionPhone: Story = { ...q(revision, "Q-2026-0009", phone), name: "A revision, Draft, phone" }
/** The replaced quote: its link and page say it was replaced and point to the new one. */
export const Replaced: Story = { ...q(revision, BETH, laptop), name: "Replaced" }

// ---------------------------------------------------------------------------------------------------------------------- approval makes the job

export const ApproveByHand: Story = { ...q(fresh, BETH, laptop, { initialDialog: "approve" }), name: "Mark approved by hand" }
export const ApproveByHandNoDeposit: Story = { ...q(fresh, GREG, laptop, { initialDialog: "approve" }), name: "Mark approved by hand, no deposit" }
/** Approved by the customer with the deposit paid by card: the quote says "Job created" with the job's chip, and the deposit is on the job. */
export const ApprovedByCustomer: Story = { ...q(approvedByCard, BETH, laptop), name: "Approved, job created" }
export const ApprovedByCustomerPhone: Story = { ...q(approvedByCard, BETH, phone), name: "Approved, job created, phone" }
/** Ryan marked it approved after a call; no deposit. */
export const ApprovedByHand: Story = { ...q(approvedByHand, GREG, laptop), name: "Approved by hand, no deposit" }
/** The customer declined: no job was made, and the quote can be archived. */
export const Declined: Story = { ...q(declined, GREG, laptop), name: "Declined" }

// ---------------------------------------------------------------------------------------------------------------------- Archive

/** Archive asks why and names the effect on the request the quote came from. */
export const ArchiveDialog: Story = { ...q(fresh, DANA, laptop, { initialDialog: "archive" }), name: "Archive" }
export const ArchiveDialogPhone: Story = { ...q(fresh, DANA, phone, { initialDialog: "archive" }), name: "Archive, phone" }
/** After archiving: the quote reads Archived with its reason, and says the request is archived too. */
export const Archived: Story = { ...q(archivedDraft, DANA, laptop), name: "Archived" }

// ---------------------------------------------------------------------------------------------------------------------- the job made from an approved quote
// Hannah, Nov 22 2026: the job has no quote state. It says which quote it came from, holds the approved lines, and a price change after approval is made here.

/** Nora's job, from her approved quote Q-2026-0005 with the $200 deposit paid by card: ready to schedule, "From quote" with its chip, the approved lines and Billing. */
export const JobFromQuote: Story = { ...j(fresh, NORA_JOB, laptop), name: "Job from an approved quote" }
export const JobFromQuotePhone: Story = { ...j(fresh, NORA_JOB, phone), name: "Job from an approved quote, phone" }
export const JobFromQuoteNoDeposit: Story = { ...j(approvedByHand, "qj-0008", laptop), name: "Job from a quote approved by hand, no deposit" }

/** Editing a line of the job: the dialog says the customer approved and that the change moves the total. A line can be canceled here, never removed. */
export const ApprovedEditLine: Story = { ...j(approvedByCard, "qj-0007", laptop, { initialDialog: { line: "b1" } }), name: "Job, changing a line" }
export const ApprovedEditLinePhone: Story = { ...j(approvedByCard, "qj-0007", phone, { initialDialog: { line: "b1" } }), name: "Job, changing a line, phone" }
/** Saving a price that moves the total opens Tell the customer: the new total and the old one, Text, Email or Both from the contact preference, a preview of exactly what the customer reads, and a caret that keeps the change without telling. */
export const TellTheCustomer: Story = { ...j(afterPriceChange(), "qj-0007", laptop, { initialTell: { from: 1200, to: 1500 } }), name: "Price changed, tell the customer" }
export const TellTheCustomerPhone: Story = { ...j(afterPriceChange(), "qj-0007", phone, { initialTell: { from: 1200, to: 1500 } }), name: "Price changed, tell the customer, phone" }
/** After: the total is $1,500 (the band says Was $1,200), Billing shows the new total with the $300 deposit credited, Notes and history records the change and the telling. */
export const PriceChangedAndTold: Story = { ...j(afterPriceChange("email"), "qj-0007", laptop), name: "Price changed and told" }
export const PriceChangedAndToldPhone: Story = { ...j(afterPriceChange("email"), "qj-0007", phone), name: "Price changed and told, phone" }
/** Ryan closed the dialog without choosing: the change is recorded, and a quiet line under the total says the customer has not been told, with Tell Beth to open the dialog again. */
export const PriceChangedNotTold: Story = { ...j(afterPriceChange(), "qj-0007", laptop), name: "Price changed, not told yet" }
/** A canceled line is struck through and out of the total. */
export const ApprovedLineCanceled: Story = { ...j(canceledLine, "qj-0007", laptop), name: "A line canceled after approval" }
/** Cancel after a deposit is paid is blocked until Ryan refunds it himself. */
export const CancelBlocked: Story = { ...j(approvedByCard, "qj-0007", laptop, { initialDialog: "cancel" }), name: "Cancel is blocked by the deposit" }
/** Refund is Ryan's own decision: it states the amount and what the customer is told. */
export const RefundDeposit: Story = { ...j(approvedByCard, "qj-0007", laptop, { initialDialog: "refund" }), name: "Refund the deposit" }

/** The final invoice of that job: the new total on its lines, the $300 deposit credited as its own line, so $1,200 is unpaid. */
export const FinalInvoiceAfterChange: Story = {
  name: "Final invoice after a price change",
  args,
  globals: laptop,
  render: () => (
    <DesignShell current="invoices">
      <InvoicePage invoice={finalInvoiceOf(afterPriceChange("email")().getSnapshot().jobs["qj-0007"]!, { number: "INV-2026-0045", sentOn: "2026-11-24", dueOn: "2026-12-08" })} />
    </DesignShell>
  ),
}
export const FinalInvoiceAfterChangePhone: Story = { ...FinalInvoiceAfterChange, name: "Final invoice after a price change, phone", globals: phone }

// ---------------------------------------------------------------------------------------------------------------------- the Quotes list

const ALL = ALL_QUOTE_FIXTURES
const list = (quotes: readonly (typeof ALL)[number][], globals: typeof laptop, o: { initialTab?: QuoteTab } = {}): Story => ({
  args,
  globals,
  render: () => (
    <QuotesShell quotes={quotes}>
      <QuotesList quotes={quotes} now={QUOTES_NOW} onNewQuote={() => undefined} {...o} />
    </QuotesShell>
  ),
})

/** Quotes as a pipeline, a rail item after Jobs with the count of quotes still waiting (2). Five tiles by stage (Open pipeline, Waiting for an answer with the age of the oldest, Approved this month, Declined this month, Close rate), each one that has something also the tab it sets; the status tabs carry live counts; every quote is a row, the two Sent ones first with Remind as the Next action, then the Drafts, Approved, Declined, Replaced. New quote is the page's one filled button. */
export const List: Story = { ...list(ALL, laptop), name: "List" }
export const ListPhone: Story = { ...list(ALL, phone), name: "List, phone" }
/** No quotes yet: the band reads Nothing waiting and the table says how one gets made. */
export const ListEmpty: Story = { ...list([], laptop), name: "List empty" }
/** A tab with no quotes in it (nothing is approved yet): "No quotes match." Close rate is not shown either, because nothing is decided. */
export const ListNoMatch: Story = { ...list(QUOTE_FIXTURES, laptop, { initialTab: "approved" }), name: "List no match" }
/** The Sent tab, as a tile or Home's Quote waiting row opens it: only the two quotes still waiting, each with Remind. */
export const ListSentTab: Story = { ...list(ALL, laptop, { initialTab: "sent" }), name: "List, Sent tab" }
export const ListSentTabPhone: Story = { ...list(ALL, phone, { initialTab: "sent" }), name: "List, Sent tab, phone" }
export const ListDraftTab: Story = { ...list(ALL, laptop, { initialTab: "draft" }), name: "List, Draft tab" }

/** Cmd+K has a Quotes group: type a quote number or a customer's name and the quote opens its own page. */
export const Search: Story = {
  name: "Cmd+K finds a quote",
  args,
  globals: laptop,
  render: () => (
    <QuotesShell quotes={ALL} defaultSearchOpen defaultSearchQuery="Beth">
      <QuotesList quotes={ALL} now={QUOTES_NOW} />
    </QuotesShell>
  ),
}

/** Cmd+K by number (Hannah, Nov 25 2026): the quote's number, whole or just its last digits, finds the quote, titled with the number as its page is. */
export const SearchByNumber: Story = {
  name: "Cmd+K finds a quote by its number",
  args,
  globals: laptop,
  render: () => (
    <QuotesShell quotes={ALL} defaultSearchOpen defaultSearchQuery="Q-2026-0005">
      <QuotesList quotes={ALL} now={QUOTES_NOW} />
    </QuotesShell>
  ),
  play: async () => {
    const box = within(await within(document.body).findByRole("dialog", { name: "Search" }))
    const hit = await box.findByRole("option", { name: /Q-2026-0005/ })
    await expect(hit).toHaveAttribute("data-value", "quote-Q-2026-0005")
    await expect(box.getAllByRole("option")).toHaveLength(1)
  },
}
export const SearchByNumberPhone: Story = { ...SearchByNumber, name: "Cmd+K finds a quote by its number, phone", globals: phone }

// ---------------------------------------------------------------------------------------------------------------------- New quote

/** The New quote sheet: the customer (search, or a new one), and the required "What is this for?" picker ending in Something else. The button is off until both are chosen, and one quiet line says what is missing. */
export const NewQuote: Story = {
  name: "New quote",
  args,
  globals: laptop,
  render: () => <NewQuoteSheet data={WALK_DATA} open onOpenChange={() => undefined} onCreate={() => undefined} />,
}
export const NewQuotePhone: Story = { ...NewQuote, name: "New quote, phone", globals: phone }
/** From a customer's page: the customer is already chosen. */
export const NewQuoteForACustomer: Story = {
  name: "New quote, for a customer",
  args,
  globals: laptop,
  render: () => <NewQuoteSheet data={WALK_DATA} open onOpenChange={() => undefined} customerId="andrea" initial={{ pick: { key: "repair", other: "" } }} onCreate={() => undefined} />,
}

// ---------------------------------------------------------------------------------------------------------------------- hidden twins (they play)

/** Price a line, send with a $300 deposit: the quote reads Sent and the lines lock. No job appears. */
export const SendTest: Story = {
  name: "Send a quote (test)",
  tags: HIDDEN,
  ...q(priced(), DANA, laptop),
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
    await expect((await c.findAllByText("Sent")).length).toBeGreaterThan(0)
    await expect(await c.findByText(/Locked while quote/)).toBeInTheDocument()
    await expect(await c.findByRole("button", { name: "Send a quote reminder" })).toBeInTheDocument()
    await expect(c.queryByText("Job created")).toBeNull()
  },
}

/** Typing a price in the line's row is the edit: the one line saying what is missing goes away, the step moves on and the total follows. */
export const PriceInCardTest: Story = {
  name: "Price in the card (test)",
  tags: HIDDEN,
  ...q(fresh, DANA, laptop),
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

/** The path: More, Change service, choose another service, confirm; the service line and the history follow, and a quote that is out has no Change service. */
export const ChangeServiceTest: Story = {
  name: "Change service (test)",
  tags: HIDDEN,
  ...q(fresh, DANA, laptop),
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

/** Revise makes the Sent quote Replaced and a new Draft from it: its page opens in the store as a second quote, and the replaced one points to it. */
export const ReviseTest: Story = {
  name: "Revise (test)",
  tags: HIDDEN,
  ...q(fresh, GREG, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Revise" }))
    await userEvent.click(await within(document.body).findByRole("button", { name: "Revise the quote" }))
    await expect((await c.findAllByText("Replaced")).length).toBeGreaterThan(0)
    await expect(await c.findByText("Revisions")).toBeInTheDocument()
    await expect(await c.findByRole("link", { name: "Open the new quote" })).toBeInTheDocument()
  },
}

/** Mark approved with the deposit by check: the quote reads Approved, says "Job created" with the job's chip, and the deposit is paid. This is the one moment a job is made. */
export const ApproveTest: Story = {
  name: "Mark approved makes the job (test)",
  tags: HIDDEN,
  ...q(fresh, BETH, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await expect(c.queryByText(/Job created/)).toBeNull()
    await userEvent.click(await c.findByRole("button", { name: "Mark approved" }))
    const dialog = within(await body.findByRole("dialog"))
    await userEvent.selectOptions(dialog.getByRole("combobox"), "check")
    await userEvent.click(dialog.getByRole("button", { name: "Mark approved and tell Beth" }))
    await expect((await c.findAllByText("Approved")).length).toBeGreaterThan(0)
    await expect((await c.findAllByText(/Job created/)).length).toBeGreaterThan(0)
    await expect(await c.findByRole("link", { name: /Open job/ })).toBeInTheDocument()
  },
}

/** Archive a Draft made from a request: the quote reads Archived with its reason and the notice says the request is archived too. */
export const ArchiveTest: Story = {
  name: "Archive (test)",
  tags: HIDDEN,
  ...q(fresh, DANA, laptop),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "More" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "Archive" }))
    const dialog = within(await body.findByRole("dialog"))
    await expect(dialog.getByText(/request is archived too, with the same reason/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Archive quote" }))
    await expect(await c.findByText(/Archived as No answer\. Dana's request is archived too\./)).toBeInTheDocument()
  },
}

/** New quote from the Quotes list: the sheet opens, a customer and what it is for are chosen, and the new quote's page opens as a Draft, its one line the service. */
function NewQuoteFlow() {
  const [store] = useState(fresh)
  const [open, setOpen] = useState(false)
  const [made, setMade] = useState<string | null>(null)
  const quotes = Object.values(store.getSnapshot().quotes)
  return (
    <DesignShell current="quotes">
      {made ? <QuotePage store={store} quoteId={made} now={QUOTES_NOW} autoFocusPrice /> : <QuotesList quotes={quotes} now={QUOTES_NOW} onNewQuote={() => setOpen(true)} />}
      <NewQuoteSheet
        data={WALK_DATA}
        open={open}
        onOpenChange={setOpen}
        onCreate={({ choice, service }) => {
          const c = WALK_DATA.clients.find((x) => x.id === choice.chosen)!
          setMade(store.createByHand({ customerId: c.id, customer: `${c.firstName} ${c.lastName}`, first: c.firstName, phone: c.phone ?? "", email: c.email ?? "", contact: "text", service: service.name, street: c.address ?? "", town: c.town ?? "", at: QUOTES_NOW, price: service.price }))
        }}
      />
    </DesignShell>
  )
}
export const NewQuoteTest: Story = {
  name: "New quote by hand (test)",
  tags: HIDDEN,
  args,
  globals: laptop,
  render: () => <NewQuoteFlow />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "New quote" }))
    const sheet = within(await body.findByRole("dialog"))
    await expect(sheet.getByRole("button", { name: "New quote" })).toBeDisabled()
    await userEvent.type(sheet.getByRole("textbox", { name: "Find a customer" }), "Andrea")
    await userEvent.click(await sheet.findByRole("button", { name: /Andrea Dalton/ }))
    await expect(sheet.getByRole("button", { name: "New quote" })).toBeDisabled()
    await userEvent.selectOptions(sheet.getByRole("combobox", { name: "What is this for?" }), "repair")
    await userEvent.click(sheet.getByRole("button", { name: "New quote" }))
    await expect(await c.findByText("Q-2026-0009")).toBeInTheDocument()
    await expect((await c.findAllByText("Draft")).length).toBeGreaterThan(0)
    await expect(await c.findByRole("textbox", { name: "Price for Sprinkler repair" })).toHaveValue("145")
  },
}

/** The path: change the roofline's price on the job, the Tell the customer dialog opens with $1,500 and $1,200, telling Beth records it, and the page follows the lines. */
export const PriceChangeTest: Story = {
  name: "Price change after approval (test)",
  tags: HIDDEN,
  ...j(approvedByCard, "qj-0007", laptop),
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
  ...j(approvedByCard, "qj-0007", laptop),
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
