import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SectionCard } from "./SectionCard"
import { SummaryBand } from "./SummaryBand"
import { AsideCard } from "./AsideCard"
import { RecordFacts } from "./RecordPanel"
import { StatusPill } from "./StatusPill"

describe("SectionCard", () => {
  it("is a labelled white region with its title as an h2 and the action in the bar", () => {
    render(<SectionCard title="Billing" id="b" action={<button type="button">Edit</button>}>body</SectionCard>)
    const region = screen.getByRole("region", { name: "Billing" })
    expect(region).toHaveClass("bg-card", "border")
    expect(screen.getByRole("heading", { level: 2, name: "Billing" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
  })

  it("draws no title bar when it has no title, and no padding when flush", () => {
    const { container } = render(<SectionCard flush>grid</SectionCard>)
    expect(container.querySelector("[data-slot=section-card-bar]")).toBeNull()
    expect(container.querySelector("[data-slot=section-card-body]")?.className ?? "").not.toContain("px-5")
  })
})

describe("SummaryBand", () => {
  it("is a term and a value per cell, with the alert tone for Past due", () => {
    render(<SummaryBand items={[{ label: "When", value: "Tue, Nov 24", sub: "Any time" }, { label: "Total", value: "$145", sub: "Past due since Nov 17", tone: "alert" }]} />)
    expect(screen.getByText("When")).toBeInTheDocument()
    expect(screen.getByText("$145")).toHaveClass("text-destructive")
    expect(screen.getByText("Tue, Nov 24")).toHaveClass("text-navy")
  })
})

describe("AsideCard", () => {
  it("has the name as the one link, the phone as a tel link and the address", () => {
    render(<AsideCard name="Andrea Dalton" href="/admin/customers/1" phone={{ text: "(970) 555-0123", href: "tel:+19705550123" }} address={["480 Briggs St", "Erie, CO"]} />)
    expect(screen.getByRole("link", { name: "Andrea Dalton" })).toHaveAttribute("href", "/admin/customers/1")
    expect(screen.getByRole("link", { name: "(970) 555-0123" })).toHaveAttribute("href", "tel:+19705550123")
    expect(screen.getByText("480 Briggs St")).toBeInTheDocument()
    expect(screen.getByText("AD")).toBeInTheDocument()
  })
})

describe("RecordFacts divided", () => {
  it("puts a hairline between rows", () => {
    const { container } = render(<RecordFacts divided rows={[["Gate code", "4417"], ["Must be home", "No"]]} />)
    expect(container.querySelector("dl")).toHaveClass("divide-y")
  })
})

describe("StatusPill dot", () => {
  it("draws a dot that is hidden from assistive tech, and a larger size for a page header", () => {
    const { container } = render(<StatusPill status="paid" size="lg" />)
    expect(container.querySelector("[data-slot=status-dot]")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("Paid")).toHaveAttribute("data-size", "lg")
  })
})
