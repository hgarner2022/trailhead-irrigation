import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"
import { DayCalendar } from "./DayCalendar"

// The day-and-time question as a calendar: one month, the soonest open day selected and marked, recommended days marked, days with nothing open greyed, then the chosen day's times with a best fit.
function Harness({ offers, initial }: { offers: ReturnType<typeof fixtureCalendarDays>; initial?: DayTimePick }) {
  const [pick, setPick] = useState<DayTimePick>(initial ?? { day: offers.find((o) => o.times.length > 0)?.day ?? null, start: null })
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <DayCalendar offers={offers} value={pick} onChange={setPick} legend="Pick your day" />
    </div>
  )
}

const meta = {
  title: "Blocks/DayCalendar",
  component: Harness,
  parameters: { layout: "fullscreen" },
  args: { offers: fixtureCalendarDays(120, "2027-04-15") },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: /Thursday, April 15, soonest/ })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(canvas.getByRole("button", { name: "Monday, April 19" }))
    await userEvent.click(await canvas.findByRole("radio", { name: /10:30 am/ }))
    await expect(canvas.getByRole("radio", { name: /10:30 am/ })).toBeChecked()
  },
}
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
/** The next month, reached with the arrow. */
export const NextMonth: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Next month" }))
    await expect(await canvas.findByRole("heading", { name: "May 2027" })).toBeInTheDocument()
  },
}
/** Nothing is open. */
export const Full: Story = { args: { offers: [] } }
