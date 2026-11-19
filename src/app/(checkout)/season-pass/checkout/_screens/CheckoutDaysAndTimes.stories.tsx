import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { FlowShell } from "@/components/blocks/FlowShell"
import { fixtureDayTimes, startDay, type DayTimePick } from "@/lib/booking/day-time"
import { DayTimeGroups } from "@/app/(booking)/booking/_screens/booking-day"

// The Season Pass checkout's "your days" step revised to a day AND a time for each of its two visits (docs/plans/2026-11-18-scheduling-engine-design.md section 2, story 1). It is the booking flow's
// day-and-time step, once per visit, so the two ask the same question the same way: the best day selected on each, its times under it, the best time marked and none selected, Continue off until a
// time is tapped on both. The old three day cards with "We'll text you the time the day before." are replaced; the day-before text now confirms the booked time. A fixture harness stands in for the flow.
const turnOn = fixtureDayTimes(60)
const blowout = fixtureDayTimes(30).map((o, i) => ({ ...o, day: ["2027-10-05", "2027-10-07", "2027-10-12", "2027-10-14", "2027-10-19"][i]! }))

function Step() {
  const [picks, setPicks] = useState<Record<string, DayTimePick>>({ "turn-on": { day: startDay(turnOn), start: null }, blowout: { day: startDay(blowout), start: null } })
  const ready = Object.values(picks).every((p) => p.start !== null)
  return (
    <FlowShell question="Pick your days and times" step={4} total={7} wide nextDisabled={!ready} hint="Tap a start time for each visit to continue.">
      <DayTimeGroups
        groups={[
          { key: "turn-on", heading: "Your spring turn-on", offers: turnOn, minutes: 60 },
          { key: "blowout", heading: "Your fall blowout", offers: blowout, minutes: 30 },
        ]}
        picks={picks}
        onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))}
        town="Erie"
      />
      <p className="mt-10 text-base text-muted-foreground">Change them later from your Season Pass page, until the day before.</p>
    </FlowShell>
  )
}

const meta = { title: "Screens/Checkout day and time", component: Step, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Step>
export default meta
type Story = StoryObj<typeof meta>

export const DaysAndTimesLaptop: Story = {
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
    await expect(canvas.getByRole("heading", { level: 2, name: "Your fall blowout" })).toBeInTheDocument()
  },
}
export const DaysAndTimesPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
