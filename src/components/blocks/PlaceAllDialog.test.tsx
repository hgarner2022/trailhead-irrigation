import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PlaceAllDialog, type PlaceAllRow } from "./PlaceAllDialog"

const rows: PlaceAllRow[] = [
  { id: "a", who: "Andrea Reyes, Erie", what: "Repair", where: "Tue Nov 24, Ryan Garner" },
  { id: "b", who: "Jim Park, Erie", what: "Spring turn-on", where: "Wed Nov 25, Sam Lee" },
]

describe("PlaceAllDialog", () => {
  it("lists who goes where and confirms with the count", async () => {
    const onConfirm = vi.fn()
    render(<PlaceAllDialog rows={rows} open onOpenChange={() => {}} onConfirm={onConfirm} />)
    const dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByRole("heading", { name: "Place all 2" })).toBeInTheDocument()
    expect(dialog.getByText("Andrea Reyes, Erie · Repair")).toBeInTheDocument()
    expect(dialog.getByText("Tue Nov 24, Ryan Garner")).toBeInTheDocument()
    expect(dialog.getByText(/a minute after you confirm/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Place all 2" }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("counts only the jobs with a day in the button and says why the others wait", () => {
    render(<PlaceAllDialog rows={[...rows, { id: "c", who: "Cy Bell, Lafayette", what: "Repair", problem: "No open day before Jun 15. Pick a day yourself." }]} open onOpenChange={() => {}} onConfirm={() => {}} />)
    const dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByRole("button", { name: "Place 2" })).toBeEnabled()
    expect(dialog.getByText("No open day before Jun 15. Pick a day yourself.")).toBeInTheDocument()
  })

  it("cannot confirm when nothing has room", () => {
    render(<PlaceAllDialog rows={[{ id: "c", who: "Cy Bell, Lafayette", what: "Repair", problem: "No open day before Jun 15. Pick a day yourself." }]} open onOpenChange={() => {}} onConfirm={() => {}} />)
    expect(screen.getByRole("button", { name: "Place 0" })).toBeDisabled()
  })
})
