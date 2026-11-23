import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { pickDay, pickTime } from "./day-calendar-kit"
import { DayField, type DayFieldProps } from "./DayField"

// A day in an office form: one field that reads the answer and opens the one calendar under itself (a form with three days is not three calendars tall until one is wanted). "Done on" is a past day,
// New job's day is optional and has a time, a Season Pass visit is a day only.
function Harness(props: Partial<DayFieldProps> & { initial?: { day: string; start: string } }) {
  const [held, setHeld] = useState(props.initial ?? { day: "", start: "" })
  return (
    <div className="mx-auto max-w-md container-padding-x py-8">
      <DayField label="Day (optional)" from="2026-11-18" {...props} value={held.day} start={held.start} onChange={(day, start) => setHeld({ day, start })} />
    </div>
  )
}

const meta = { title: "Blocks/DayField", component: Harness, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** Closed it reads "No day yet"; opened it is the calendar; a day and a time are the calendar's own, and Clear the day goes back. */
export const OptionalDayWithTime: Story = {
  args: { timed: true, clearable: true },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("button", { name: "Day (optional), No day yet" })
    await expect(field).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(field)
    await pickDay(canvas, userEvent, "2026-11-24")
    await pickTime(canvas, userEvent, "09:30")
    await expect(canvas.getByRole("button", { name: "Day (optional), Tuesday, November 24 at 9:30 am" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Clear the day" }))
    await expect(canvas.getByRole("button", { name: "Day (optional), No day yet" })).toBeInTheDocument()
  },
}

/** A Season Pass visit: a day only, closed it says Unscheduled. */
export const PassVisitDayOnly: Story = { args: { label: "Spring turn-on", empty: "Unscheduled", clearable: true, initial: { day: "2026-12-01", start: "" } }, globals: { viewport: { value: "phone", isRotated: false } } }

/** Done on: a past day, today the latest. */
export const DoneOn: Story = { args: { label: "Done on", from: "2025-11-18", to: "2026-11-18", initial: { day: "2026-11-18", start: "" }, defaultOpen: true }, globals: { viewport: { value: "laptop", isRotated: false } } }
