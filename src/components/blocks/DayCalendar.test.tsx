import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { OFFICE_STARTS, fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"
import { DayCalendar } from "./DayCalendar"

const offers = fixtureCalendarDays(120, "2027-04-15")

function Harness({ initial = { day: "2027-04-15", start: null } as DayTimePick, list = offers }) {
  const [pick, setPick] = useState(initial)
  return <DayCalendar offers={list} value={pick} onChange={setPick} legend="Pick your day" />
}

describe("DayCalendar, Recommended", () => {
  it("marks the one best time of the held day with the word Recommended when markBest is on, and chooses nothing", () => {
    render(<DayCalendar offers={offers} value={{ day: "2027-04-19", start: null }} onChange={() => {}} legend="Pick your day" markBest />)
    expect(screen.getAllByText("Recommended")).toHaveLength(1)
    const marked = screen.getByText("Recommended").closest("label")!
    expect(marked.querySelector("input")).not.toBeChecked()
    expect(screen.queryByText(/nearby|Ryan|route|already/i)).toBeNull()
  })
  it("moves the mark to that day's own best time and shows none without markBest", () => {
    const { rerender } = render(<DayCalendar offers={offers} value={{ day: "2027-04-15", start: null }} onChange={() => {}} legend="Pick your day" markBest />)
    const first = screen.getByText("Recommended").closest("label")!.textContent
    rerender(<DayCalendar offers={offers} value={{ day: "2027-04-19", start: null }} onChange={() => {}} legend="Pick your day" markBest />)
    expect(screen.getAllByText("Recommended")).toHaveLength(1)
    expect(screen.getByText("Recommended").closest("label")!.textContent).not.toBe(first)
    rerender(<DayCalendar offers={offers} value={{ day: "2027-04-19", start: null }} onChange={() => {}} legend="Pick your day" />)
    expect(screen.queryByText("Recommended")).toBeNull()
  })
})

describe("DayCalendar", () => {
  it("shows the month with the soonest open day selected and marked, a dot on every open day and a full day plain", () => {
    render(<Harness />)
    expect(screen.getByRole("grid", { name: "Pick your day, April 2027" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Thursday, April 15, soonest" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Monday, April 19" })).toHaveAttribute("aria-pressed", "false")
    // an open day carries a dot, a full one does not, and a pressed day settles in with the one scale (reduced motion turns it off in CSS)
    expect(screen.getByRole("button", { name: "Monday, April 19" }).querySelector("span[aria-hidden].rounded-full")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Wednesday, April 21, no times open" }).querySelector("span.rounded-full")).toBeNull()
    expect(screen.getByRole("button", { name: "Thursday, April 15, soonest" })).toHaveClass("settle")
    expect(screen.getByRole("button", { name: "Wednesday, April 21, no times open" })).toHaveAttribute("aria-disabled", "true")
    // days before the first open day are greyed too, and nothing is hidden
    expect(screen.getByRole("button", { name: "Wednesday, April 14, no times open" })).toHaveAttribute("aria-disabled", "true")
  })
  it("shows only the chosen day's times, earliest first, none selected and no label on any", () => {
    render(<Harness initial={{ day: "2027-04-19", start: null }} />)
    expect(screen.getByRole("group", { name: "Monday, April 19" })).toBeInTheDocument()
    const times = screen.getAllByRole("radio")
    expect(times.length).toBeGreaterThan(3)
    expect(times.every((t) => !(t as HTMLInputElement).checked)).toBe(true)
    expect(screen.queryByText(/Best fit|Recommended/)).toBeNull()
    const labels = times.map((t) => t.closest("label")!.textContent!)
    expect(labels[0]).toMatch(/8:00 am/)
  })
  it("picks a day, keeps its time only for that day, and a disabled day cannot be picked", async () => {
    render(<Harness initial={{ day: "2027-04-15", start: null }} />)
    await userEvent.click(screen.getByRole("button", { name: "Wednesday, April 21, no times open" }))
    expect(screen.getByRole("button", { name: "Thursday, April 15, soonest" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(screen.getByRole("button", { name: "Tuesday, April 20" }))
    expect(screen.getByRole("button", { name: "Tuesday, April 20" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(screen.getAllByRole("radio")[0]!)
    expect(screen.getAllByRole("radio")[0]).toBeChecked()
  })
  it("moves by month with the arrows and stops at the first and last month with open days", async () => {
    render(<Harness />)
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Next month" }))
    expect(screen.getByRole("heading", { name: "May 2027" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Monday, May 3" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Next month" }))
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled()
  })
  it("has one day in the tab order and moves by day, week and month with the keys", async () => {
    render(<Harness />)
    const soonest = screen.getByRole("button", { name: "Thursday, April 15, soonest" })
    expect(soonest).toHaveAttribute("tabindex", "0")
    expect(screen.getByRole("button", { name: "Friday, April 16" })).toHaveAttribute("tabindex", "-1")
    soonest.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(await screen.findByRole("button", { name: "Friday, April 16" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(await screen.findByRole("button", { name: /^Friday, April 23/ })).toHaveFocus()
    await userEvent.keyboard("{PageDown}")
    expect(await screen.findByRole("heading", { name: "May 2027" })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /^Sunday, May 23/ })).toHaveFocus()
  })
  it("says the days are full when nothing is open, with the number as a link", () => {
    render(<DayCalendar offers={[]} value={{ day: null, start: null }} onChange={() => {}} legend="Pick your day" />)
    expect(screen.getByRole("status")).toHaveTextContent("These days are full. We'll call you to find one.")
    expect(screen.getByRole("link", { name: /\(970\) 692-7270/ })).toBeInTheDocument()
    expect(screen.queryByRole("grid")).toBeNull()
  })

  it("asks only for a day with timed off: every offer is open, no times show, and Your day is marked even when it is not offered", async () => {
    const days = offers.map((o) => ({ ...o, times: [] }))
    const picks: DayTimePick[] = []
    render(<DayCalendar offers={days} value={{ day: "2027-04-15", start: null }} onChange={(p) => picks.push(p)} legend="Pick your day" timed={false} current="2027-04-14" />)
    expect(screen.queryByRole("radio")).toBeNull()
    const yours = screen.getByRole("button", { name: "Wednesday, April 14, your day, not open" })
    expect(yours).toHaveAttribute("data-current", "true")
    expect(screen.getByText("Your day")).toBeInTheDocument()
    await userEvent.click(yours)
    expect(picks).toEqual([])
    await userEvent.click(screen.getByRole("button", { name: "Monday, April 19" }))
    expect(picks).toEqual([{ day: "2027-04-19", start: null }])
    // a day that was in the full list stays pressable though it had no times
    expect(screen.getByRole("button", { name: "Wednesday, April 21" })).not.toHaveAttribute("aria-disabled")
  })
  it("marks the day the visit has now alongside the open days and the soonest", () => {
    render(<DayCalendar offers={offers} value={{ day: "2027-04-19", start: null }} onChange={() => {}} legend="Pick your day" current="2027-04-19" />)
    expect(screen.getByRole("button", { name: "Monday, April 19, your day" })).toHaveAttribute("data-current", "true")
    expect(screen.getByText("Your day")).toBeInTheDocument()
  })
  it("in the office's mode any day from the first day may be chosen, Any time is first and held, and a Saturday offers the office's starts", async () => {
    const picks: DayTimePick[] = []
    function Office() {
      const [pick, setPick] = useState<DayTimePick>({ day: "2027-04-17", start: null })
      return <DayCalendar offers={[]} value={pick} onChange={(p) => (picks.push(p), setPick(p))} legend="Day" free={{ from: "2027-04-15", timesFor: () => OFFICE_STARTS }} anyTime />
    }
    render(<Office />)
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.queryByText("Soonest")).toBeNull()
    expect(screen.getByRole("button", { name: "Saturday, April 17" })).toHaveAttribute("aria-pressed", "true")
    const times = screen.getAllByRole("radio")
    expect(times).toHaveLength(OFFICE_STARTS.length + 1)
    expect(times[0]).toBeChecked()
    expect(screen.getByRole("button", { name: "Wednesday, April 14, not available" })).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(screen.getByRole("radio", { name: "9:00 am" }))
    expect(picks.at(-1)).toEqual({ day: "2027-04-17", start: "09:00" })
    await userEvent.click(screen.getByRole("radio", { name: "Any time" }))
    expect(picks.at(-1)).toEqual({ day: "2027-04-17", start: null })
  })
})
