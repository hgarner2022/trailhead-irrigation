import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { collectPlan, type CollectInput } from "@/lib/money/collect"
import { CollectPayment } from "./CollectPayment"

// The second beat of a finished visit, "How is this paid?", in every state the design lists (docs/plans/2026-11-18-done-and-paid-design.md,
// section 3), at the phone and laptop widths. The buttons log; nothing moves money in the catalog.

const base: CollectInput = { amount: 145, isPass: false, invoiceOpen: false, canInvoice: true, declined: false, charging: false }
const visa = { brand: "visa", last4: "4242" }
const ok = async () => ({ ok: true as const })

const meta = {
  title: "Blocks/CollectPayment",
  component: CollectPayment,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
  args: { plan: collectPlan({ ...base, card: visa }), summary: "Spring turn-on · $145 unpaid", firstName: "Andrea", onCharge: ok, onRecord: ok, onInvoice: ok, onLater: () => undefined, onClose: () => undefined },
} satisfies Meta<typeof CollectPayment>
export default meta
type Story = StoryObj<typeof meta>

const phone = { viewport: { value: "phone", isRotated: false } }
const laptop = { viewport: { value: "laptop", isRotated: false } }

export const DefaultCard: Story = { globals: laptop }
export const DefaultCardPhone: Story = { globals: phone }
export const PassAsAgreed: Story = { args: { plan: collectPlan({ ...base, card: visa, isPass: true }) }, globals: laptop }
export const PassAsAgreedPhone: Story = { args: { plan: collectPlan({ ...base, card: visa, isPass: true }) }, globals: phone }
export const NoCard: Story = { args: { plan: collectPlan(base) }, globals: laptop }
export const NoCardPhone: Story = { args: { plan: collectPlan(base) }, globals: phone }
export const Charging: Story = { args: { plan: collectPlan({ ...base, card: visa, charging: true }) }, globals: laptop }
export const ChargingPhone: Story = { args: { plan: collectPlan({ ...base, card: visa, charging: true }) }, globals: phone }
export const DidntGoThrough: Story = { args: { plan: collectPlan({ ...base, card: visa, declined: true }) }, globals: laptop }
export const DidntGoThroughPhone: Story = { args: { plan: collectPlan({ ...base, card: visa, declined: true }) }, globals: phone }
export const NeedsAnAmount: Story = { args: { plan: collectPlan({ ...base, amount: 0 }), summary: "Installation · no price yet" }, globals: laptop }
export const Phone: Story = { globals: phone }
