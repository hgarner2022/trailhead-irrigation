import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { fixtureDayTimes, startDay, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { DayTimePicker } from "./DayTimePicker"

// The day-and-time question over the fixture: the best day starts selected, no time is selected until one is tapped, "Show more days" goes from three to five.
function Harness({ offers, minutes, note }: { offers: DayTimeOffer[]; minutes?: string; note?: boolean }) {
  const [pick, setPick] = useState<DayTimePick>({ day: startDay(offers), start: null })
  const [text, setText] = useState("")
  return (
    <div className="max-w-3xl container-padding-x py-8">
      <DayTimePicker offers={offers} value={pick} onChange={setPick} legend="Pick your day" length={minutes} note={text} onNote={note ? setText : undefined} />
      <p className="mt-6 text-sm text-muted-foreground">{pick.start ? `Holding ${pick.day} ${pick.start}` : "No time tapped yet"}</p>
    </div>
  )
}

const meta = {
  title: "Blocks/DayTimePicker",
  component: Harness,
  parameters: { layout: "fullscreen" },
  args: { offers: fixtureDayTimes(120), minutes: "Start times for a 2 hour visit" },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("radio", { name: /Tuesday, April 20/ })).toBeChecked()
    await expect(canvas.getByText("No time tapped yet")).toBeInTheDocument()
    await userEvent.click(canvas.getByText("Show more days"))
    await expect(canvas.getAllByRole("radio", { name: /day, April/ })).toHaveLength(5)
  },
}

/** Nothing open in the window: the days are full and Ryan calls. */
export const Empty: Story = { args: { offers: [] } }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }

/** "None of these work? Tell us when" is offered; tapped, it opens the box. */
export const NoneFit: Story = {
  args: { note: true },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "None of these work? Tell us when" }))
    await expect(canvas.getByLabelText("When would suit you?")).toBeInTheDocument()
  },
}

/** A one hour turn-on has more starts than a two hour repair. */
export const OneHourService: Story = { args: { offers: fixtureDayTimes(60), minutes: "Start times for a 1 hour visit" }, globals: { viewport: { value: "laptop", isRotated: false } } }
