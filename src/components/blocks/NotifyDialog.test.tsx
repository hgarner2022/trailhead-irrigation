import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { MAX_MESSAGE, NotifyDialog, channelOf } from "./NotifyDialog"
import { NOT_TOLD } from "./scheduler-panels-fixtures"

const BODY = "Trailhead: your spring turn-on is now Thu, Nov 26."
const open = (extra: Partial<React.ComponentProps<typeof NotifyDialog>> = {}) => ({ open: true, onOpenChange: () => {}, body: BODY, onSend: () => {}, onDontTell: () => {}, ...extra })

describe("channelOf", () => {
  it("is a text with a phone, an email without one, and nobody with neither", () => {
    expect(channelOf({ phone: "1", email: "a" })).toBe("text")
    expect(channelOf({ email: "a" })).toBe("email")
    expect(channelOf({})).toBeNull()
  })
})

describe("NotifyDialog, one customer", () => {
  it("names the customer, prefills the message with a count, and sends the edited words by the chosen channel", async () => {
    const onSend = vi.fn()
    render(<NotifyDialog {...open({ recipient: NOT_TOLD[0], onSend })} />)
    expect(screen.getByRole("dialog", { name: "Tell Cassie about the new time" })).toBeInTheDocument()
    expect(screen.getByText("to (970) 555-0142")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(BODY)
    expect(screen.getByText(`${BODY.length} of ${MAX_MESSAGE} characters`)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "Email" }))
    expect(screen.getByText("to cassie@example.com")).toBeInTheDocument()
    await userEvent.type(screen.getByRole("textbox", { name: "Message" }), " Ryan is coming.")
    await userEvent.click(screen.getByRole("button", { name: "Send" }))
    expect(onSend).toHaveBeenCalledWith({ channel: "email", body: `${BODY} Ryan is coming.`, ids: [] })
  })
  it("greys the channel the customer cannot be reached by, with its reason", () => {
    render(<NotifyDialog {...open({ recipient: NOT_TOLD[1] })} />)
    const text = screen.getByRole("radio", { name: "Text" })
    expect(text).toHaveAttribute("aria-disabled", "true")
    expect(text).toHaveAttribute("aria-description", "No phone on file")
    expect(screen.getByRole("radio", { name: "Email" })).toBeChecked()
  })
  it("with no phone and no email says so and offers only Don't tell", async () => {
    const onDontTell = vi.fn()
    render(<NotifyDialog {...open({ recipient: { customer: "Andrea Reyes" }, onDontTell })} />)
    expect(screen.getByText("No way to reach Andrea")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
    expect(screen.queryByRole("radio")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Don't tell" }))
    expect(onDontTell).toHaveBeenCalledOnce()
  })
  it("holds Send while the message is over 480 characters and says by how much", async () => {
    render(<NotifyDialog {...open({ recipient: NOT_TOLD[0], body: "x".repeat(MAX_MESSAGE + 3) })} />)
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
    expect(screen.getByText("Shorten the message by 3 characters.")).toBeInTheDocument()
  })
  it("Don't tell sends nothing and closes", async () => {
    const onSend = vi.fn()
    const onOpenChange = vi.fn()
    const onDontTell = vi.fn()
    render(<NotifyDialog {...open({ recipient: NOT_TOLD[0], onSend, onOpenChange, onDontTell })} />)
    await userEvent.click(screen.getByRole("button", { name: "Don't tell" }))
    expect(onSend).not.toHaveBeenCalled()
    expect(onDontTell).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe("NotifyDialog, many", () => {
  const recipients = [...NOT_TOLD, { id: "n-4", customer: "Ann Lee", town: "Longmont" as const }]
  it("has one template, a box per customer, and the one with no way to reach them left off", async () => {
    const onSend = vi.fn()
    render(<NotifyDialog {...open({ recipients, onSend, body: "Trailhead: {firstName}, your {service} is now {day}." })} />)
    expect(screen.getByRole("dialog", { name: "Tell 4 customers about their new times" })).toBeInTheDocument()
    const list = within(screen.getByRole("list", { name: "Who to tell" }))
    expect(list.getAllByRole("checkbox")).toHaveLength(4)
    expect(list.getByRole("checkbox", { name: "Tell Ann Lee" })).toBeDisabled()
    expect(list.getByText("No way to reach Ann")).toBeInTheDocument()
    await userEvent.click(list.getByRole("checkbox", { name: "Tell Dana Reed" }))
    await userEvent.click(screen.getByRole("button", { name: "Send to 2" }))
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ ids: ["n-1", "n-3"] }))
  })
})
