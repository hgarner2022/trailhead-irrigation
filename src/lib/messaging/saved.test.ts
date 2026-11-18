// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { baseData, loadVisitFacts } from "./data"
import { queueMessage } from "./queue"
import { isFirstText, savedTemplates } from "./saved"
import { sendMessageRow, type SendDeps } from "./send"

const origin = "https://site.test"
const PHONE = "+17205550188"
const EMAIL_ONLY = "c-email-only"

let db: TestDb
let visitId: string
beforeAll(async () => {
  db = await apiDb()
  await db.update(s.customer).set({ phone: PHONE, email: "andrea@example.com" }).where(eq(s.customer.id, "c100"))
  await db.insert(s.customer).values({ id: EMAIL_ONLY, organizationId: ORG, firstName: "Quiet", email: "quiet@example.com" })
  const [v] = await db.select().from(s.visit).where(eq(s.visit.customerId, "c100"))
  visitId = v!.id
  await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-05", startTime: "08:00", personId: "person_truck-1" }).where(eq(s.visit.id, visitId))
})
afterAll(() => db.close())

const text = async (kind: "date-set" | "day-before" | "on-the-way", key: string, customerId = "c100") => {
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, customerId))
  const facts = (await loadVisitFacts(db, visitId, origin))!
  const added = await queueMessage(db, { organizationId: ORG, customerId, visitId, kind, key, data: { ...baseData(origin, customer!), visit: facts } })
  const [row] = await db.select().from(s.messageLog).where(and(eq(s.messageLog.customerId, customerId), eq(s.messageLog.key, key)))
  return { added, row }
}

describe("the first text to a number", () => {
  it("carries Reply STOP to opt out, and the texts after it do not", async () => {
    expect(await isFirstText(db, ORG, PHONE)).toBe(true)
    const first = await text("date-set", "t-first")
    expect(first.row!.body).toMatch(/Reply STOP to opt out\.$/)
    expect(await isFirstText(db, ORG, PHONE)).toBe(false)
    const second = await text("day-before", "t-second")
    expect(second.row!.body).toMatch(/^Trailhead: Ryan is coming tomorrow, Wed, May 5, 8 to 10 am, for your .+\. Your Trailhead account: https:\/\/site\.test\/account$/)
    expect(second.row!.body).not.toContain("STOP")
  })
  it("is not spoiled by a text that never reached the phone", async () => {
    const other = "+17205550199"
    await db.insert(s.messageLog).values([
      { organizationId: ORG, customerId: "c100", kind: "date-set", key: "k-skipped", channel: "sms", to: other, body: "x", status: "skipped" },
      { organizationId: ORG, customerId: "c100", kind: "date-set", key: "k-failed", channel: "sms", to: other, body: "x", status: "failed" },
    ])
    expect(await isFirstText(db, ORG, other)).toBe(true)
    await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c100", kind: "date-set", key: "k-sent", channel: "sms", to: other, body: "x", status: "sent" })
    expect(await isFirstText(db, ORG, other)).toBe(false)
  })
})

describe("the on-the-way text", () => {
  it("names the person and the address and links to the account", async () => {
    const { row } = await text("on-the-way", "otw-1")
    expect(row).toMatchObject({ channel: "sms", kind: "on-the-way" })
    expect(row!.body).toMatch(/^Trailhead: Ryan is on the way to .+ for your .+\. Your Trailhead account: https:\/\/site\.test\/account$/)
  })
  it("is a text or nothing: a customer with no mobile gets no email", async () => {
    const { added } = await text("on-the-way", "otw-2", EMAIL_ONLY)
    expect(added).toBe(false)
    expect(await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, EMAIL_ONLY))).toEqual([])
  })
})

describe("the words the office saved", () => {
  it("read in today's placeholders and used for the next text and the next email", async () => {
    const [org] = await db.select().from(s.organization).where(eq(s.organization.id, ORG))
    const saved = [
      { key: "day-before", channel: "sms", body: "{who} is coming tomorrow for your {service} at {address}.", enabled: true },
      { key: "date-set", channel: "email", body: "Hi {firstName}, your {visit} is set for {date}.", enabled: true },
      { key: "day-before", channel: "email", body: "broken {nope}", enabled: true },
    ] as const
    await db.update(s.organization).set({ settings: { ...org!.settings, messages: [...saved] } }).where(eq(s.organization.id, ORG))
    try {
      expect(Object.keys(await savedTemplates(db, ORG)).sort()).toEqual(["date-set:email", "day-before:sms"])
      const { row } = await text("day-before", "t-saved")
      expect(row!.body).toMatch(/^Trailhead: Ryan is coming tomorrow for your .+ at .+\. Your Trailhead account: /)
      // the email goes through the sender, which reads the saved words at send time
      const email = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c100", visitId, kind: "date-set", key: "e-saved", channel: "email", to: "andrea@example.com", subject: "x", body: "x", data: row!.data, status: "queued" }).returning()
      const sent: { text?: string }[] = []
      const deps: SendDeps = { email: async (m) => { sent.push(m); return { id: "re_1" } }, sms: async () => ({ id: "SM" }), smsConfigured: () => true }
      expect(await sendMessageRow(db, email[0]!.id, { deps })).toBe("sent")
      expect(sent[0]!.text).toMatch(/Hi Andrea, your .+ is set for Wednesday, May 5\./)
      // a saved day-before email that breaks a rule is ignored, so the shipped words go out
      const broken = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c100", visitId, kind: "day-before", key: "e-broken", channel: "email", to: "andrea@example.com", subject: "x", body: "x", data: row!.data, status: "queued" }).returning()
      await sendMessageRow(db, broken[0]!.id, { deps })
      expect(sent[1]!.text).toContain("a reminder that we're coming tomorrow")
    } finally {
      await db.update(s.organization).set({ settings: org!.settings }).where(eq(s.organization.id, ORG))
    }
  })
})
