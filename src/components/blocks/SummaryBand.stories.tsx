import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SummaryBand } from "./SummaryBand"

const meta = {
  title: "Blocks/SummaryBand",
  component: SummaryBand,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="bg-cream p-6"><Story /></div>],
  args: {
    items: [
      { label: "When", value: "Tue, Nov 24", sub: "Any time" },
      { label: "Who", value: "Ryan Garner" },
      { label: "Where", value: "480 Briggs St", sub: "Erie" },
      { label: "Total", value: "$145", sub: "Invoice sent, due Dec 2" },
    ],
  },
} satisfies Meta<typeof SummaryBand>
export default meta
type Story = StoryObj<typeof meta>

/** Four facts across, label small and grey over the value, hairlines between. */
export const Default: Story = {}

/** Past due is the one red cell. */
export const PastDue: Story = {
  args: { items: [{ label: "When", value: "Tue, Nov 3", sub: "Done at 11:20 am" }, { label: "Who", value: "Ryan Garner" }, { label: "Where", value: "51 Shadow Ln", sub: "Erie" }, { label: "Total", value: "$145", sub: "Past due since Nov 17", tone: "alert" }] },
}

/** On a phone the cells are two by two. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
