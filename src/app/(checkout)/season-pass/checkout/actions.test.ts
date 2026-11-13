// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const m = vi.hoisted(() => ({
  after: vi.fn((fn: () => unknown) => void fn()),
  drain: vi.fn(async () => ({ done: 0, failed: 0 })),
  begin: vi.fn(),
  finish: vi.fn(),
  ctxFor: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("next/server", () => ({ after: m.after }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }) }))
vi.mock("@/db", () => ({ db: () => "database" }))
vi.mock("@/lib/admin/api-ctx", () => ({ ctxForCheckout: m.ctxFor }))
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }))
vi.mock("@/lib/queue", () => ({ drain: m.drain }))
vi.mock("@/lib/queue/handlers", () => ({ handlers: { handlers: true } }))
vi.mock("@/lib/pass/server/checkout", () => ({ beginCheckoutWith: m.begin, finishCheckoutWith: m.finish }))

import { beginCheckout, finishCheckout } from "./actions"

const consent = { termsAccepted: true, marketingEmail: false, marketingSms: false }
beforeEach(() => vi.clearAllMocks())

describe("the checkout server actions", () => {
  it("beginCheckout hands the answers and the held pass id to the checkout logic and returns its result", async () => {
    m.begin.mockResolvedValue({ ok: true, passId: "p1", sessionId: "cs_1", clientSecret: "sec" })
    await expect(beginCheckout({ firstName: "A" } as never, "p0")).resolves.toMatchObject({ ok: true, passId: "p1" })
    expect(m.begin).toHaveBeenCalledWith(expect.objectContaining({ ctx: expect.any(Function), stripe: expect.any(Function) }), { firstName: "A" }, "p0")
    expect(m.after).not.toHaveBeenCalled()
  })
  it("gives the checkout context the visitor's address for the rate limit", async () => {
    m.begin.mockImplementation(async (deps: { ctx: (passId?: string) => Promise<unknown> }) => {
      await deps.ctx("p9")
      return { ok: true, passId: "p9", sessionId: "cs", clientSecret: "s" }
    })
    await beginCheckout({} as never)
    expect(m.ctxFor).toHaveBeenCalledWith("p9", { clientIp: "203.0.113.9" })
  })
  it("finishCheckout drains the queue after the response when the pass activated", async () => {
    m.finish.mockResolvedValue({ ok: true, pass: { id: "p1" } })
    await expect(finishCheckout("p1", "cs_1", consent, "Andrea")).resolves.toMatchObject({ ok: true })
    expect(m.finish).toHaveBeenCalledWith(expect.anything(), "p1", "cs_1", consent, "Andrea")
    expect(m.after).toHaveBeenCalledTimes(1)
    expect(m.drain).toHaveBeenCalledWith("database", { handlers: true })
  })
  it("finishCheckout drains nothing when activation was refused", async () => {
    m.finish.mockResolvedValue({ ok: false, problem: "unavailable", message: "x" })
    await finishCheckout("p1", "cs_1", consent)
    expect(m.after).not.toHaveBeenCalled()
  })
})
