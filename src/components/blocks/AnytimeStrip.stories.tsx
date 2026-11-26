import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AnytimeStrip } from "./AnytimeStrip"
import { WEEK_ANYTIME } from "./scheduler-calendar-fixtures"

// The chips above a column: street, service and length. Empty, one thin line that says Any time.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const three = [...WEEK_ANYTIME, { ...WEEK_ANYTIME[0]!, id: "a4", title: "Cheesman St" }]

const meta = {
  title: "Blocks/Scheduler/AnytimeStrip",
  component: AnytimeStrip,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { blocks: three, onSelect: () => {} },
  decorators: [(Story) => <div className="max-w-xl rounded-lg border border-border bg-background p-2"><Story /></div>],
} satisfies Meta<typeof AnytimeStrip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: "Three chips" }
export const Empty: Story = { args: { blocks: [] } }
export const Phone: Story = { globals: PHONE, args: { touch: true } }
