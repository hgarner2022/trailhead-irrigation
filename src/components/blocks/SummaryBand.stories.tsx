import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { StatusPill } from "./StatusPill"
import { SummaryBand } from "./SummaryBand"

const meta = {
  title: "Blocks/SummaryBand",
  component: SummaryBand,
  parameters: { layout: "padded" },
  args: {
    items: [
      { label: "When", value: "Wednesday, April 28 at 10:30 am" },
      { label: "Who", value: "Ryan" },
      { label: "Where", value: "412 Briggs Street, Erie" },
      { label: "Money", value: <StatusPill status="owed" label="$145 unpaid" /> },
    ],
  },
  decorators: [(Story) => <div className="max-w-3xl bg-stone p-4"><Story /></div>],
} satisfies Meta<typeof SummaryBand>
export default meta
type Story = StoryObj<typeof meta>

/** The key facts of a record in one white card: labels quiet, values in weight, a badge for money. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Wednesday, April 28 at 10:30 am")).toBeInTheDocument()
  },
}
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
