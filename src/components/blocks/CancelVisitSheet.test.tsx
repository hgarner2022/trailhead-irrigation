import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CancelVisitSheet } from "./CancelVisitSheet"

const props = { service: "Spring turn-on", dayWords: "Wednesday, April 28", consequence: "Nothing is charged. Your Season Pass stays and this visit comes off it.", textHref: "sms:+19706927270?&body=Hi%20Ryan" }

describe("CancelVisitSheet", () => {
  it("states the consequence before the tap and offers Keep my visit as the way back", async () => {
    render(<CancelVisitSheet {...props} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancel visit" }))
    expect(screen.getByRole("heading", { name: "Cancel your spring turn-on?" })).toBeInTheDocument()
    expect(screen.getByText("Wednesday, April 28")).toBeInTheDocument()
    expect(screen.getByText("Nothing is charged. Your Season Pass stays and this visit comes off it.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep my visit" })).toBeInTheDocument()
  })

  it("cancels through the action with the optional reason and says it was canceled, with Text Ryan to add it back", async () => {
    const onCancel = vi.fn(async () => ({ ok: true as const }))
    render(<CancelVisitSheet {...props} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancel visit" }))
    await userEvent.type(screen.getByLabelText("Tell Ryan why (optional)"), "Away that week")
    // the dialog's own red button is the second "Cancel visit"
    await userEvent.click(screen.getAllByRole("button", { name: "Cancel visit" }).at(-1)!)
    expect(onCancel).toHaveBeenCalledWith("Away that week")
    expect(await screen.findByRole("heading", { name: "Canceled. We texted you a note." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Text Ryan" })).toHaveAttribute("href", "sms:+19706927270?&body=Hi%20Ryan")
    expect(screen.getByText(/Changed your mind\?/)).toHaveTextContent("Changed your mind? Text Ryan to add it back.")
  })

  it("sends an empty reason when none is given", async () => {
    const onCancel = vi.fn(async () => ({ ok: true as const }))
    render(<CancelVisitSheet {...props} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancel visit" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Cancel visit" }).at(-1)!)
    expect(onCancel).toHaveBeenCalledWith("")
  })

  it("keeps the sheet open with the handler's own words when the cancel is refused", async () => {
    render(<CancelVisitSheet {...props} onCancel={async () => ({ ok: false as const, message: "This visit is within 24 hours, so it can't be changed online. Text or call Ryan at (970) 692-7270." })} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancel visit" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Cancel visit" }).at(-1)!)
    expect(await screen.findByRole("alert")).toHaveTextContent("within 24 hours")
    expect(screen.queryByRole("heading", { name: "Canceled. We texted you a note." })).toBeNull()
  })
})
