import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { AddToCalendar } from "./AddToCalendar"

const pass = (snapshot as AdminData).passes[0]!
const visit = { ...pass.visits[0]!, completedAt: undefined, id: "v1", scheduledAt: "2027-05-05T14:00:00Z", scheduledOn: "2027-05-05", startTime: "08:00", calendarUrl: "https://x.test/api/visits/v1/calendar.ics?token=t" }

describe("AddToCalendar", () => {
  it("offers Google and the .ics for a booked visit", () => {
    render(<AddToCalendar pass={pass} visit={visit} name="Turn-on" />)
    expect(screen.getByRole("link", { name: "Google" }).getAttribute("href")).toContain("calendar.google.com/calendar/render")
    expect(screen.getByRole("link", { name: "Apple or Outlook" }).getAttribute("href")).toBe(visit.calendarUrl)
  })
  it("shows nothing for a visit with no day or one that is done", () => {
    expect(render(<AddToCalendar pass={pass} visit={{ ...visit, scheduledOn: undefined }} name="Turn-on" />).container).toBeEmptyDOMElement()
    expect(render(<AddToCalendar pass={pass} visit={{ ...visit, completedAt: "2027-05-05T20:00:00Z" }} name="Turn-on" />).container).toBeEmptyDOMElement()
  })
})
