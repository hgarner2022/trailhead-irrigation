// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { twilioSignature } from "@/lib/messaging/twilio"

const holder = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock("@/db", () => ({ db: () => holder.db }))

import { POST } from "./route"

const TOKEN = "test-auth-token"
const URL_ = "https://trail.test/api/webhooks/twilio/status"
let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  holder.db = db
})
afterAll(() => db.close())
beforeEach(() => {
  vi.stubEnv("TWILIO_ACCOUNT_SID", "ACtest")
  vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN)
  vi.stubEnv("TWILIO_FROM", "+13035550000")
  vi.stubEnv("APP_URL", "https://trail.test")
})

async function text(sid: string, key: string) {
  const [r] = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c100", kind: "date-set", key, channel: "sms", to: "+13035550142", body: "Trailhead: hi", status: "sent", providerId: sid }).returning()
  return r!
}
const report = (params: Record<string, string>, signed = true) => {
  const body = new URLSearchParams(params)
  return POST(new Request(URL_, { method: "POST", headers: signed ? { "x-twilio-signature": twilioSignature(URL_, params, TOKEN) } : {}, body }))
}
const stored = async (id: string) => (await db.select().from(s.messageLog).where(eq(s.messageLog.id, id)))[0]!

describe("POST /api/webhooks/twilio/status", () => {
  it("refuses an unsigned or wrongly signed report and records nothing", async () => {
    const m = await text("SMa1", "d-a1")
    expect((await report({ MessageSid: "SMa1", MessageStatus: "delivered" }, false)).status).toBe(403)
    const wrong = new URLSearchParams({ MessageSid: "SMa1", MessageStatus: "delivered" })
    expect((await POST(new Request(URL_, { method: "POST", headers: { "x-twilio-signature": "nope" }, body: wrong }))).status).toBe(403)
    expect((await stored(m.id)).deliveryStatus).toBeNull()
  })

  it("answers 503 while Twilio is not configured", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "")
    expect((await report({ MessageSid: "SMa2", MessageStatus: "delivered" })).status).toBe(503)
  })

  it("records a delivered report, and a repeat changes nothing", async () => {
    const m = await text("SMb1", "d-b1")
    expect((await report({ MessageSid: "SMb1", MessageStatus: "delivered" })).status).toBe(200)
    expect(await stored(m.id)).toMatchObject({ deliveryStatus: "delivered", deliveryError: null, status: "sent" })
    expect((await report({ MessageSid: "SMb1", MessageStatus: "delivered" })).status).toBe(200)
    expect(await stored(m.id)).toMatchObject({ deliveryStatus: "delivered" })
  })

  it("records the error code on an undelivered report", async () => {
    const m = await text("SMc1", "d-c1")
    await report({ MessageSid: "SMc1", MessageStatus: "undelivered", ErrorCode: "30007" })
    expect(await stored(m.id)).toMatchObject({ deliveryStatus: "undelivered", deliveryError: "30007" })
  })

  it("never lets an earlier step replace a later one", async () => {
    const m = await text("SMd1", "d-d1")
    await report({ MessageSid: "SMd1", MessageStatus: "delivered" })
    await report({ MessageSid: "SMd1", MessageStatus: "sent" })
    expect((await stored(m.id)).deliveryStatus).toBe("delivered")
    const n = await text("SMd2", "d-d2")
    await report({ MessageSid: "SMd2", MessageStatus: "sending" })
    await report({ MessageSid: "SMd2", MessageStatus: "sent" })
    expect((await stored(n.id)).deliveryStatus).toBe("sent")
  })

  it("answers 200 for a sid it does not know and a status it does not know, and records nothing", async () => {
    const before = await db.select().from(s.messageLog)
    expect((await report({ MessageSid: "SMnone", MessageStatus: "delivered" })).status).toBe(200)
    const m = await text("SMe1", "d-e1")
    expect((await report({ MessageSid: "SMe1", MessageStatus: "read" })).status).toBe(200)
    expect((await stored(m.id)).deliveryStatus).toBeNull()
    expect((await db.select().from(s.messageLog)).length).toBe(before.length + 1)
  })

  it("raises one Home row for a text that came back undelivered, in the customer's first name and the reason's words, and a repeat adds none", async () => {
    const m = await text("SMf1", "d-f1")
    await report({ MessageSid: "SMf1", MessageStatus: "undelivered", ErrorCode: "30007" })
    await report({ MessageSid: "SMf1", MessageStatus: "undelivered", ErrorCode: "30007" })
    const rows = (await db.select().from(s.adminAlert).where(eq(s.adminAlert.kind, "text-undelivered"))).filter((a) => a.key.endsWith(`:${m.id}`))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.key).toBe(`-:c100:${m.id}`)
    expect(rows[0]!.message).toMatch(/^Text not delivered: \S+, date set\. Filtered by the carrier\.$/)
    expect(rows[0]!.resolvedAt).toBeNull()
  })

  it("words an unlisted code as Twilio code N, keeps a dismissed row dismissed, and raises none for a delivered text", async () => {
    const m = await text("SMg1", "d-g1")
    await report({ MessageSid: "SMg1", MessageStatus: "failed", ErrorCode: "99999" })
    const [row] = (await db.select().from(s.adminAlert).where(eq(s.adminAlert.kind, "text-undelivered"))).filter((a) => a.key.endsWith(`:${m.id}`))
    expect(row!.message).toMatch(/Twilio code 99999\.$/)
    await db.update(s.adminAlert).set({ resolvedAt: new Date() }).where(eq(s.adminAlert.id, row!.id))
    await report({ MessageSid: "SMg1", MessageStatus: "failed", ErrorCode: "99999" })
    const after = (await db.select().from(s.adminAlert).where(eq(s.adminAlert.kind, "text-undelivered"))).filter((a) => a.key.endsWith(`:${m.id}`))
    expect(after).toHaveLength(1)
    expect(after[0]!.resolvedAt).not.toBeNull()
    const ok = await text("SMg2", "d-g2")
    await report({ MessageSid: "SMg2", MessageStatus: "delivered" })
    expect((await db.select().from(s.adminAlert).where(eq(s.adminAlert.kind, "text-undelivered"))).some((a) => a.key.endsWith(`:${ok.id}`))).toBe(false)
  })
})
