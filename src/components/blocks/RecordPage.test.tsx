import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { RecordPage } from "./RecordPage"

describe("RecordPage", () => {
  it("has the title as the one h1 with the badge beside it, the actions in their own region and the aside labelled", () => {
    const { container } = render(
      <RecordPage title="Andrea Reyes" subtitle="Repair" badges={<span>Scheduled</span>} band={<p>band</p>} aside={<p>aside</p>} actions={<button type="button">Move</button>}>
        <p>main</p>
      </RecordPage>,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Andrea Reyes" })).toBeInTheDocument()
    expect(container.querySelector("[data-slot=record-page-badges]")).toHaveTextContent("Scheduled")
    expect(screen.getByRole("button", { name: "Move" }).parentElement).toHaveAttribute("data-slot", "record-page-actions")
    expect(container.querySelector("[data-slot=record-page-main]")).toHaveTextContent("main")
    expect(screen.getByRole("complementary")).toHaveTextContent("aside")
  })

  it("draws no actions region and no aside without them", () => {
    const { container } = render(<RecordPage title="Andrea Reyes" />)
    expect(container.querySelector("[data-slot=record-page-actions]")).toBeNull()
    expect(container.querySelector("aside")).toBeNull()
  })
})
