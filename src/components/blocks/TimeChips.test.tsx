import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { TimeChips } from "./TimeChips"
import { TimeField } from "./TimeField"

const options = [{ start: "08:00" }, { start: "09:30" }, { start: "13:00" }]

function Chips({ anyTime = false, initial = null as string | null }) {
  const [value, setValue] = useState(initial)
  return <TimeChips options={options} value={value} onChange={setValue} anyTime={anyTime} legend="Thursday, April 15" />
}

describe("TimeChips", () => {
  it("draws each start as one chip on a 12 hour clock, none chosen until one is pressed, and the chosen one settles in", async () => {
    render(<Chips />)
    expect(screen.getByRole("group", { name: "Thursday, April 15" })).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(3)
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true)
    await userEvent.click(screen.getByRole("radio", { name: "9:30 am" }))
    expect(screen.getByRole("radio", { name: "9:30 am" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "9:30 am" }).nextElementSibling).toHaveClass("settle")
  })
  it("puts Any time first and holds it while the value is null", async () => {
    render(<Chips anyTime />)
    expect(screen.getAllByRole("radio")[0]).toBe(screen.getByRole("radio", { name: "Any time" }))
    expect(screen.getByRole("radio", { name: "Any time" })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "1:00 pm" }))
    expect(screen.getByRole("radio", { name: "Any time" })).not.toBeChecked()
  })
})

describe("TimeField", () => {
  function Field() {
    const [value, setValue] = useState("09:00")
    return <TimeField label="Ryan day starts" value={value} onChange={setValue} />
  }
  it("reads the time, opens the chips in a popover, and a chosen time closes it", async () => {
    render(<Field />)
    await userEvent.click(screen.getByRole("button", { name: "Ryan day starts, 9:00 am" }))
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(30)
    await userEvent.click(screen.getByRole("radio", { name: "6:30 am" }))
    expect(screen.getByRole("button", { name: "Ryan day starts, 6:30 am" })).toBeInTheDocument()
    expect(screen.queryByRole("radio")).toBeNull()
  })
  it("keeps a stored time off the half hour on offer", async () => {
    render(<TimeField label="Ryan day starts" value="07:15" onChange={() => {}} />)
    await userEvent.click(screen.getByRole("button", { name: "Ryan day starts, 7:15 am" }))
    expect(screen.getByRole("radio", { name: "7:15 am" })).toBeChecked()
  })
})
