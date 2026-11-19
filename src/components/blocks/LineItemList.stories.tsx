import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { LineItemList } from "./LineItemList"

const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/LineItemList",
  component: LineItemList,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
  args: {
    lines: [{ name: "Repair", description: "A visit to find the problem and fix what we can that day.", amount: "$145" }],
    totals: [["Subtotal", "$145"], ["Tax", "$0"], ["Total", "$145", "strong"], ["Paid", "$0"], ["Balance", "$145", "alert"]],
  },
} satisfies Meta<typeof LineItemList>
export default meta
type Story = StoryObj<typeof meta>

/** One line with its description and the totals under it. */
export const Default: Story = {}

/** No lines yet: a job that needs a quote. */
export const Empty: Story = { args: { lines: [], totals: [] } }

/** Two lines, one of them canceled and struck through. */
export const WithCanceledLine: Story = {
  args: { lines: [{ name: "Repair", description: "One visit.", amount: "$145" }, { name: "Valve box", description: "Not needed after all.", amount: "$60", canceled: true }], totals: [["Total", "$145", "strong"]] },
}

export const Phone: Story = { globals: PHONE }
