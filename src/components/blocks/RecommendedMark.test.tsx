import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"
import { DayCalendar } from "./DayCalendar"
import { TimeChips } from "./TimeChips"
import { isRecommended } from "./RecommendedMark"

const offers = fixtureCalendarDays(120, "2026-11-30", "2026-12-11")

function Step() {
  const [pick, setPick] = useState<DayTimePick>({ day: "2026-11-30", start: null })
  return <DayCalendar offers={offers} value={pick} onChange={setPick} legend="Pick your day" recommendedStart="10:30" recommendedDay="2026-11-30" />
}

describe("the mark", () => {
  it("is on exactly one time, and none is chosen for the customer", () => {
    render(<Step />)
    const marked = document.querySelectorAll('[data-slot="time-chip"][data-recommended]')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toHaveTextContent("10:30 am")
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true)
  })
  it("is the word Recommended under the time, and the time button reads it", () => {
    render(<Step />)
    expect(screen.getByRole("radio", { name: /10:30 am\s*Recommended$/ })).toBeInTheDocument()
    expect(screen.getAllByText("Recommended")).toHaveLength(1)
  })
  it("marks a time only on its own day, and keeps the mark after the time is chosen", async () => {
    render(<Step />)
    await userEvent.click(screen.getByRole("radio", { name: /10:30 am/ }))
    expect(screen.getByRole("radio", { name: /10:30 am/ })).toBeChecked()
    expect(document.querySelectorAll('[data-recommended]')).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Next month" }))
    await userEvent.click(screen.getByRole("button", { name: "Tuesday, December 1" }))
    expect(document.querySelectorAll('[data-recommended]')).toHaveLength(0)
  })
  it("never says why: no word about Ryan, a town, a route, being nearby or another visit", () => {
    const { container } = render(<Step />)
    expect(container.textContent).not.toMatch(/Ryan|Erie|Longmont|Lafayette|route|near|already|another visit|closest|same/i)
  })
  it("draws nothing without the prop, so the existing step is unchanged", () => {
    const { container } = render(<DayCalendar offers={offers} value={{ day: "2026-11-30", start: null }} onChange={() => {}} legend="Pick your day" />)
    expect(container.querySelector("[data-recommended]")).toBeNull()
    expect(container.querySelector('[data-slot="recommended-mark"]')).toBeNull()
  })
  it("TimeChips marks the one time too", () => {
    render(<TimeChips options={offers[0]!.times} value={null} onChange={() => {}} legend="Times" recommendedStart="10:30" />)
    expect(document.querySelectorAll('[data-slot="time-chip"][data-recommended]')).toHaveLength(1)
  })
})

describe("helpers", () => {
  it("isRecommended needs the start and, when given, the day", () => {
    expect(isRecommended("10:30", "2026-11-30", "10:30", "2026-11-30")).toBe(true)
    expect(isRecommended("10:30", "2026-12-01", "10:30", "2026-11-30")).toBe(false)
    expect(isRecommended("10:30", "2026-12-01", "10:30")).toBe(true)
    expect(isRecommended("11:00", "2026-11-30", "10:30")).toBe(false)
    expect(isRecommended("10:30", "2026-11-30", null)).toBe(false)
  })
})
