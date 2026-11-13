import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { dayVisits } from "./week-grid-days"
import { DayMap } from "./DayMap"

// jsdom has no WebGL, so the block takes its fallback path here; the map
// itself is covered by the story test in a browser and by the helpers'
// unit tests.
const data = snapshot as AdminData
const friday = dayVisits(data.visits, "2026-11-13", undefined, TIME_ZONE)

describe("DayMap", () => {
  it("shows the fallback where there is no WebGL", () => {
    render(<DayMap stops={friday} trucks={data.settings.trucks} onSelect={() => {}} />)
    const block = document.querySelector('[data-slot="day-map"]')
    expect(block).toHaveAttribute("data-state", "unsupported")
    expect(screen.getByText("Map needs a browser")).toBeInTheDocument()
    expect(screen.getByText(/once the page is open in a browser with WebGL/)).toBeInTheDocument()
    expect(screen.queryByRole("region")).toBeNull()
  })
})
