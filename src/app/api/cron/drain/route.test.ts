// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

const { expirePendingPasses, drain, refreshDeliveryAll } = vi.hoisted(() => ({ expirePendingPasses: vi.fn(), drain: vi.fn(), refreshDeliveryAll: vi.fn() }))
vi.mock("@/db", () => ({ db: () => ({}) }))
vi.mock("@/lib/pass/server/create", () => ({ expirePendingPasses }))
vi.mock("@/lib/queue", () => ({ drain }))
vi.mock("@/lib/messaging/delivery-refresh", () => ({ refreshDeliveryAll }))
vi.mock("@/lib/queue/handlers", () => ({ handlers: {} }))

beforeEach(() => refreshDeliveryAll.mockResolvedValue(0))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  expirePendingPasses.mockReset()
  drain.mockReset()
  refreshDeliveryAll.mockReset()
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
    expect(await response.json()).toEqual({ expired: 0, deliveryChecked: 0, processed: 2 })
    expect(drain).toHaveBeenCalledTimes(1)
    // The log line is a constant: the error's own text (which may carry customer data) is never printed.
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("jane@example.com")
  })

  it("reports how many checkouts the purge removed", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    expirePendingPasses.mockResolvedValue(3)
    drain.mockResolvedValue({ processed: 0 })
    expect(await (await call()).json()).toEqual({ expired: 3, deliveryChecked: 0, processed: 0 })
  })

  it("asks Twilio about texts with no delivery report once a run, and reports how many it checked", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    expirePendingPasses.mockResolvedValue(0)
    drain.mockResolvedValue({ processed: 1 })
    refreshDeliveryAll.mockClear()
    refreshDeliveryAll.mockResolvedValue(9)
    expect(await (await call()).json()).toEqual({ expired: 0, deliveryChecked: 9, processed: 1 })
    expect(refreshDeliveryAll).toHaveBeenCalledTimes(1)
  })

  it("still answers when the delivery check throws, logging a constant line", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    vi.spyOn(console, "error").mockImplementation(() => {})
    expirePendingPasses.mockResolvedValue(0)
    drain.mockResolvedValue({ processed: 1 })
    refreshDeliveryAll.mockRejectedValue(new Error("Twilio said no for +13035550142"))
    const response = await call()
    expect(response.status).toBe(200)
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("+13035550142")
  })
})
