import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TimeGridPhone } from "./TimeGridPhone"
import { NOW, PEOPLE, PLANNED, WEEK_ANYTIME, WEEK_BLOCKS, WEEK_COLUMNS, WEEK_OFF } from "./scheduler-calendar-fixtures"

// The clock on a phone: a swipeable day strip, person chips ("All" first), one day's columns at 88 px an hour. No drag; a tap opens the visit and Edit visit changes it.

const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/TimeGridPhone",
  component: TimeGridPhone,
  parameters: { layout: "padded" },
  globals: PHONE,
  args: { people: PEOPLE, columns: WEEK_COLUMNS, blocks: WEEK_BLOCKS, anytime: WEEK_ANYTIME, timeOff: WEEK_OFF, now: NOW, onSelect: () => {}, onMove: () => {}, onResize: () => {} },
} satisfies Meta<typeof TimeGridPhone>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithPlans: Story = { args: { planned: PLANNED } }
