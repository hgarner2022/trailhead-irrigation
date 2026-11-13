// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { handleInboundText } from "./inbound"
import { sendMessageRow, type SendDeps } from "./send"
import { twilioSignature, validateTwilioSignature } from "./twilio"

let db: TestDb
let phoneCustomer: string
let phone: string
beforeAll(async () => {
  db = await apiDb()
  const [c] = await db.select().from(s.customer).where(eq(s.customer.id, "c100"))
  phoneCustomer = c!.id
  phone = "+13035550142"
  await db.update(s.customer).set({ phone, email: "andrea@example.com" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const deps = (over: Partial<SendDeps> = {}): SendDeps & { email: ReturnType<typeof vi.fn>; sms: ReturnType<typeof vi.fn> } =>
  ({ email: vi.fn(async () => ({ id: "re_1" })), sms: vi.fn(async () => ({ id: "SM1" })), smsConfigured: () => true, ...over }) as never

async function row(channel: "email" | "sms", kind: string, key: string) {
  const [r] = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: phoneCustomer, kind, key, channel, to: channel === "sms" ? phone : "andrea@example.com", subject: channel === "email" ? "Hello" : null, body: "Trailhead: hello", status: "queued" }).returning()
  return r!
}

describe("sendMessageRow", () => {
  it("sends an email through the email sender and stores its id", async () => {
    const d = deps()
    const r = await row("email", "receipt", "e1")
    expect(await sendMessageRow(db, r.id, { deps: d })).toBe("sent")
    expect(d.email).toHaveBeenCalledWith(expect.objectContaining({ to: "andrea@example.com", subject: "Hello", text: "Trailhead: hello" }))
    const [after] = await db.select().from(s.messageLog).where(eq(s.messageLog.id, r.id))
    expect(after).toMatchObject({ status: "sent", providerId: "re_1" })
    expect(await sendMessageRow(db, r.id, { deps: d })).toBe("gone")
    expect(d.email).toHaveBeenCalledTimes(1)
  })

  it("sends a text through the text sender", async () => {
    const d = deps()
    const r = await row("sms", "date-set", "t1")
    expect(await sendMessageRow(db, r.id, { deps: d })).toBe("sent")
    expect(d.sms).toHaveBeenCalledWith({ to: phone, body: "Trailhead: hello" })
  })

  it("marks a text skipped with no-sms-sender and queues the same message by email, once", async () => {
    const d = deps({ smsConfigured: () => false })
    const r = await row("sms", "day-before", "t2")
    expect(await sendMessageRow(db, r.id, { deps: d })).toBe("skipped")
    const [skipped] = await db.select().from(s.messageLog).where(eq(s.messageLog.id, r.id))
    expect(skipped).toMatchObject({ status: "skipped", error: "no-sms-sender" })
    const emails = await db.select().from(s.messageLog).where(and(eq(s.messageLog.key, "t2~email"), eq(s.messageLog.channel, "email")))
    expect(emails).toHaveLength(1)
    expect(emails[0]).toMatchObject({ status: "queued", to: "andrea@example.com", body: "Trailhead: hello" })
    expect(d.sms).not.toHaveBeenCalled()
  })

  it("stores a provider error and throws so the queue retries, failing the row on the last attempt", async () => {
    const d = deps({ email: vi.fn(async () => { throw new Error("Resend down") }) })
    const r = await row("email", "receipt", "e2")
    await expect(sendMessageRow(db, r.id, { deps: d })).rejects.toThrow("Resend down")
    expect((await db.select().from(s.messageLog).where(eq(s.messageLog.id, r.id)))[0]).toMatchObject({ status: "queued", error: "Resend down" })
    await expect(sendMessageRow(db, r.id, { deps: d, final: true })).rejects.toThrow()
    expect((await db.select().from(s.messageLog).where(eq(s.messageLog.id, r.id)))[0]!.status).toBe("failed")
  })

  it("skips a marketing message without the opt-in", async () => {
    const d = deps()
    const [r] = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c121", kind: "renewal", key: "m1", channel: "email", to: "x@example.com", subject: "Renew", body: "Renew", status: "queued" }).returning()
    await db.insert(s.consent).values({ organizationId: ORG, customerId: "c121", marketingOptIn: false, marketingChannels: [], source: "checkout" })
    expect(await sendMessageRow(db, r!.id, { deps: d })).toBe("skipped")
    expect(d.email).not.toHaveBeenCalled()
  })
})

describe("the message queue handler", () => {
  it("drains a queued row through the handler (stubbed senders: Resend is not configured, so it fails and retries)", async () => {
    vi.stubEnv("RESEND_API_KEY", "")
    const r = await row("email", "receipt", "q1")
    const { enqueue } = await import("@/lib/queue")
    await enqueue(db, ORG, "message", r.id, { messageId: r.id })
    const result = await drain(db, { message: handlers.message! })
    expect(result.failed).toBeGreaterThanOrEqual(1)
    expect((await db.select().from(s.messageLog).where(eq(s.messageLog.id, r.id)))[0]!.error).toContain("RESEND_API_KEY")
  })
})

describe("inbound STOP and START", () => {
  it("appends one consent row per word, ignores everything else and a replay", async () => {
    const count = async () => (await db.select().from(s.consent).where(eq(s.consent.customerId, phoneCustomer))).length
    const before = await count()
    expect(await handleInboundText(db, phone, "Can you come earlier?")).toBe("ignored")
    expect(await count()).toBe(before)
    expect(await handleInboundText(db, phone, " stop ")).toBe("stop")
    expect(await handleInboundText(db, phone, "STOP")).toBe("stop")
    expect(await count()).toBe(before + 1)
    const { currentConsent } = await import("./consent")
    expect((await currentConsent(db, phoneCustomer)).smsStopped).toBe(true)
    expect(await handleInboundText(db, phone, "START")).toBe("start")
    expect((await currentConsent(db, phoneCustomer)).smsStopped).toBe(false)
  })
})

describe("Twilio's signature", () => {
  it("validates what it signed and nothing else", () => {
    const params = { From: "+13035550142", Body: "STOP" }
    const sig = twilioSignature("https://example.com/api/webhooks/twilio", params, "tok")
    expect(validateTwilioSignature("https://example.com/api/webhooks/twilio", params, sig, "tok")).toBe(true)
    expect(validateTwilioSignature("https://example.com/api/webhooks/twilio", { ...params, Body: "START" }, sig, "tok")).toBe(false)
    expect(validateTwilioSignature("https://example.com/api/webhooks/twilio", params, null, "tok")).toBe(false)
  })
})
