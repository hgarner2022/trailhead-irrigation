import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { QuoteFlow } from "./QuoteFlow"
import { QuoteScreen } from "./QuoteScreen"
import { StripePlaceholder } from "./StripePlaceholder"
import { NO_DEPOSIT, WITH_DEPOSIT } from "./quote-view"

// The customer's quote page (Hannah, Nov 20 2026), as it appears on a phone (375) and a laptop (1280): Beth Orr's $1,200 quote with a $300 deposit and Greg Olsen's $860 quote with none.
// Approve with a deposit goes to Stripe's card page (drawn, never a real card field) and counts only when the payment succeeds; with no deposit Approve is one tap and the
// Approved page offers an optional "Add a card". Decline confirms first. Every state is a story at both widths. The sentence about how a saved card may be used is a marked
// placeholder: it is Hannah's to write. Nothing is wired, charged or sent.

const meta = {
  title: "Customer/Quote",
  component: QuoteScreen,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The page a quote link opens, behind a signed token and never indexed: the Trailhead badge, Your quote, what it includes with its prices, the total, the deposit line only when Ryan asked for one, Approve and Decline with Text Ryan and Call Ryan beside them. The states are the quote open (with and without a deposit), Stripe's card page, Approved (with the deposit receipt line, or the optional Add a card), the decline confirm, Declined, a replaced quote and a link that is old or wrong. The clickable path is Customer / Walkthrough (clickable), the last step, A quote.",
      },
    },
  },
  args: { quote: NO_DEPOSIT, status: "open" },
} satisfies Meta<typeof QuoteScreen>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const HIDDEN = ["!dev", "!autodocs"]

/** The quote with no deposit: Approve is one tap, Decline beside it, Text Ryan and Call Ryan under them. */
export const Open: Story = { name: "Open, no deposit", globals: laptop }
export const OpenPhone: Story = { name: "Open, no deposit, phone", globals: phone }

/** A deposit is set: the deposit line shows what is due when Beth approves, and Approve says what it will charge. */
export const OpenDeposit: Story = { name: "Open, with a deposit", args: { quote: WITH_DEPOSIT }, globals: laptop }
export const OpenDepositPhone: Story = { name: "Open, with a deposit, phone", args: { quote: WITH_DEPOSIT }, globals: phone }

const stripe = (mode: "deposit" | "save-card") => <StripePlaceholder mode={mode} quote={WITH_DEPOSIT} onPay={() => undefined} onBack={() => undefined} />

/** Approve with a deposit opens Stripe's card page for exactly the deposit, with Stripe's own unticked save box. Closing it approves nothing and charges nothing. */
export const CardPage: Story = { name: "Stripe card page, deposit", render: () => stripe("deposit"), globals: laptop }
export const CardPagePhone: Story = { name: "Stripe card page, deposit, phone", render: () => stripe("deposit"), globals: phone }

/** The payment went through: Approved, the deposit receipt line and the receipt. */
export const ApprovedDeposit: Story = { name: "Approved, deposit paid", args: { quote: WITH_DEPOSIT, status: "approved", depositPaid: true }, globals: laptop }
export const ApprovedDepositPhone: Story = { name: "Approved, deposit paid, phone", args: { quote: WITH_DEPOSIT, status: "approved", depositPaid: true }, globals: phone }

/** Approved with no deposit: one tap, then an optional Add a card. It is never required, and the sentence about how a saved card may be used is a marked placeholder. */
export const ApprovedNoDeposit: Story = { name: "Approved, no deposit", args: { status: "approved" }, globals: laptop }
export const ApprovedNoDepositPhone: Story = { name: "Approved, no deposit, phone", args: { status: "approved" }, globals: phone }

/** Add a card opens Stripe's setup page: no amount, no charge. */
export const SaveCardPage: Story = { name: "Stripe card page, add a card", render: () => stripe("save-card"), globals: laptop }
export const SaveCardPagePhone: Story = { name: "Stripe card page, add a card, phone", render: () => stripe("save-card"), globals: phone }

/** A card was added after Approve. */
export const ApprovedCardAdded: Story = { name: "Approved, card added", args: { status: "approved", cardSaved: "Visa ending 4242" }, globals: laptop }
export const ApprovedCardAddedPhone: Story = { name: "Approved, card added, phone", args: { status: "approved", cardSaved: "Visa ending 4242" }, globals: phone }

/** Decline asks once and says Ryan is told. */
export const DeclineConfirm: Story = { name: "Decline, confirm", render: () => <QuoteFlow quote={NO_DEPOSIT} confirmingDecline />, globals: laptop }
export const DeclineConfirmPhone: Story = { name: "Decline, confirm, phone", render: () => <QuoteFlow quote={NO_DEPOSIT} confirmingDecline />, globals: phone }

/** Declined: the answer, and Text Ryan and Call Ryan. */
export const Declined: Story = { name: "Declined", args: { status: "declined" }, globals: laptop }
export const DeclinedPhone: Story = { name: "Declined, phone", args: { status: "declined" }, globals: phone }

/** Ryan revised it: the link says it was replaced and gives the way to him. */
export const Replaced: Story = { name: "Replaced", args: { status: "replaced" }, globals: laptop }
export const ReplacedPhone: Story = { name: "Replaced, phone", args: { status: "replaced" }, globals: phone }

/** A link that is old or wrong opens a page of its own, with the way on. */
export const OldLink: Story = { name: "Link old or wrong", args: { status: "old-link" }, globals: laptop }
export const OldLinkPhone: Story = { name: "Link old or wrong, phone", args: { status: "old-link" }, globals: phone }

// ---------------------------------------------------------------------------------------------------------------------- hidden twins (they play)

/** With a deposit: Approve opens the card page, closing it leaves the quote open, paying approves it. */
export const DepositFlowTest: Story = {
  name: "Approve with a deposit (test)",
  tags: HIDDEN,
  render: () => <QuoteFlow quote={WITH_DEPOSIT} />,
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Approve and pay $300" }))
    await expect(await c.findByText("Pay $300", { selector: "button" })).toBeInTheDocument()
    await expect(c.getByLabelText("Save my payment method for future use")).not.toBeChecked()
    await expect(canvasElement.querySelectorAll("input:not([type=checkbox])")).toHaveLength(0)
    // closing the card page approves nothing
    await userEvent.click(c.getByRole("button", { name: /Trailhead Lawn & Irrigation/ }))
    await expect(await c.findByRole("button", { name: "Approve and pay $300" })).toBeInTheDocument()
    await userEvent.click(c.getByRole("button", { name: "Approve and pay $300" }))
    await userEvent.click(await c.findByRole("button", { name: "Pay $300" }))
    await expect(await c.findByText("We sent a receipt for your $300 deposit to beth.orr@example.com.")).toBeInTheDocument()
  },
}

/** With no deposit: one tap approves, Add a card is optional, and saving one says so. */
export const NoDepositFlowTest: Story = {
  name: "Approve with no deposit (test)",
  tags: HIDDEN,
  render: () => <QuoteFlow quote={NO_DEPOSIT} />,
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Approve" }))
    await expect(await c.findByText("Approved")).toBeInTheDocument()
    await expect(c.queryByText("[Wording from Hannah]")).toBeNull()
    await userEvent.click(c.getByRole("button", { name: "Add a card" }))
    await userEvent.click(await c.findByRole("button", { name: "Save card" }))
    await expect(await c.findByText("Card added: Visa ending 4242.")).toBeInTheDocument()
  },
}

/** Decline confirms, then the Declined page. */
export const DeclineFlowTest: Story = {
  name: "Decline (test)",
  tags: HIDDEN,
  render: () => <QuoteFlow quote={NO_DEPOSIT} />,
  globals: phone,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Decline" }))
    await userEvent.click(await within(document.body).findByRole("button", { name: "Decline the quote" }))
    await expect(await c.findByText("You declined this quote.")).toBeInTheDocument()
  },
}
