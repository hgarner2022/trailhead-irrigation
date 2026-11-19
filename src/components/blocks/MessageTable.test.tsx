import { beforeAll, describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Message } from "@/lib/admin/types"
import { MessageTable } from "./MessageTable"

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.scrollIntoView = () => {}
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

const to = { sms: "(970) 555-0123", email: "a@example.com" }
const m = (id: string, at: string, kind: Message["kind"], channel: Message["channel"], body: string, status: Message["status"] = "delivered"): Message => ({ id, clientId: "c", channel, kind, body, at, status })

describe("MessageTable", () => {
  it("lists newest first with the kind as the title, the first line under it, the channel and who it went to", () => {
    render(<MessageTable to={to} messages={[m("1", "2026-11-10T17:00:00Z", "date-set", "sms", "Trailhead: your repair is Tue, Nov 24."), m("2", "2026-11-18T17:00:00Z", "receipt", "email", "Receipt: $145\nmore")]} />)
    const rows = screen.getAllByRole("row")
    expect(rows[1]).toHaveTextContent("Receipt")
    expect(rows[1]).toHaveTextContent("Receipt: $145")
    expect(rows[1]).toHaveTextContent("Email")
    expect(rows[1]).toHaveTextContent("a@example.com")
    expect(rows[2]).toHaveTextContent("(970) 555-0123")
  })

  it("shows a dot pill with the delivery words and opens the whole message in a dialog", async () => {
    render(<MessageTable to={to} messages={[m("1", "2026-11-10T17:00:00Z", "invoice", "sms", "Trailhead: invoice for your repair, $145, due Dec 2.", "bounced")]} />)
    expect(screen.getByText("Not delivered")).toHaveAttribute("data-slot", "status-pill")
    await userEvent.click(screen.getByRole("button", { name: /Nov/ }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Trailhead: invoice for your repair, $145, due Dec 2.")
  })
})
