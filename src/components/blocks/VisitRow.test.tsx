import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VisitRow } from "./VisitRow"

const booked = { name: "Spring turn-on", status: "scheduled", scheduledOn: "2027-04-28", startTime: "09:00", durationMinutes: 120, personFirstName: "Ryan" }
const inList = (ui: React.ReactElement) => render(<ul>{ui}</ul>)

describe("VisitRow", () => {
  it("shows the day, what and who, the window and a Booked pill", () => {
    inList(<VisitRow visit={booked} />)
    expect(screen.getByText("Wednesday, April 28")).toBeInTheDocument()
    expect(screen.getByText("Spring turn-on · Ryan")).toBeInTheDocument()
    expect(screen.getByText("Arrive between 9 and 11 am")).toBeInTheDocument()
    expect(screen.getByText("Booked")).toBeInTheDocument()
  })

  it("uses the customer's word for each of the other states", () => {
    const { rerender } = inList(<VisitRow visit={{ ...booked, status: "completed" }} />)
    expect(screen.getByText("Done")).toBeInTheDocument()
    rerender(<ul><VisitRow visit={{ name: "Fall blowout", status: "unscheduled", scheduledOn: null }} canPick /></ul>)
    expect(screen.getByText("Pick a day")).toBeInTheDocument()
    rerender(<ul><VisitRow visit={{ name: "Fall blowout", status: "unscheduled", scheduledOn: null }} /></ul>)
    expect(screen.getByText("Day coming soon")).toBeInTheDocument()
    rerender(<ul><VisitRow visit={{ name: "Spring turn-on", status: "unscheduled", scheduledOn: null, notDoneReason: "no water on" }} canPick /></ul>)
    expect(screen.getByText("Needs a new day")).toBeInTheDocument()
    expect(screen.getByText("We couldn't finish this one: no water on.")).toBeInTheDocument()
    rerender(<ul><VisitRow visit={{ ...booked, status: "cancelled" }} /></ul>)
    expect(screen.getByText("Canceled")).toBeInTheDocument()
  })

  it("shows the change control, or the phone number when the day is too close", () => {
    const { rerender } = inList(<VisitRow visit={booked} change="yes" action={<button>Change my day</button>} />)
    expect(screen.getByRole("button", { name: "Change my day" })).toBeInTheDocument()
    rerender(<ul><VisitRow visit={booked} change="call" action={<button>Change my day</button>} /></ul>)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("link", { name: "(970) 692-7270" })).toBeInTheDocument()
  })
})
