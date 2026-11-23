import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ZonePicker } from "./ZonePicker"

function Harness({ start = 8 }) {
  const [zones, setZones] = useState(start)
  return (
    <>
      <ZonePicker value={zones} onChange={setZones} />
      <output>{zones}</output>
    </>
  )
}

describe("ZonePicker", () => {
  it("offers 6 or fewer, 7 to 12 and More than 12", () => {
    render(<Harness />)
    expect(screen.getByRole("button", { name: "6 or fewer" })).toBeInTheDocument()
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["6 or fewer", "7 zones", "8 zones", "9 zones", "10 zones", "11 zones", "12 zones", "More than 12"])
    expect(screen.getByRole("button", { name: "8 zones" })).toHaveAttribute("aria-pressed", "true")
  })
  it("counts six for 6 or fewer and a quick pick as itself", async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: "6 or fewer" }))
    expect(screen.getByRole("status")).toHaveTextContent("6")
    await userEvent.click(screen.getByRole("button", { name: "11 zones" }))
    expect(screen.getByRole("status")).toHaveTextContent("11")
  })
  it("opens a number box for More than 12, from 13, and takes any count above it", async () => {
    render(<Harness />)
    expect(screen.queryByLabelText("Number of zones")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "More than 12" }))
    const box = screen.getByLabelText("Number of zones")
    expect(box).toHaveValue("13")
    expect(screen.getByRole("status")).toHaveTextContent("13")
    await userEvent.clear(box)
    await userEvent.type(box, "24")
    expect(screen.getByRole("status")).toHaveTextContent("24")
    // a count under 13 is not taken in this box: the last good count stays
    await userEvent.clear(box)
    await userEvent.type(box, "9")
    expect(screen.getByRole("status")).toHaveTextContent("24")
  })
  it("starts on More than 12 when the count is already above it", () => {
    render(<Harness start={18} />)
    expect(screen.getByLabelText("Number of zones")).toHaveValue("18")
    expect(screen.getByRole("button", { name: "More than 12" })).toHaveAttribute("aria-pressed", "true")
  })
})
