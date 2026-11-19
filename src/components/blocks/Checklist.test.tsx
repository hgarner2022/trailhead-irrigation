import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Checklist, repairChecklist } from "./Checklist"

describe("Checklist", () => {
  it("shows the progress in the title and updates it when a box is ticked", async () => {
    render(<Checklist items={repairChecklist(2)} />)
    expect(screen.getByRole("heading", { name: "Checklist · 2 of 5" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("checkbox", { name: "Set the controller" }))
    expect(screen.getByRole("heading", { name: "Checklist · 3 of 5" })).toBeInTheDocument()
  })

  it("opens a note on an item and has an Add photo on each", async () => {
    render(<Checklist items={repairChecklist(0)} />)
    expect(screen.getAllByRole("button", { name: /Add a photo to/ })).toHaveLength(5)
    await userEvent.click(screen.getByRole("button", { name: "Add a note to Find the leak" }))
    expect(screen.getByRole("textbox", { name: "Note for Find the leak" })).toBeInTheDocument()
  })

  it("says where to set one up when the service has none", () => {
    render(<Checklist items={[]} />)
    expect(screen.getByText("No checklist for this service yet. Set one up in Settings › Services.")).toBeInTheDocument()
  })
})
