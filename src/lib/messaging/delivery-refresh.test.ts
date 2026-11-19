// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, ORG, readKey, writeKey } from "@/api/test-helpers"
import { callApi } from "@/api/core/call"
import { messagesRefreshDelivery } from "@/api/v1/messages/handlers"
import { refreshDelivery, refreshDeliveryAll } from "./delivery-refresh"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())
beforeEach(async () => {
  await db.delete(s.messageLog)
  await db.delete(s.adminAlert)
  vi.stubEnv("TWILIO_ACCOUNT_SID", "ACtest")
  vi.stubEnv("TWILIO_AUTH_TOKEN", "secret-token")
  vi.stubEnv("TWILIO_FROM", "+13035550000")
})

const text = async (sid: string | null, key: string, extra: Partial<typeof s.messageLog.$inferInsert> = {}) => {
  const [r] = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c100", kind: "date-set", key, channel: "sms", to: "+13035550142", body: "Trailhead: hi", status: "sent", providerId: sid, ...extra }).returning()
  return r!
}
const answers = (byId: Record<string, { status: string; error_code?: number | null }>) =>
  vi.fn(async (url: string) => {
    const sid = /Messages\/([^/.]+)\.json/.exec(String(url))![1]!
    const a = byId[sid]
    return a ? new Response(JSON.stringify(a), { status: 200 }) : new Response(JSON.stringify({ message: "not found" }), { status: 404 })
  })
const stored = async (id: string) => (await db.select().from(s.messageLog).where(eq(s.messageLog.id, id)))[0]!

describe("refreshDelivery", () => {
  it("asks Twilio with basic auth for each text with no final report, stores the answers and raises the Home row", async () => {
    const a = await text("SMr1", "r1")
    const b = await text("SMr2", "r2")
    const fetchMock = answers({ SMr1: { status: "delivered", error_code: null }, SMr2: { status: "undelivered", error_code: 30007 } })
    vi.stubGlobal("fetch", fetchMock)
    const out = await refreshDelivery(db, { organizationId: ORG })
    expect(out).toEqual(expect.arrayContaining([{ id: a.id, status: "delivered", errorCode: null }, { id: b.id, status: "undelivered", errorCode: "30007" }]))
    expect(await stored(a.id)).toMatchObject({ deliveryStatus: "delivered", deliveryError: null })
    expect(await stored(b.id)).toMatchObject({ deliveryStatus: "undelivered", deliveryError: "30007" })
    const alerts = await db.select().from(s.adminAlert).where(eq(s.adminAlert.kind, "text-undelivered"))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.message).toMatch(/Filtered by the carrier\.$/)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: { authorization: string }; method?: string }]
    expect(url).toMatch(/^https:\/\/api\.twilio\.com\/2010-04-01\/Accounts\/ACtest\/Messages\/SMr[12]\.json$/)
    expect(init.method).toBeUndefined()
    expect(init.headers.authorization).toBe(`Basic ${Buffer.from("ACtest:secret-token").toString("base64")}`)
    vi.unstubAllGlobals()
  })

  it("leaves alone a text with no Twilio id, an email, a final report, and a text older than three days; checks one still only sent", async () => {
    await text(null, "n1")
    await text("SMe", "n2", { channel: "email", to: "a@example.com" })
    await text("SMdone", "n3", { deliveryStatus: "delivered" })
    await text("SMold", "n4", { createdAt: new Date(Date.now() - 4 * 24 * 3_600_000) })
    const open = await text("SMopen", "n5", { deliveryStatus: "sent" })
    const fetchMock = answers({ SMopen: { status: "delivered" } })
    vi.stubGlobal("fetch", fetchMock)
    const out = await refreshDelivery(db, { organizationId: ORG })
    expect(out.map((o) => o.id)).toEqual([open.id])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it("takes the newest N, skips a text Twilio will not answer for, and goes on to the rest", async () => {
    const old = await text("SMa", "o1", { createdAt: new Date(Date.now() - 3_600_000) })
    const missing = await text("SMb", "o2", { createdAt: new Date(Date.now() - 1_800_000) })
    const fresh = await text("SMc", "o3")
    vi.stubGlobal("fetch", answers({ SMa: { status: "delivered" }, SMc: { status: "delivered" } }))
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    const out = await refreshDelivery(db, { organizationId: ORG, limit: 2 })
    expect(out.map((o) => o.id)).toEqual([fresh.id])
    expect((await stored(missing.id)).deliveryStatus).toBeNull()
    expect((await stored(old.id)).deliveryStatus).toBeNull()
    expect((await refreshDelivery(db, { organizationId: ORG })).map((o) => o.id)).toEqual([old.id])
    err.mockRestore()
    vi.unstubAllGlobals()
  })

  it("does nothing while Twilio is not configured", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "")
    await text("SMx", "x1")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    expect(await refreshDelivery(db, { organizationId: ORG })).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("refreshDeliveryAll counts the texts checked across organizations", async () => {
    await text("SMy", "y1")
    vi.stubGlobal("fetch", answers({ SMy: { status: "sent" } }))
    expect(await refreshDeliveryAll(db)).toBe(1)
    vi.unstubAllGlobals()
  })
})

describe("messages.refreshDelivery", () => {
  it("answers { id, status, errorCode } for each text checked, for a write key, and refuses a read key", async () => {
    const m = await text("SMh1", "h1")
    vi.stubGlobal("fetch", answers({ SMh1: { status: "failed", error_code: 30003 } }))
    expect(await callApi(ctxFor(db, writeKey, new Date().toISOString()), messagesRefreshDelivery, {})).toEqual([{ id: m.id, status: "failed", errorCode: "30003" }])
    await expect(callApi(ctxFor(db, readKey), messagesRefreshDelivery, {})).rejects.toMatchObject({ code: "forbidden" })
    vi.unstubAllGlobals()
  })
})
