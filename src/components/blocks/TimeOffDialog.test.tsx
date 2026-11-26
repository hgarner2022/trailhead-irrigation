import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TimeOffDialog } from "./TimeOffDialog"
import type { TimeOffValue } from "./time-off-model"

const people = [{ id: "a", name: "Ryan Garner" }, { id: "b", name: "Tech Two" }]
const initial: TimeOffValue = { personId: "a", allDay: false, from: "2026-12-04", to: "2026-12-04", startTime: "13:00", endTime: "15:00", note: "" }
const open = (extra: Partial<React.ComponentProps<typeof TimeOffDialog>> = {}) => ({ open: true, onOpenChange: () => {}, people, initial, onSave: () => {}, ...extra })

describe("TimeOffDialog", () => {
  it("has the person, an All day switch, From, To, the times and a staff-only note", () => {
    render(<TimeOffDialog {...open()} />)
    expect(screen.getByRole("dialog", { name: "Time off" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Person" })).toHaveValue("a")
    expect(screen.getByRole("switch", { name: "All day" })).not.toBeChecked()
    expect(screen.getByLabelText("From")).toHaveValue("2026-12-04")
    expect(screen.getByLabelText("To")).toHaveValue("2026-12-04")
    expect(screen.getByRole("combobox", { name: "Start time" })).toHaveValue("13:00")
    expect(screen.getByRole("combobox", { name: "End time" })).toHaveValue("15:00")
    expect(screen.getByText("Staff only")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveAttribute("maxlength", "140")
  })
  it("hides the times when All day is on", async () => {
    render(<TimeOffDialog {...open()} />)
    await userEvent.click(screen.getByRole("switch", { name: "All day" }))
    expect(screen.queryByRole("combobox", { name: "Start time" })).toBeNull()
  })
  it("saves what was entered and closes; Add time off in add mode, Save in edit mode", async () => {
    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    render(<TimeOffDialog {...open({ onSave, onOpenChange })} />)
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "End time" }), "16:00")
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "Dentist")
    await userEvent.click(screen.getByRole("button", { name: "Add time off" }))
    expect(onSave).toHaveBeenCalledWith({ ...initial, endTime: "16:00", note: "Dentist" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  it("refuses an end before the start with the words", async () => {
    const onSave = vi.fn()
    render(<TimeOffDialog {...open({ onSave })} />)
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "End time" }), "12:00")
    await userEvent.click(screen.getByRole("button", { name: "Add time off" }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText("The end is before the start.")).toBeInTheDocument()
  })
  it("lists the visits inside and says they stay", () => {
    render(<TimeOffDialog {...open({ visitsInside: [{ id: "1", label: "Cassie, Erie" }, { id: "2", label: "Dana, Erie" }] })} />)
    expect(screen.getByText("2 visits are inside this time. They stay where they are.")).toBeInTheDocument()
    expect(screen.getByText("Cassie, Erie, Dana, Erie")).toBeInTheDocument()
  })
  it("has Remove only in edit mode", async () => {
    const onRemove = vi.fn()
    const { rerender } = render(<TimeOffDialog {...open({ onRemove })} />)
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull()
    rerender(<TimeOffDialog {...open({ onRemove, mode: "edit" })} />)
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
