import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AddToCalendarLinks } from "./AddToCalendarLinks"

describe("AddToCalendarLinks", () => {
  it("offers Google and the signed .ics file", () => {
    render(<AddToCalendarLinks googleHref="https://calendar.google.com/calendar/render?x=1" icsHref="https://site.test/api/visits/v1/calendar.ics?token=t" />)
    expect(screen.getByText("Add to calendar")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Google" })).toHaveAttribute("href", "https://calendar.google.com/calendar/render?x=1")
    expect(screen.getByRole("link", { name: "Apple or Outlook" })).toHaveAttribute("href", "https://site.test/api/visits/v1/calendar.ics?token=t")
  })
})
