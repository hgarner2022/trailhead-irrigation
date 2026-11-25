import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DayHead, HourGutter } from "./TimeGridHeader"
import { PEOPLE } from "./scheduler-calendar-fixtures"

// The two fixed edges of the clock: the head of a day (label, today pill, count, people) and the hour gutter with the now dot.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/TimeGridHeader",
  component: DayHead,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { column: { day: "2026-11-25", label: "25 Wed", today: true, count: "6 visits" }, people: PEOPLE, colourOf: (id: string) => PEOPLE.findIndex((p) => p.id === id) },
  decorators: [(Story) => <div className="flex w-80 rounded-lg border border-border bg-background"><HourGutter range={{ start: 8, end: 12 }} hourPx={56} nowMinutes={10 * 60 + 20} /><div className="flex-1"><Story /></div></div>],
} satisfies Meta<typeof DayHead>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Day: Story = { args: { names: true, column: { day: "2026-11-24", label: "24 Tue", count: "11 visits", caption: "5 stops, 3 h open" } } }
