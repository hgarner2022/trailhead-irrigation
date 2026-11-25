import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BookedCard } from "./BookedCard"

describe("BookedCard", () => {
  it("reads the service, the day with its exact time once, the street and who is coming, and never a window", () => {
    const { container } = render(<BookedCard service="Sprinkler repair" day="Tuesday, April 20" time="10:30 am" where="123 Briggs St, Erie" interactive={false} />)
    expect(screen.getByText("Sprinkler repair")).toBeInTheDocument()
    expect(screen.getByText("at 10:30 am")).toBeInTheDocument()
    expect(screen.getByText("123 Briggs St, Erie. Ryan is coming.")).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/between|arrives|window/i)
    expect(container.querySelector("[data-slot=pass-card-sheen]")).not.toBeNull()
  })

  it("is the clean wallet card for a Season Pass: the name, the status and the town and zones, with nothing dark over the art and no visits on it", () => {
    const { container } = render(<BookedCard service="Season Pass 2027" status="Set up" detail="Erie · 8 zones" where="123 Briggs St, Erie" interactive={false} />)
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("Set up")).toBeInTheDocument()
    expect(screen.getByText("Erie · 8 zones")).toBeInTheDocument()
    expect(container.querySelector("[data-slot=booked-card-band]")).toBeNull()
    expect(container.querySelector("article")).toHaveClass("aspect-[8/5]")
    expect(screen.getByRole("article")).toHaveAccessibleName("Season Pass 2027, set up, Erie · 8 zones")
  })
})
