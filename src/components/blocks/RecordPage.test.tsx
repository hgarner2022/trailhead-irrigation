import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { RecordPage } from "./RecordPage"

describe("RecordPage", () => {
  it("has the title as the one h1, the phone as a tel link and a column per heading", () => {
    render(
      <RecordPage
        title="Andrea Reyes"
        subtitle="Repair"
        phone={{ text: "(970) 555-0123", href: "tel:+19705550123" }}
        columns={[{ heading: "When", rows: [["Day", "Tue"]] }, { heading: "Where", rows: [["Address", "480 Briggs St"]] }]}
        footer={<button type="button">Move</button>}
      />,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Andrea Reyes" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "(970) 555-0123" })).toHaveAttribute("href", "tel:+19705550123")
    expect(screen.getByRole("region", { name: "When" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Where" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move" }).parentElement).toHaveAttribute("data-slot", "record-page-footer")
  })

  it("draws no footer bar without buttons", () => {
    const { container } = render(<RecordPage title="Andrea Reyes" />)
    expect(container.querySelector("[data-slot=record-page-footer]")).toBeNull()
  })
})
