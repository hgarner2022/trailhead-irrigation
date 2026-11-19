import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { fixtureDayTimes, startDay, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { DayTimePicker, pickComplete } from "./DayTimePicker"

const offers = fixtureDayTimes(120)

function Held({ list = offers }: { list?: DayTimeOffer[] }) {
  const [pick, setPick] = useState<DayTimePick>({ day: startDay(list), start: null })
  return (
    <>
      <DayTimePicker offers={list} value={pick} onChange={setPick} legend="Pick your day" />
      <output>{pickComplete(list, pick) ? "can continue" : "cannot continue"}</output>
    </>
  )
}

describe("DayTimePicker", () => {
  it("selects the best day, marks the best time and selects no time", () => {
    render(<Held />)
    expect(screen.getByRole("radio", { name: /Tuesday, April 20/ })).toBeChecked()
    expect(screen.getByText("Best fit")).toBeInTheDocument()
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(1)
    expect(screen.getByText("cannot continue")).toBeInTheDocument()
  })
  it("shows three days, then five, and continues only after a time is tapped", async () => {
    const user = userEvent.setup()
    render(<Held />)
    expect(screen.getAllByRole("radio", { name: /day, April/ })).toHaveLength(3)
    await user.click(screen.getByRole("button", { name: "Show more days" }))
    expect(screen.getAllByRole("radio", { name: /day, April/ })).toHaveLength(5)
    await user.click(screen.getByRole("radio", { name: /10:30 am/ }))
    expect(screen.getByText("can continue")).toBeInTheDocument()
  })
  it("says the days are full when nothing is open, and lets the flow go on", () => {
    render(<Held list={[]} />)
    expect(screen.getByText("These days are full. We'll call you to find one.")).toBeInTheDocument()
    expect(screen.getByText("can continue")).toBeInTheDocument()
  })
})
