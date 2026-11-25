import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { DayMapProps } from "./DayMap"
import { MapPanel } from "./MapPanel"
import { PEOPLE, STOPS, UNSCHEDULED } from "./scheduler-panels-fixtures"

// The map itself needs WebGL, so DayMap is stood in for here and the test reads what the panel hands it.
let last: DayMapProps | undefined
vi.mock("./DayMap", () => ({
  DayMap: (props: DayMapProps) => {
    last = props
    return <div data-testid="day-map" />
  },
}))

vi.stubGlobal("matchMedia", vi.fn((q: string) => ({ matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
afterEach(() => {
  last = undefined
})

describe("MapPanel", () => {
  it("is a docked aside named Map with a chip per person", () => {
    render(<MapPanel open onOpenChange={() => {}} stops={STOPS} people={PEOPLE} day="Tue, Nov 24" />)
    expect(screen.getByRole("complementary", { name: "Map" })).toHaveAttribute("data-mode", "docked")
    expect(screen.getByRole("button", { name: "Ryan Garner" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Tech Two" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "Unscheduled" })).toBeNull()
    expect(last?.stops).toHaveLength(5)
  })
  it("hides one person's stops when their chip is pressed, and keeps everyone's colour by passing every person", async () => {
    render(<MapPanel open onOpenChange={() => {}} stops={STOPS} people={PEOPLE} />)
    await userEvent.click(screen.getByRole("button", { name: "Tech Two" }))
    expect(screen.getByRole("button", { name: "Tech Two" })).toHaveAttribute("aria-pressed", "false")
    expect(last?.stops.every((s) => s.personId === "person_truck-1")).toBe(true)
    expect(last?.people).toHaveLength(2)
  })
  it("draws hollow pins for unscheduled jobs only when they are passed, and its chip hides them", async () => {
    const { rerender } = render(<MapPanel open onOpenChange={() => {}} stops={STOPS} people={PEOPLE} />)
    expect(last?.hollow).toEqual([])
    rerender(<MapPanel open onOpenChange={() => {}} stops={STOPS} people={PEOPLE} unscheduled={UNSCHEDULED} />)
    expect(last?.hollow).toHaveLength(4)
    await userEvent.click(screen.getByRole("button", { name: "Unscheduled" }))
    expect(last?.hollow).toHaveLength(0)
  })
  it("passes the lit pin down and reports a hover back", () => {
    const onHover = vi.fn()
    render(<MapPanel open onOpenChange={() => {}} stops={STOPS} people={PEOPLE} hoverId="v-2" onHover={onHover} />)
    expect(last?.hoverId).toBe("v-2")
    last?.onHover?.("v-3")
    expect(onHover).toHaveBeenCalledWith("v-3")
    last?.onHover?.(undefined)
    expect(onHover).toHaveBeenLastCalledWith(null)
  })
  it("says so when there is nothing to draw", () => {
    render(<MapPanel open onOpenChange={() => {}} stops={[]} people={PEOPLE} />)
    expect(screen.getByRole("status")).toHaveTextContent("No stops on this day.")
  })
})
