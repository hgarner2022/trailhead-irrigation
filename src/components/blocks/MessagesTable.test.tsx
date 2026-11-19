import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MessagesTable } from "./MessagesTable"
import type { Message } from "@/lib/admin/types"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const m = (id: string, at: string, channel: "email" | "sms", status: Message["status"]): Message => ({ id, clientId: "c", channel, kind: "receipt", body: "Receipt: $95", at, status })

describe("MessagesTable", () => {
  it("lists emails and texts together with channel, recipient and status", () => {
    render(<MessagesTable phone="(970) 555-0123" email="a@x.com" messages={[m("1", "2026-11-01T18:00:00Z", "sms", "delivered"), m("2", "2026-11-02T18:00:00Z", "email", "failed")]} />)
    expect(screen.getAllByText("a@x.com").length).toBeGreaterThan(0)
    expect(screen.getAllByText("(970) 555-0123").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0)
  })
  it("says so when there are none", () => {
    render(<MessagesTable phone="p" email="e" messages={[]} />)
    expect(screen.getByText("No messages yet")).toBeInTheDocument()
  })
})
