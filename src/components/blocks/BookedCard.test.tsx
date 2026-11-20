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

  it("lists every visit of a Season Pass with its exact day and time or its preference and when it is scheduled", () => {
    render(
      <BookedCard
        service="Season Pass 2027"
        visits={[
          { name: "Spring turn-on", when: "Tuesday, April 27 at 10:30 am" },
          { name: "Fall blowout", when: "Preference: Early October", note: "We'll schedule it about two weeks before and tell you the day." },
        ]}
        where="123 Briggs St, Erie"
        interactive={false}
      />,
    )
    expect(screen.getByText("Tuesday, April 27 at 10:30 am")).toBeInTheDocument()
    expect(screen.getByText("Preference: Early October")).toBeInTheDocument()
    expect(screen.getByText("We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
    expect(screen.getByRole("article")).toHaveAccessibleName(/Fall blowout Preference: Early October/)
  })
})
