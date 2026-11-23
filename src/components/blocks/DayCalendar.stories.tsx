import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { OFFICE_STARTS, fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"
import { DayCalendar } from "./DayCalendar"

// The one day picker (Hannah, Nov 23 2026: "the calendar should be everywhere"): one month, the soonest open day selected and marked, days with nothing open greyed, then the chosen day's times.
// Four optional modes: days only (a customer picks no time on a Season Pass visit), the customer's own day marked "Your day", the office's calendar (any day, "Any time" first) and the sheet density.
type Offers = ReturnType<typeof fixtureCalendarDays>
function Harness({ offers, initial, ...rest }: { offers: Offers; initial?: DayTimePick } & Partial<Omit<ComponentProps<typeof DayCalendar>, "offers" | "value" | "onChange" | "legend">>) {
  const [pick, setPick] = useState<DayTimePick>(initial ?? { day: offers.find((o) => o.times.length > 0)?.day ?? null, start: null })
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <DayCalendar offers={offers} value={pick} onChange={setPick} legend="Pick your day" {...rest} />
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

/** Days only: a Season Pass visit or a day-only Reschedule. Every offer is open, no times show, and the visit's own day is marked "Your day" even though it is not offered. */
export const DaysOnlyPhone: Story = {
  args: { offers: fixtureCalendarDays(60, "2027-04-15").map((o) => ({ ...o, times: [] })), timed: false, current: "2027-04-14" },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("radio")).toBeNull()
    await expect(canvas.getByRole("button", { name: /Wednesday, April 14, your day/ })).toBeInTheDocument()
    await expect(canvas.getByText("Your day")).toBeInTheDocument()
  },
}

/** The customer's own day among the open days, with the times under it. */
export const YourDayPhone: Story = {
  args: { current: "2027-04-19", initial: { day: "2027-04-19", start: null }, density: "sheet" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The office: any day from today may be chosen (a Saturday too), "Any time" is first among the starts and is held. */
export const OfficeLaptop: Story = {
  args: { offers: [], free: { from: "2027-04-15", timesFor: () => OFFICE_STARTS }, anyTime: true, initial: { day: "2027-04-17", start: null } },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("radio", { name: "Any time" })).toBeChecked()
    await userEvent.click(canvas.getByRole("radio", { name: "9:00 am" }))
    await expect(canvas.getByRole("radio", { name: "9:00 am" })).toBeChecked()
    await expect(canvas.getByRole("button", { name: "Tuesday, April 13, not available" })).toHaveAttribute("aria-disabled", "true")
  },
}
