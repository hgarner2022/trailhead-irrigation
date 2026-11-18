// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The email goes through Resend, which is replaced so the route runs on its own. The route touches nothing else:
// a form post is unknown until Ryan reads it, so it never writes a customer or a job (Hannah, Nov 18 2026).
const held = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock("resend", () => ({ Resend: class { emails = { send: held.send } } }))
vi.mock("@/db", () => ({
  db: () => {
    throw new Error("the contact route must not open the database")
  },
}))

import { POST } from "./route"

beforeEach(() => {
  held.send.mockReset()
  held.send.mockResolvedValue({ error: null })
})
afterEach(() => vi.restoreAllMocks())

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(fields)) data.set(k, v)
  return new Request("https://x.test/api/contact", { method: "POST", body: data })
}
const inquiry = { name: "Maya Rowan", email: "Maya.Rowan@Example.com", phone: "970-555-0119", address: "88 Briggs Street, Erie, CO 80516", service: "Full Irrigation Installs", message: "Four zones, new build" }

describe("POST /api/contact", () => {
  it("sends Ryan one email with the visitor's words and answers success", async () => {
    const res = await POST(form(inquiry))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(held.send).toHaveBeenCalledTimes(1)
    const sent = held.send.mock.calls[0]![0]
    expect(sent).toMatchObject({ to: "ryan@trailheadirrigation.com", replyTo: inquiry.email, subject: "New Contact: Full Irrigation Installs — Maya Rowan" })
    expect(sent.text).toContain("Address: 88 Briggs Street, Erie, CO 80516")
    expect(sent.text).toContain("Four zones, new build")
  })

  it("says what was left out when the address and message are empty", async () => {
    await POST(form({ ...inquiry, address: "", message: "" }))
    const sent = held.send.mock.calls[0]![0]
    expect(sent.text).toContain("Address: (Not provided)")
    expect(sent.text).toContain("(No message provided)")
  })

  it("a missing field is a 400 and sends nothing", async () => {
    expect((await POST(form({ name: "Maya", email: "m@example.com" }))).status).toBe(400)
    expect(held.send).not.toHaveBeenCalled()
  })

  it("a failed send is a 500", async () => {
    held.send.mockResolvedValue({ error: { message: "no" } })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const res = await POST(form(inquiry))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Failed to send message" })
  })
})
