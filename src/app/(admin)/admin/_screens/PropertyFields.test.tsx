import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Yard } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { PropertyBlock, yardChanges } from "./PropertyFields"

const yard: Yard = { zones: 8, controller: "Rachio 3", gateCode: "4471", mustBeHome: false, contactName: "Dana", contactPhone: "+19705550123" }
const actionsWith = (updateProperty: VisitActions["updateProperty"]) => ({ updateProperty }) as VisitActions

describe("PropertyBlock", () => {
  it("says what is set, and Nothing on file yet when nothing is", () => {
    const { unmount } = render(<PropertyBlock propertyId="p1" yard={yard} />)
    expect(screen.getByText("8 zones")).toBeInTheDocument()
    expect(screen.getByText("Gate code 4471")).toBeInTheDocument()
    unmount()
    render(<PropertyBlock propertyId="p1" yard={{ mustBeHome: false }} />)
    expect(screen.getByText("Nothing on file yet")).toBeInTheDocument()
  })

  it("gives a tech no Edit, no gate code and no phone", () => {
    render(<PropertyBlock propertyId="p1" yard={yard} readOnly />)
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
    expect(screen.queryByText(/Gate code/)).not.toBeInTheDocument()
    expect(screen.getByText("Contact Dana")).toBeInTheDocument()
  })

  it("saves only what changed, then goes back to the lines", async () => {
    const updateProperty = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<PropertyBlock propertyId="p1" yard={yard} actions={actionsWith(updateProperty)} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit" }))
    const zones = screen.getByLabelText("Zones")
    await userEvent.clear(zones)
    await userEvent.type(zones, "10")
    await userEvent.clear(screen.getByLabelText("Controller"))
    await userEvent.click(screen.getByLabelText("Must be home"))
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(updateProperty).toHaveBeenCalledWith("p1", { zones: 10, controller: null, mustBeHome: true })
    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument()
  })

  it("keeps the form open and shows the API's words when a save is refused", async () => {
    const updateProperty = vi.fn().mockResolvedValue({ ok: false, message: "Zones must be 16 or fewer" })
    render(<PropertyBlock propertyId="p1" yard={yard} actions={actionsWith(updateProperty)} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit" }))
    await userEvent.type(screen.getByLabelText("Gate code"), "9")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Zones must be 16 or fewer")
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })

  it("Cancel throws the edits away", async () => {
    const updateProperty = vi.fn()
    render(<PropertyBlock propertyId="p1" yard={yard} actions={actionsWith(updateProperty)} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit" }))
    await userEvent.type(screen.getByLabelText("Gate code"), "9")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(updateProperty).not.toHaveBeenCalled()
    expect(screen.getByText("Gate code 4471")).toBeInTheDocument()
  })
})

describe("yardChanges", () => {
  it("is empty when nothing changed", () => {
    const draft = { zones: "8", controller: "Rachio 3", backflowLocation: "", gateCode: "4471", mustBeHome: false, accessNote: "", contactName: "Dana", contactPhone: "+19705550123", notes: "" }
    expect(yardChanges(yard, draft)).toEqual({})
  })
})
