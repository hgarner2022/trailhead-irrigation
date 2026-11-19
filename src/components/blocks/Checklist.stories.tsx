import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Checklist, repairChecklist } from "./Checklist"

const meta = {
  title: "Blocks/Checklist",
  component: Checklist,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="max-w-xl bg-cream p-6"><Story /></div>],
  args: { items: repairChecklist(0) },
} satisfies Meta<typeof Checklist>
export default meta
type Story = StoryObj<typeof meta>

/** Nothing done yet: "Checklist · 0 of 5". */
export const Untouched: Story = {}

/** Two steps done and one with a note. */
export const HalfDone: Story = { args: { items: repairChecklist(2).map((i, n) => (n === 1 ? { ...i, note: "Broken head on zone 3." } : i)) } }

/** Every step done: "Checklist · 5 of 5". */
export const AllDone: Story = { args: { items: repairChecklist(5) } }

/** A service with no checklist says where to set one up. */
export const Empty: Story = { args: { items: [] } }

export const Phone: Story = { args: { items: repairChecklist(2) }, globals: { viewport: { value: "phone", isRotated: false } } }
