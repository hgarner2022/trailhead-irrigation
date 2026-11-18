import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MoneyCell } from "./MoneyCell"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/MoneyCell",
  component: MoneyCell,
  parameters: { layout: "padded" },
  args: { text: "$145 · Invoice sent, due Dec 1" },
  globals: LAPTOP,
} satisfies Meta<typeof MoneyCell>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Nothing is due: a dash, with "Nothing due" for a screen reader. */
export const Empty: Story = { args: { text: null } }

/** Past due and Failed are the only two in the warning colour. */
export const Tones: Story = {
  render: () => (
    <ul className="flex flex-col gap-2 text-sm">
      <li><MoneyCell text="$115 unpaid" /></li>
      <li><MoneyCell text="$145 · Paid" /></li>
      <li><MoneyCell text="$145 · Past due since Dec 1" tone="past-due" /></li>
      <li><MoneyCell text="$145 · Failed" tone="failed" /></li>
    </ul>
  ),
}

export const Phone: Story = { globals: PHONE, args: { text: "$115 unpaid" } }
