import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ReceiptLine, type ReceiptLineProps } from "./ReceiptLine"

const meta = {
  title: "Blocks/ReceiptLine",
  component: ReceiptLine,
  parameters: { layout: "padded" },
  args: { amount: 145, method: "card_on_file", paidOn: "2026-11-03", receiptUrl: "https://pay.stripe.com/receipts/example", printHref: "/account/receipts/pay_1" },
  render: (args: ReceiptLineProps) => (
    <ul className="mx-auto max-w-3xl divide-y divide-border">
      <ReceiptLine {...args} />
      <ReceiptLine amount={80} method="check" paidOn="2026-11-05" reference="Check 1043" printHref="/account/receipts/pay_2" />
      <ReceiptLine amount={-145} method="card_on_file" paidOn="2026-11-09" printHref="/account/receipts/pay_3" />
    </ul>
  ),
} satisfies Meta<typeof ReceiptLine>
export default meta
type Story = StoryObj<typeof meta>

export const ListPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const ListLaptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
