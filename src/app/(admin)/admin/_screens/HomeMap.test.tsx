import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Person, Visit } from "@/lib/admin/types"
import { HomeMap } from "./HomeMap"

// The map is drawn in the browser; jsdom gets a stand-in, since only the card's words are under test.
vi.mock("./ScheduleDayMap", () => ({ ScheduleDayMap: () => <div data-testid="map" /> }))

const people = [{ id: "p1", name: "Ryan Garner" }] as unknown as Person[]
const visit = (id: string, status: Visit["status"]): Visit => ({ id, clientId: "c", clientName: "Dana Reed", town: "Erie", kind: "repair", status, isPass: false, jobberUrl: "" })

describe("HomeMap", () => {
  it("draws the map and the legend while a stop is left", () => {
    render(<HomeMap visits={[visit("a", "completed"), visit("b", "scheduled")]} people={people} />)
    expect(screen.getByTestId("map")).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "People on the map" })).toBeInTheDocument()
    expect(screen.queryByText("No stops left today")).toBeNull()
  })

  it("says No stops left today when every stop is done, instead of a blank map", () => {
    render(<HomeMap visits={[visit("a", "completed")]} people={people} />)
    expect(screen.getByText("No stops left today")).toBeInTheDocument()
    expect(screen.queryByTestId("map")).toBeNull()
  })

  it("says it too when nothing is booked", () => {
    render(<HomeMap visits={[]} people={people} />)
    expect(screen.getByText("No stops left today")).toBeInTheDocument()
  })
})
