import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { DayCalendar } from "./DayCalendar"
import { fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"

// The customer's day-and-time step with ONE time marked (docs/plans/2026-11-26-scheduler-review-research.md, pick a): the word "Recommended" in small text under the time. It never says why,
// stays once the time is chosen, and is part of the time button's name for a screen reader.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const offers = fixtureCalendarDays(120, "2026-11-30", "2026-12-11")
const DAY = "2026-11-30"

function Step({ recommended = true }: { recommended?: boolean }) {
  const [pick, setPick] = useState<DayTimePick>({ day: DAY, start: null })
  return <DayCalendar offers={offers} value={pick} onChange={setPick} legend="Pick your day" headingLevel={3} recommendedStart={recommended ? "10:30" : null} recommendedDay={DAY} />
}

const meta = {
  title: "Blocks/Scheduler/RecommendedMark",
  component: Step,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  render: (args) => (
    <div className="mx-auto max-w-xl p-4 md:p-8">
      <Step {...args} />
    </div>
  ),
} satisfies Meta<typeof Step>
export default meta
type Story = StoryObj<typeof meta>

/** The booking step: "Recommended" under 10:30 am, and nothing chosen for the customer. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByText("Recommended")).toHaveLength(1)
    await expect(canvas.getByRole("radio", { name: /10:30 am\s*Recommended/ })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("radio", { name: /10:30 am/ }))
    await expect(canvas.getAllByText("Recommended")).toHaveLength(1)
  },
}
export const Phone: Story = { globals: PHONE }

/** No time is marked (nothing is the best): the step looks as it did before. */
export const Empty: Story = { args: { recommended: false } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }
