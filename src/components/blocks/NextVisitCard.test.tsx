import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NextVisitCard } from "./NextVisitCard"

const booked = { name: "Spring turn-on", scheduledOn: "2027-04-28", startTime: "09:00", durationMinutes: 120, personFirstName: "Ryan", mustBeHome: true }

describe("NextVisitCard", () => {
  it("shows the day, the arrival window, who is coming, what, and Must be home", () => {
    render(<NextVisitCard today="2027-04-14" visit={booked} change="yes" action={<button>Change my day</button>} />)
    expect(screen.getByRole("heading", { name: "Wednesday, April 28" })).toBeInTheDocument()
    expect(screen.getByText("Arrive between 9 and 11 am")).toBeInTheDocument()
    expect(screen.getByText("Ryan · Spring turn-on")).toBeInTheDocument()
    expect(screen.getByText("Must be home")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Change my day" })).toBeInTheDocument()
  })

  it("leaves Must be home out when the property does not say so", () => {
    render(<NextVisitCard today="2027-04-14" visit={{ ...booked, mustBeHome: false }} />)
    expect(screen.queryByText("Must be home")).toBeNull()
  })

  it("gives the phone number instead of the button once the day is within two days", () => {
    render(<NextVisitCard today="2027-04-14" visit={booked} change="call" action={<button>Change my day</button>} />)
    expect(screen.queryByRole("button", { name: "Change my day" })).toBeNull()
    expect(screen.getByRole("link", { name: "(970) 692-7270" })).toHaveAttribute("href", "tel:9706927270")
  })

  it("says Pick a day, Day coming soon or Needs a new day for a visit with no day", () => {
    const open = { ...booked, scheduledOn: null, startTime: null }
    const { rerender } = render(<NextVisitCard today="2027-04-14" visit={open} canPick />)
    expect(screen.getByRole("heading", { name: "Pick a day" })).toBeInTheDocument()
    rerender(<NextVisitCard today="2027-04-14" visit={open} canPick={false} />)
    expect(screen.getByRole("heading", { name: "Day coming soon" })).toBeInTheDocument()
    rerender(<NextVisitCard today="2027-04-14" visit={{ ...open, notDoneReason: "no water on" }} canPick />)
    expect(screen.getByRole("heading", { name: "Needs a new day" })).toBeInTheDocument()
    expect(screen.getByText("We couldn't finish this one: no water on.")).toBeInTheDocument()
  })

  it("says Nothing booked with Book Online when there is no visit", () => {
    render(<NextVisitCard today="2027-04-14" visit={null} />)
    expect(screen.getByRole("heading", { name: "Nothing booked" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Book Online" })).toHaveAttribute("href", "/book")
  })
})
