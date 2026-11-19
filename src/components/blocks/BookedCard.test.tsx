import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BookedCard } from "./BookedCard"

describe("BookedCard", () => {
  it("shows the service, the day, the booked time, the arrival half hour and the street", () => {
    render(<BookedCard service="Sprinkler repair" day="Tuesday, April 20" time="10:30 am" window="between 10:30 and 11:00 am" where="123 Briggs St, Erie" />)
    expect(screen.getByText("Sprinkler repair")).toBeInTheDocument()
    expect(screen.getByText("Tuesday, April 20")).toBeInTheDocument()
    expect(screen.getByText("at 10:30 am")).toBeInTheDocument()
    expect(screen.getByText("Ryan arrives between 10:30 and 11:00 am.")).toBeInTheDocument()
    expect(screen.getByText("123 Briggs St, Erie")).toBeInTheDocument()
  })
})
