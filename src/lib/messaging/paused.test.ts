// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, owner, ORG } from "@/api/test-helpers"
import { callApi } from "@/api/core/call"
import { messagesSend } from "@/api/v1/messages/handlers"
import { plainEmail, subjectOf } from "@/emails/plain"
import { renderEmail } from "@/emails/render"
import { EMAIL_FIXTURES } from "@/emails/fixtures"
import { messageChannel, queueMessage, queueNote } from "./queue"
import { PAUSED_NO_EMAIL, syncTextsPausedAlert, textsPaused, TEXTS_PAUSED_KIND } from "./paused"
import { sendMessageRow } from "./send"

let db: TestDb
const WITH_EMAIL = "c100"
let n = 0
const key = () => `paused-${++n}`

beforeAll(async () => {
  db = await apiDb()
  await db.update(s.customer).set({ phone: "+13035550142", email: "andrea@example.com" }).where(eq(s.customer.id, WITH_EMAIL))
})
afterAll(() => db.close())
beforeEach(() => {
  vi.stubEnv("APP_URL", "https://www.trailheadirrigation.com")
})
afterEach(() => vi.unstubAllEnvs())

const customer = async (id = WITH_EMAIL) => (await db.select().from(s.customer).where(eq(s.customer.id, id)))[0]!
const rowByKey = async (k: string) => (await db.select().from(s.messageLog).where(eq(s.messageLog.key, k)))[0]
const visitData = () => EMAIL_FIXTURES["date-set"]

describe("the TEXTS_PAUSED switch", () => {
  it.each([
    ["on", true],
    ["ON", true],
    ["1", true],
    ["true", true],
    ["off", false],
    ["", false],
    ["0", false],
  ])("reads %j as %s", (value, expected) => {
    vi.stubEnv("TEXTS_PAUSED", value)
    expect(textsPaused()).toBe(expected)
  })
  it("is off when unset", () => {
    vi.stubEnv("TEXTS_PAUSED", "")
    expect(textsPaused()).toBe(false)
  })
})

describe("messageChannel while texts are paused", () => {
  it("is sms for a customer with a mobile when the switch is off", async () => {
    expect(await messageChannel(db, await customer(), "date-set")).toBe("sms")
  })
  it("is email for every text kind when the switch is on and the customer has an email", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    for (const kind of ["date-set", "date-moved", "date-confirm", "day-before", "on-the-way", "invoice", "invoice-reminder", "visit-cancelled"]) expect(await messageChannel(db, await customer(), kind)).toBe("email")
  })
  it("is null for a customer with no email", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    await db.update(s.customer).set({ email: null }).where(eq(s.customer.id, WITH_EMAIL))
    expect(await messageChannel(db, await customer(), "date-set")).toBeNull()
    await db.update(s.customer).set({ email: "andrea@example.com" }).where(eq(s.customer.id, WITH_EMAIL))
  })
  it("leaves a kind that was never a text alone", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    expect(await messageChannel(db, await customer(), "receipt")).toBe("email")
  })
})

describe("queueMessage while texts are paused", () => {
  it("queues the email twin of a text kind and no text", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    const k = key()
    expect(await queueMessage(db, { organizationId: ORG, customerId: WITH_EMAIL, kind: "date-set", key: k, data: visitData() })).toBe(true)
    expect(await rowByKey(k)).toMatchObject({ channel: "email", to: "andrea@example.com", status: "queued" })
  })

  it("sends on my way as a plain email of the text's own words", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    const k = key()
    expect(await queueMessage(db, { organizationId: ORG, customerId: WITH_EMAIL, kind: "on-the-way", key: k, data: visitData() })).toBe(true)
    const row = (await rowByKey(k))!
    expect(row).toMatchObject({ channel: "email", kind: "on-the-way", status: "queued" })
    expect(row.body).toContain("Trailhead:")
    expect(row.body).not.toContain("Reply STOP")
    // the sender renders it from the row's own words
    const rendered = renderEmail(row.kind, row.data)!
    expect(rendered.subject).toBe(row.subject)
    expect(rendered.html).toContain("Trailhead: ")
  })

  it("records a text kind as not sent with the reason when the customer has no email", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    await db.update(s.customer).set({ email: null }).where(eq(s.customer.id, WITH_EMAIL))
    const k = key()
    expect(await queueMessage(db, { organizationId: ORG, customerId: WITH_EMAIL, kind: "date-set", key: k, data: visitData() })).toBe(false)
    expect(await rowByKey(k)).toMatchObject({ channel: "sms", status: "skipped", error: PAUSED_NO_EMAIL })
    expect(PAUSED_NO_EMAIL).toBe("texts paused, no email")
    const queued = await db.select().from(s.queueItem).where(eq(s.queueItem.kind, "message"))
    const id = (await rowByKey(k))!.id
    expect(queued.some((q) => (q.payload as { messageId?: string }).messageId === id)).toBe(false)
    await db.update(s.customer).set({ email: "andrea@example.com" }).where(eq(s.customer.id, WITH_EMAIL))
  })

  it("texts as before when the switch is off", async () => {
    const k = key()
    expect(await queueMessage(db, { organizationId: ORG, customerId: WITH_EMAIL, kind: "date-set", key: k, data: visitData() })).toBe(true)
    expect(await rowByKey(k)).toMatchObject({ channel: "sms", status: "queued" })
  })
})

describe("queueNote while texts are paused", () => {
  it("goes by email in the text's own words", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    const k = key()
    const out = await queueNote(db, { organizationId: ORG, customerId: WITH_EMAIL, text: "Running 20 minutes late. See you soon.", key: k })
    expect(out).toMatchObject({ ok: true, channel: "email" })
    const row = (await rowByKey(k))!
    expect(row).toMatchObject({ channel: "email", kind: "note", to: "andrea@example.com", subject: "Running 20 minutes late", status: "queued" })
    expect(row.body).toContain("Trailhead: Running 20 minutes late. See you soon.")
  })
  it("is refused when the customer has no email", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    await db.update(s.customer).set({ email: null }).where(eq(s.customer.id, WITH_EMAIL))
    expect(await queueNote(db, { organizationId: ORG, customerId: WITH_EMAIL, text: "Hi", key: key() })).toEqual({ ok: false, reason: "paused-no-email" })
    await db.update(s.customer).set({ email: "andrea@example.com" }).where(eq(s.customer.id, WITH_EMAIL))
  })
  it("texts when the switch is off", async () => {
    expect(await queueNote(db, { organizationId: ORG, customerId: WITH_EMAIL, text: "Hi", key: key() })).toMatchObject({ ok: true })
  })
})

describe("messages.send while texts are paused", () => {
  it("answers the office's refusal in plain words", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    await db.update(s.customer).set({ email: null }).where(eq(s.customer.id, WITH_EMAIL))
    await expect(callApi(ctxFor(db, owner), messagesSend, { customerId: WITH_EMAIL, kind: "note", text: "Hi" })).rejects.toThrow("Texts are paused and this customer has no email.")
    await db.update(s.customer).set({ email: "andrea@example.com" }).where(eq(s.customer.id, WITH_EMAIL))
  })
  it("sends a note by email", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    const out = await callApi(ctxFor(db, owner), messagesSend, { customerId: WITH_EMAIL, kind: "note", text: "Gate is open." })
    expect(out).toMatchObject({ channel: "email", kind: "note" })
  })
})

describe("a text already queued when texts are paused", () => {
  it("never reaches the text sender; it is kept as not sent and goes by email", async () => {
    const [r] = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: WITH_EMAIL, kind: "date-set", key: key(), channel: "sms", to: "+13035550142", body: "Trailhead: hi", data: visitData(), status: "queued" }).returning()
    vi.stubEnv("TEXTS_PAUSED", "on")
    const sms = vi.fn(async () => ({ id: "SM1" }))
    const out = await sendMessageRow(db, r!.id, { deps: { email: vi.fn(async () => ({ id: "re_1" })), sms, smsConfigured: () => true } })
    expect(out).toBe("skipped")
    expect(sms).not.toHaveBeenCalled()
    const [after] = await db.select().from(s.messageLog).where(eq(s.messageLog.id, r!.id))
    expect(after).toMatchObject({ status: "skipped", error: "texts paused" })
    const twin = await db.select().from(s.messageLog).where(and(eq(s.messageLog.key, `${r!.key}~email`), eq(s.messageLog.channel, "email")))
    expect(twin).toHaveLength(1)
  })
})

describe("the plain email", () => {
  it("takes the first sentence as the subject and the whole text as the one paragraph", () => {
    const e = plainEmail({ origin: "https://www.trailheadirrigation.com", firstName: "Andrea", plainBody: "Trailhead: Ryan is on the way to 480 Briggs St. See your visit: https://x.test/v" })
    expect(e.subject).toBe("Ryan is on the way to 480 Briggs St")
    expect(e.text).toContain("Hi Andrea,")
    expect(e.text).toContain("Trailhead: Ryan is on the way to 480 Briggs St. See your visit: https://x.test/v")
    expect(e.html).toContain("See your visit: https://x.test/v")
    expect(e.text).not.toContain("—")
  })
  it("shortens a long first sentence and survives a body with no full stop", () => {
    expect(subjectOf(`Trailhead: ${"word ".repeat(40)}`).length).toBeLessThanOrEqual(80)
    expect(subjectOf("Trailhead: late")).toBe("late")
    expect(subjectOf("")).toBe("A message from Trailhead")
  })
})

describe("the Home row", () => {
  const rows = () => db.select().from(s.adminAlert).where(and(eq(s.adminAlert.organizationId, ORG), eq(s.adminAlert.kind, TEXTS_PAUSED_KIND)))
  it("is raised once while the switch is on, stays dismissed, and is cleared when it is off", async () => {
    vi.stubEnv("TEXTS_PAUSED", "on")
    expect(await syncTextsPausedAlert(db, new Date("2026-11-19T00:00:00Z"))).toBe("raised")
    expect(await syncTextsPausedAlert(db, new Date())).toBe("none")
    expect(await rows()).toHaveLength(1)
    // the office dismisses it: still one row, still not raised again
    await db.update(s.adminAlert).set({ resolvedAt: new Date(), message: "Dismissed" }).where(eq(s.adminAlert.kind, TEXTS_PAUSED_KIND))
    expect(await syncTextsPausedAlert(db, new Date())).toBe("none")
    expect((await rows())[0]!.resolvedAt).not.toBeNull()
    vi.stubEnv("TEXTS_PAUSED", "off")
    expect(await syncTextsPausedAlert(db, new Date())).toBe("cleared")
    expect(await rows()).toHaveLength(0)
    expect(await syncTextsPausedAlert(db, new Date())).toBe("none")
  })
})
