import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"
import { DayCalendar } from "./DayCalendar"
import { DayTimePicker } from "./DayTimePicker"
import { RecommendedMark, isRecommended, recommendedChip, type RecommendedLook } from "./RecommendedMark"

const offers = fixtureCalendarDays(120, "2026-11-30", "2026-12-11")

function Step({ look }: { look?: RecommendedLook }) {
  const [pick, setPick] = useState<DayTimePick>({ day: "2026-11-30", start: null })
  return <DayCalendar offers={offers} value={pick} onChange={setPick} legend="Pick your day" recommendedStart="10:30" recommendedDay="2026-11-30" recommendedLook={look} />
}

describe("the mark", () => {
  it("is on exactly one time, and none is chosen for the customer", () => {
    render(<Step />)
    const marked = document.querySelectorAll('[data-slot="time-chip"][data-recommended]')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toHaveTextContent("10:30 am")
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true)
  })
  it("look A is the word Recommended", () => {
    render(<Step look="A" />)
    expect(screen.getByRole("radio", { name: /10:30 am\s*Recommended$/ })).toBeInTheDocument()
  })
  it("look B is a star named Recommended time", () => {
    render(<Step look="B" />)
    expect(screen.getByRole("img", { name: "Recommended time" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /10:30 am\s*Recommended time/ })).toBeInTheDocument()
  })
  it("look C is an outline with Suggested above the time", () => {
    render(<Step look="C" />)
    const chip = document.querySelector('[data-slot="time-chip"][data-recommended]')!
    expect(chip.className).toContain("border-primary-dark")
    expect(chip.firstElementChild).toHaveTextContent("Suggested")
    expect(screen.getByRole("radio", { name: /Suggested\s*time\s*10:30 am/ })).toBeInTheDocument()
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
    for (const look of ["A", "B", "C"] as const) {
      const { container, unmount } = render(<Step look={look} />)
      expect(container.textContent).not.toMatch(/Ryan|Erie|Longmont|Lafayette|route|near|already|another visit|closest|same/i)
      unmount()
    }
  })
  it("draws nothing without the prop, so the existing step is unchanged", () => {
    const { container } = render(<DayCalendar offers={offers} value={{ day: "2026-11-30", start: null }} onChange={() => {}} legend="Pick your day" />)
    expect(container.querySelector("[data-recommended]")).toBeNull()
    expect(container.querySelector('[data-slot="recommended-mark"]')).toBeNull()
  })
  it("DayTimePicker marks the one time too", () => {
    render(<DayTimePicker offers={offers} value={{ day: "2026-11-30", start: null }} onChange={() => {}} legend="Pick your day" recommendedStart="10:30" recommendedDay="2026-11-30" timesShown={20} />)
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
  it("only look C changes the button, and not once it is chosen", () => {
    expect(recommendedChip("A")).toBe("")
    expect(recommendedChip("B")).toBe("")
    expect(recommendedChip("C")).toContain("border-primary-dark")
    expect(recommendedChip("C", true)).toBe("")
  })
  it("draws each look in only its own position", () => {
    const { container } = render(<RecommendedMark look="A" position="before" />)
    expect(container).toBeEmptyDOMElement()
  })
})
