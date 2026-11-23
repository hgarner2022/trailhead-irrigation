import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"
import { DayCalendar } from "./DayCalendar"

const offers = fixtureCalendarDays(120, "2027-04-15")

function Harness({ initial = { day: "2027-04-15", start: null } as DayTimePick, list = offers }) {
  const [pick, setPick] = useState(initial)
  return <DayCalendar offers={list} value={pick} onChange={setPick} legend="Pick your day" />
}

describe("DayCalendar", () => {
  it("shows the month with the soonest open day selected and marked, a recommended day marked and a full day greyed", () => {
    render(<Harness />)
    expect(screen.getByRole("grid", { name: "Pick your day, April 2027" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Thursday, April 15, soonest" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Monday, April 19, recommended" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "Wednesday, April 21, no times open" })).toHaveAttribute("aria-disabled", "true")
    // days before the first open day are greyed too, and nothing is hidden
    expect(screen.getByRole("button", { name: "Wednesday, April 14, no times open" })).toHaveAttribute("aria-disabled", "true")
  })
  it("shows only the chosen day's times, soonest first, with the best fit marked and none selected", () => {
    render(<Harness initial={{ day: "2027-04-19", start: null }} />)
    expect(screen.getByRole("group", { name: /Times on Monday, April 19/ })).toBeInTheDocument()
    const times = screen.getAllByRole("radio")
    expect(times.length).toBeGreaterThan(3)
    expect(times.every((t) => !(t as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByRole("radio", { name: /10:30 am.*Best fit/ })).toBeInTheDocument()
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
})
