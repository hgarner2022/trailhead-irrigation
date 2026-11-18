import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NextVisitCard, type NextVisitProps } from "./NextVisitCard"

const booked: NextVisitProps = { heading: "Wednesday, April 28", detail: "We'll text your window the day before.", service: "Spring turn-on", where: "412 Briggs Street, Erie", label: "Season Pass 2027", mustBeHome: true, href: "/account/visits/v1" }

describe("NextVisitCard", () => {
  it("shows the day, the sentence about the window, what and where, the pass label and Someone must be home", () => {
    render(<NextVisitCard visit={{ ...booked, actions: <button>Reschedule</button> }} />)
    expect(screen.getByRole("heading", { name: "Wednesday, April 28" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Wednesday, April 28" })).toHaveAttribute("href", "/account/visits/v1")
    expect(screen.getByText("We'll text your window the day before.")).toBeInTheDocument()
    expect(screen.getByText("Spring turn-on · 412 Briggs Street, Erie")).toBeInTheDocument()
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("Someone must be home")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument()
  })

  it("leaves Someone must be home out when the property does not say so", () => {
    render(<NextVisitCard visit={{ ...booked, mustBeHome: false }} />)
    expect(screen.queryByText("Someone must be home")).toBeNull()
  })

  it("says the window and who is coming once it was told", () => {
    render(<NextVisitCard visit={{ ...booked, detail: "Between 8 and 10 am, with Ryan." }} />)
    expect(screen.getByText("Between 8 and 10 am, with Ryan.")).toBeInTheDocument()
  })

  it("says Nothing booked right now with Book Online when there is no visit", () => {
    render(<NextVisitCard visit={null} />)
    expect(screen.getByRole("heading", { name: "Nothing booked right now." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Book Online" })).toHaveAttribute("href", "/book")
  })

  it("is top-aligned in its grid, never stretched to a neighbour", () => {
    render(<NextVisitCard visit={booked} />)
    expect(document.querySelector("[data-slot=next-visit]")).toHaveClass("self-start")
  })
})
