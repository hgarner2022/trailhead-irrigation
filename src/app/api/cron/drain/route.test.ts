// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

const { expirePendingPasses, drain } = vi.hoisted(() => ({ expirePendingPasses: vi.fn(), drain: vi.fn() }))
vi.mock("@/db", () => ({ db: () => ({}) }))
vi.mock("@/lib/pass/server/create", () => ({ expirePendingPasses }))
vi.mock("@/lib/queue", () => ({ drain }))
vi.mock("@/lib/queue/handlers", () => ({ handlers: {} }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  expirePendingPasses.mockReset()
  drain.mockReset()
})
const call = () => GET(new Request("https://x.test/api/cron/drain", { headers: { authorization: "Bearer s3cret" } }))

describe("GET /api/cron/drain", () => {
  it("still drains the queue when the purge of unpaid checkouts throws", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    vi.spyOn(console, "error").mockImplementation(() => {})
    expirePendingPasses.mockRejectedValue(new Error("foreign key violation for jane@example.com"))
    drain.mockResolvedValue({ processed: 2 })
    const response = await call()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ expired: 0, processed: 2 })
    expect(drain).toHaveBeenCalledTimes(1)
    // The log line is a constant: the error's own text (which may carry customer data) is never printed.
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("jane@example.com")
  })

  it("reports how many checkouts the purge removed", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    expirePendingPasses.mockResolvedValue(3)
    drain.mockResolvedValue({ processed: 0 })
    expect(await (await call()).json()).toEqual({ expired: 3, processed: 0 })
  })
})
