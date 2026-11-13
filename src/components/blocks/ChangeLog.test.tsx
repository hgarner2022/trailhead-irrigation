import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import type { SettingsChange } from "@/lib/admin/types"
import { ChangeLog } from "./ChangeLog"

const changes: SettingsChange[] = [
  { id: "sc1", at: "2026-11-05T16:20:00Z", who: "Hannah", field: "Truck 2 working days", from: "Mon to Fri", to: "Mon to Sat" },
  { id: "sc2", at: "2026-11-06T22:05:00Z", who: "Ryan", field: "Buffer, first two weeks", from: "25%", to: "20%" },
  { id: "sc3", at: "2026-11-11T20:30:00Z", who: "Hannah", field: "Day-before text", from: "Off", to: "On" },
]

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="change-log"] > li'))

describe("ChangeLog", () => {
  it("lists every change newest first with who, when, the field and both values", () => {
    render(<ChangeLog changes={changes} />)
    expect(rows().map((r) => r.textContent)).toEqual([
      "Hannah · Nov 11, 1:30 pmDay-before text from Off to On",
      "Ryan · Nov 6, 3:05 pmBuffer, first two weeks from 25% to 20%",
      "Hannah · Nov 5, 9:20 amTruck 2 working days from Mon to Fri to Mon to Sat",
    ])
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(rows()[0].querySelector("time")).toHaveAttribute("dateTime", "2026-11-11T20:30:00Z")
  })

  it("shows the empty state with no changes", () => {
    render(<ChangeLog changes={[]} />)
    expect(rows()).toHaveLength(0)
    expect(document.querySelector('[data-slot="empty-state"]')).toHaveTextContent("No changes yet")
  })

  it("puts the later entry first when two share a minute", () => {
    const same: SettingsChange[] = [
      { id: "a", at: "2026-11-12T19:56:30Z", who: "Hannah", field: "First", from: "1", to: "2" },
      { id: "b", at: "2026-11-12T19:56:30Z", who: "Hannah", field: "Second", from: "2", to: "3" },
    ]
    render(<ChangeLog changes={same} />)
    expect(rows().map((r) => r.querySelector(".font-medium")?.textContent)).toEqual(["Second", "First"])
  })
})
