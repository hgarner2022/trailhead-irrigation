import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { pickDay, pickMonthDay, pickTime } from "./day-calendar-kit"
import { DayField, DayPopoverField, type DayFieldProps } from "./DayField"

function Harness(props: Partial<DayFieldProps>) {
  const [held, setHeld] = useState({ day: "", start: "" })
  return <DayField label="Day (optional)" from="2026-11-18" {...props} value={held.day} start={held.start} onChange={(day, start) => setHeld({ day, start })} />
}

describe("DayField", () => {
  it("reads No day yet, opens the one calendar, and reads the day and time chosen on it", async () => {
    render(<Harness timed clearable />)
    const field = screen.getByRole("button", { name: "Day (optional), No day yet" })
    expect(screen.queryByRole("grid")).toBeNull()
    await userEvent.click(field)
    expect(screen.getByRole("grid", { name: /^Day \(optional\), November 2026/ })).toBeInTheDocument()
    await pickDay(screen, userEvent, "2026-12-02")
    expect(screen.getByRole("button", { name: "Day (optional), Wednesday, December 2 at any time" })).toBeInTheDocument()
    await pickTime(screen, userEvent, "10:00")
    expect(screen.getByRole("button", { name: "Day (optional), Wednesday, December 2 at 10:00 am" })).toBeInTheDocument()
  })
  it("keeps the time when only the day changes, and Clear the day empties both", async () => {
    render(<Harness timed clearable defaultOpen />)
    await pickDay(screen, userEvent, "2026-11-24")
    await pickTime(screen, userEvent, "09:30")
    await pickDay(screen, userEvent, "2026-11-25")
    expect(screen.getByRole("button", { name: "Day (optional), Wednesday, November 25 at 9:30 am" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Clear the day" }))
    expect(screen.getByRole("button", { name: "Day (optional), No day yet" })).toBeInTheDocument()
  })
  it("does not offer a day before the first day or after the last, and has no clear button unless asked", async () => {
    render(<Harness defaultOpen to="2026-11-30" />)
    expect(screen.getByRole("button", { name: "Tuesday, November 17, not available" })).toHaveAttribute("aria-disabled", "true")
    // the month arrows stop at the last day's month: December cannot be reached
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled()
    await pickDay(screen, userEvent, "2026-11-20")
    expect(screen.queryByRole("button", { name: "Clear the day" })).toBeNull()
  })

  it("DayPopoverField reads the day, opens the calendar in a popover, bounds it, and a chosen day closes it", async () => {
    function Pop() {
      const [value, setValue] = useState<string | null>("2026-11-12")
      return <DayPopoverField label="Move to day" value={value} onChange={setValue} from="2026-11-09" to="2026-11-15" />
    }
    render(<Pop />)
    await userEvent.click(screen.getByRole("button", { name: "Move to day, Thursday, November 12" }))
    expect(screen.getByRole("button", { name: "Sunday, November 8, not available" })).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(screen.getByRole("button", { name: "Friday, November 13" }))
    expect(screen.getByRole("button", { name: "Move to day, Friday, November 13" })).toBeInTheDocument()
    expect(screen.queryByRole("grid")).toBeNull()
  })
  it("DayPopoverField yearless holds a month and a day with no year, clears to Open, and shows no weekday names", async () => {
    function Pop() {
      const [value, setValue] = useState<string | null>(null)
      return <DayPopoverField label="Blowout bookable from" value={value} onChange={setValue} yearless empty="Open" clearable />
    }
    render(<Pop />)
    await userEvent.click(screen.getByRole("button", { name: "Blowout bookable from, Open" }))
    expect(screen.queryByRole("columnheader")).toBeNull()
    expect(screen.getByRole("heading", { name: "January" })).toBeInTheDocument()
    await pickMonthDay(screen, userEvent, "02-29")
    expect(screen.getByRole("button", { name: "Blowout bookable from, February 29" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Blowout bookable from, February 29" }))
    await userEvent.click(screen.getByRole("button", { name: "Clear the day" }))
    expect(screen.getByRole("button", { name: "Blowout bookable from, Open" })).toBeInTheDocument()
  })
})
