import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConfirmDialog } from "./ConfirmDialog"

const base = { title: "Cancel this job?", message: "Its lines are canceled.", confirmLabel: "Cancel job", open: true, onOpenChange: () => {} }

describe("ConfirmDialog", () => {
  it("reads Keep it and the verb when it is destructive", () => {
    render(<ConfirmDialog {...base} destructive />)
    const d = within(screen.getByRole("dialog"))
    expect(d.getByRole("heading", { name: "Cancel this job?" })).toBeInTheDocument()
    expect(d.getByRole("button", { name: "Keep it" })).toBeInTheDocument()
    expect(d.getByRole("button", { name: "Cancel job" })).toBeInTheDocument()
  })

  it("dismisses with Cancel when the question is not destructive", () => {
    render(<ConfirmDialog {...base} title="Mark done" confirmLabel="Mark done" />)
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })

  it("closes when the call goes through, and shows the API's words when it refuses", async () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn().mockResolvedValueOnce({ ok: false, message: "This job has a payment. Refund it first." }).mockResolvedValueOnce({ ok: true })
    render(<ConfirmDialog {...base} destructive onOpenChange={onOpenChange} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancel job" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("This job has a payment. Refund it first.")
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    await userEvent.click(screen.getByRole("button", { name: "Cancel job" }))
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("shows why in place of the message and draws no confirm button when blocked", () => {
    render(<ConfirmDialog {...base} destructive blocked="This job has a payment. Refund it first." />)
    const d = within(screen.getByRole("dialog"))
    expect(d.getByText("This job has a payment. Refund it first.")).toBeInTheDocument()
    expect(d.queryByRole("button", { name: "Cancel job" })).toBeNull()
    expect(d.getByRole("button", { name: "Keep it" })).toBeInTheDocument()
  })

  it("only logs without an action (the catalog) and carries its body", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog {...base} log="cancel job j1" onOpenChange={onOpenChange}>
        <p>Extra</p>
      </ConfirmDialog>,
    )
    expect(screen.getByText("Extra")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Cancel job" }))
    expect(info).toHaveBeenCalledWith("cancel job j1")
    expect(onOpenChange).toHaveBeenCalledWith(false)
    info.mockRestore()
  })

  it("draws no buttons for a body that carries its own", () => {
    render(<ConfirmDialog {...base} actions="none" />)
    expect(within(screen.getByRole("dialog")).queryByRole("button")).toBeNull()
  })
})
