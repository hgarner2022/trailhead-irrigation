import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MonthGrid, type MonthGridProps } from "./MonthGrid"
import { MONTH_OFF, PEOPLE, TODAY, monthFixture } from "./scheduler-calendar-fixtures"

// The Month view: stop count, up to two towns, a dot per person, a hatch for time off, a mark for a move not told. A cell opens that day.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Live(args: MonthGridProps) {
  const [month, setMonth] = useState(args.month)
  const [day, setDay] = useState<string>()
  return (
    <div className="space-y-3">
      <MonthGrid {...args} month={month} selectedDay={day} onMonthChange={setMonth} onOpenDay={setDay} />
      <p role="status" className="text-sm text-navy">{day ? `Opens Day view for ${day}.` : "Press a day."}</p>
    </div>
  )
}

const meta = {
  title: "Blocks/Scheduler/MonthGrid",
  component: MonthGrid,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { month: "2026-11", days: monthFixture(), people: PEOPLE, today: TODAY },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof MonthGrid>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: "Busy" }
export const Empty: Story = { args: { days: [] } }
export const TimeOff: Story = { name: "Time off", args: { days: MONTH_OFF } }
export const Phone: Story = { globals: PHONE }
