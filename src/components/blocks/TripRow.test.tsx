import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TripRow } from "./TripRow"

describe("TripRow", () => {
  it("shows the service, its detail, the money word and its actions", () => {
    render(<ul><TripRow title="Spring turn-on" detail="Mon, May 3 · Ryan" money="$145, charged after the visit" actions={[{ label: "Move" }, { label: "Mark done" }]} /></ul>)
    expect(screen.getByText("Spring turn-on")).toBeInTheDocument()
    expect(screen.getByText("$145, charged after the visit")).toBeInTheDocument()
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Move", "Mark done"])
  })

  it("never draws a third action", () => {
    render(<ul><TripRow title="Blowout" actions={[{ label: "A" }, { label: "B" }, { label: "C" }]} /></ul>)
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("says nothing due with a dash for a trip not yet done", () => {
    render(<ul><TripRow title="Blowout" money={null} /></ul>)
    expect(screen.getByText("Nothing due")).toBeInTheDocument()
  })
})
