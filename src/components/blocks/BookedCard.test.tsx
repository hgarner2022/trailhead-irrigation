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
})
