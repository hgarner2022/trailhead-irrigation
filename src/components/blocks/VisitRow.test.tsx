import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VisitRow, type VisitRowProps } from "./VisitRow"

const booked: VisitRowProps = { href: "/account/visits/v1", dayWords: "Wed, Apr 28", service: "Spring turn-on", pill: { status: "scheduled", label: "Booked" }, money: "$120, charged after the visit" }
const inList = (ui: React.ReactElement) => render(<ul>{ui}</ul>)

describe("VisitRow", () => {
  it("is one link to the visit page with the day, the service, the money word and a Booked pill", () => {
    inList(<VisitRow {...booked} />)
    expect(screen.getByRole("link", { name: /Wed, Apr 28/ })).toHaveAttribute("href", "/account/visits/v1")
    expect(screen.getByText("Spring turn-on")).toBeInTheDocument()
    expect(screen.getByText("$120, charged after the visit")).toBeInTheDocument()
    expect(screen.getByText("Booked")).toBeInTheDocument()
  })

  it("carries the Season Pass label, the street and who is coming when it is given them", () => {
    inList(<VisitRow {...booked} label="Season Pass 2027" street="412 Briggs Street" who="Ryan" />)
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("412 Briggs Street")).toBeInTheDocument()
    expect(screen.getByText("Spring turn-on · Ryan")).toBeInTheDocument()
  })

  it("adds a Receipt link beside a paid visit that opens our printable page", () => {
    inList(<VisitRow {...booked} dayWords="Tue, Nov 3, 2026" service="Repair" pill={{ status: "done", label: "Done" }} money="$145 · Paid" tone="paid" receiptHref="/account/receipts/pay_1" />)
    expect(screen.getByRole("link", { name: "Receipt" })).toHaveAttribute("href", "/account/receipts/pay_1")
    expect(screen.getByText("Done")).toBeInTheDocument()
  })

  it("strikes the day of a canceled visit and uses the customer's one word for it", () => {
    inList(<VisitRow {...booked} money="" pill={{ status: "cancelled", label: "Canceled" }} />)
    expect(screen.getByText("Wed, Apr 28")).toHaveClass("line-through")
    expect(screen.getByText("Canceled")).toBeInTheDocument()
  })

  it("says its preference and that we schedule it for a visit with no day, never a prompt to pick one", () => {
    inList(<VisitRow {...booked} dayWords="Our recommended, Mid October" note="We'll schedule it about two weeks before and tell you the day." pill={{ status: "needs-a-day", label: "Not scheduled yet" }} />)
    expect(screen.getByText("Our recommended, Mid October")).toBeInTheDocument()
    expect(screen.getByText("We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
    expect(screen.queryByText(/pick a day|coming soon/i)).toBeNull()
  })
})
