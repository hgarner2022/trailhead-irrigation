import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NextVisitCard, type NextVisitProps } from "./NextVisitCard"

const booked: NextVisitProps = { heading: "Wednesday, April 28 at 10:30 am", detail: "Ryan is coming.", service: "Spring turn-on", where: "412 Briggs Street, Erie", label: "Season Pass 2027", mustBeHome: true, href: "/account/visits/v1" }

describe("NextVisitCard", () => {
  it("shows the day with its exact time once, who is coming, what and where, the pass label and Someone must be home", () => {
    render(<NextVisitCard visit={{ ...booked, actions: <button>Reschedule</button> }} />)
    expect(screen.getByRole("heading", { name: "Wednesday, April 28 at 10:30 am" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Wednesday, April 28 at 10:30 am" })).toHaveAttribute("href", "/account/visits/v1")
    expect(screen.getByText("Ryan is coming.")).toBeInTheDocument()
    expect(screen.getByText("Spring turn-on · 412 Briggs Street, Erie")).toBeInTheDocument()
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("Someone must be home")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument()
  })

  it("leaves Someone must be home out when the property does not say so", () => {
    render(<NextVisitCard visit={{ ...booked, mustBeHome: false }} />)
    expect(screen.queryByText("Someone must be home")).toBeNull()
  })

  it("leaves the line out when there is nothing to add, and never says a window", () => {
    const { container } = render(<NextVisitCard visit={{ ...booked, detail: null }} />)
    expect(screen.queryByText("Ryan is coming.")).toBeNull()
    expect(container.textContent).not.toMatch(/between|window|arrives/i)
  })

  it("says Nothing booked right now with Book Online when there is no visit", () => {
    render(<NextVisitCard visit={null} />)
    expect(screen.getByRole("heading", { name: "Nothing booked right now." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Book Online" })).toHaveAttribute("href", "/book")
  })

  it("spaces its groups on the scale: 8 inside a group, 16 between groups", () => {
    render(<NextVisitCard visit={{ ...booked, actions: <button>Reschedule</button> }} />)
    const stacks = [...document.querySelectorAll("[data-slot=next-visit] [data-slot=stack]")]
    expect(stacks[0]).toHaveClass("space-y-4")
    expect(stacks.slice(1).every((s) => s.classList.contains("space-y-2"))).toBe(true)
  })
})
