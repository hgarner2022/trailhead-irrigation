import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassPageScreen } from "./PassPageScreen"

const pass = snapshot.passes[0] as Pass
const cancelled: Pass = { ...pass, status: "cancelled" }
const rows = () => Array.from(document.querySelectorAll('[data-slot="pass-visit-row"]'))

describe("PassPageScreen", () => {
  it("shows the pass card, the three visits with their state and the card on file", () => {
    render(<PassPageScreen pass={pass} today="2026-11-12" />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Season Pass")
    expect(screen.getByRole("article", { name: /Season Pass 2027 for Andrea, Erie/ })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Your 2027 season: turn-on done on April 20/ })).toBeInTheDocument()
    expect(rows().map((r) => r.textContent)).toEqual([
      "Spring turn-onApril 20Completed",
      "Mid-season inspectionJulyNot scheduled",
      "Fall blowoutWeek of October 4Not scheduled",
    ])
    expect(screen.getByText("Visa ending 4242, expires 08/28")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Update card" })).toBeInTheDocument()
  })

  it("asks before cancelling and says what cancelling does", () => {
    render(<PassPageScreen pass={pass} today="2026-11-12" />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancel my pass" }))
    const dialog = screen.getByRole("dialog", { name: "Cancel your Season Pass?" })
    expect(dialog).toHaveTextContent("Nothing further is charged. Your reserved blowout week is released.")
    expect(screen.getByRole("button", { name: "Cancel the pass" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Keep my pass" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows the grey card and one line for a cancelled pass", () => {
    render(<PassPageScreen pass={cancelled} today="2026-11-12" />)
    expect(screen.getByRole("article", { name: /cancelled$/ })).toBeInTheDocument()
    expect(screen.getByText(/This pass is cancelled/)).toBeInTheDocument()
    expect(rows()).toHaveLength(0)
    expect(screen.queryByText("Card on file")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel my pass" })).not.toBeInTheDocument()
  })
})
