import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { BillingBody, type BillingBodyProps } from "./BillingBody"
import type { InvoiceRowData, PaymentRowData } from "./billing-model"
import { SectionCard } from "./SectionCard"

// The inside of a Billing card in every money state, in a 606px card at 1280 and at 375 (Hannah, Nov 20 2026: "this could be cleaned up"). Each fact
// is said once: the status line is the headline, the three figures show only when they add something, Card on file only while something is unpaid,
// and a paid invoice and its payment are one row of "Invoices and payments".

const noop = () => {}
const pay = (over: Partial<PaymentRowData> = {}): PaymentRowData => ({ id: "p1", at: "2026-11-18T17:50:00Z", method: "card", methodLabel: "Visa ending 4242", amount: "$145", by: "Ryan", receiptHref: "/account/receipts/p1", stripeHref: "https://dashboard.stripe.com/payments/pi_3QxK1042", canRefund: true, ...over })
const check = (over: Partial<PaymentRowData> = {}) => pay({ id: "p3", method: "check", methodLabel: "Check #1042", stripeHref: undefined, ...over })
const inv = (over: Partial<InvoiceRowData> = {}): InvoiceRowData => ({ id: "i1", number: "INV-2026-0042", amount: "$145", sent: "Nov 18", due: "Dec 2", status: "bill-sent", href: "/admin/invoices?invoice=i1", canRemind: true, ...over })
const CARD: [string, string] = ["Card on file", "Visa ending 4242"]
const LINK = { name: "INV-2026-0042", href: "/admin/invoices?invoice=i1" }

const meta = {
  title: "Blocks/BillingBody",
  component: BillingBody,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="max-w-[606px] bg-cream p-6"><SectionCard title="Billing" id="billing-h"><Story /></SectionCard></div>],
  args: { line: { tone: "paid", title: "Paid in full" }, facts: [], onRemind: noop, onRefund: noop },
} satisfies Meta<typeof BillingBody>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const state = (args: Partial<BillingBodyProps>, g = laptop): Story => ({ args: args as Story["args"], globals: g })

/** Nothing paid and no invoice: one line, and the card on file, which a person may charge. No figures. */
export const Unpaid: Story = state({ line: { tone: "unpaid", title: "$145 unpaid", text: "No invoice yet." }, facts: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD] })
export const UnpaidPhone: Story = state(Unpaid.args!, phone)

/** An invoice out: the line names it with its dates; the row has Remind and Open invoice. */
export const InvoiceSent: Story = state({ line: { tone: "unpaid", title: "$145 unpaid", text: "Invoice {invoice} sent Nov 18, due Dec 2.", invoice: LINK }, facts: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD], invoices: [inv({ note: "Includes the visit report" })] })
export const InvoiceSentPhone: Story = state(InvoiceSent.args!, phone)

export const PastDue: Story = state({ line: { tone: "pastdue", title: "Past due since Nov 17", text: "$145 unpaid. Invoice {invoice} sent Nov 3.", invoice: LINK }, facts: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD], invoices: [inv({ status: "overdue", sent: "Nov 3", due: "Nov 17" })] })
export const PastDuePhone: Story = state(PastDue.args!, phone)

/** Paid by card: the invoice and its payment are ONE row; the headline says Paid in full and nothing repeats the $145, so there are no figures and no card. */
export const PaidByCard: Story = state({ line: { tone: "paid", title: "Paid in full" }, facts: [["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"], CARD], invoices: [inv({ status: "paid", canRemind: false })], payments: [pay({ invoiceId: "i1" })] })
export const PaidByCardPhone: Story = state(PaidByCard.args!, phone)

/** Paid by check: a check has no invoice, so it is the Payments table's one row. */
export const PaidByCheck: Story = state({ line: { tone: "paid", title: "Paid in full" }, facts: [["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"]], payments: [check()] })
export const PaidByCheckPhone: Story = state(PaidByCheck.args!, phone)

/** A deposit: the $50 check is a payment with no invoice; the final invoice credits it and is one row with the card payment. The figures show, because two payments need explaining. */
export const PaidWithDeposit: Story = state({
  line: { tone: "paid", title: "Paid in full" },
  facts: [["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"], CARD],
  invoices: [inv({ status: "paid", canRemind: false, amount: "$95", note: "$145 less the $50 deposit" })],
  payments: [pay({ amount: "$95", invoiceId: "i1" }), check({ id: "dp", at: "2026-11-10T17:00:00Z", amount: "$50", reference: "Deposit · Ryan" })],
})
export const PaidWithDepositPhone: Story = state(PaidWithDeposit.args!, phone)

/** Refunded in full: the refund is a grey negative row under the payment, which stays. */
export const Refunded: Story = state({ line: { tone: "refunded", title: "Refunded" }, facts: [["Total", "$145"], ["Paid", "$0"], ["Refunded", "$145"], CARD], payments: [pay({ canRefund: false }), pay({ id: "r1", at: "2026-11-19T15:00:00Z", amount: "-$145", refund: true, refundOf: "p1", stripeHref: undefined, canRefund: false })] })
export const RefundedPhone: Story = state(Refunded.args!, phone)

/** Refunded in part: the headline names the $50 and the figures say what is left. */
export const PartRefunded: Story = state({ line: { tone: "paid", title: "Paid, $50 refunded" }, facts: [["Total", "$145"], ["Paid", "$95"], ["Refunded", "$50"], CARD], payments: [pay({ canRefund: false }), pay({ id: "r2", at: "2026-11-19T15:00:00Z", amount: "-$50", refund: true, refundOf: "p1", stripeHref: undefined, canRefund: false })] })
export const PartRefundedPhone: Story = state(PartRefunded.args!, phone)

/** Every table starts and ends on the card's own edges, with 24px above each sub-heading and 8px below it. */
export const Spacing: Story = {
  ...state(PaidWithDeposit.args!),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const heads = [await c.findByRole("heading", { name: "Invoices and payments" }), await c.findByRole("heading", { name: "Payments" })]
    for (const h of heads) {
      await expect(getComputedStyle(h.closest("section")!).marginTop).toBe("24px")
      await expect(getComputedStyle(h).marginBottom).toBe("8px")
      await expect(parseFloat(getComputedStyle(h).fontSize)).toBe(16)
    }
    for (const box of canvasElement.querySelectorAll<HTMLElement>("[data-slot=table-container]")) await expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
  },
}
