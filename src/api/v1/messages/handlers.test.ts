// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
import { messagesList, messagesSend } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  await db.insert(s.messageLog).values([
    { organizationId: ORG, customerId: "c100", kind: "purchase-confirmation", key: "p1", channel: "email", to: "andrea@example.com", subject: "Your Season Pass", body: "Thanks", status: "sent", sentAt: new Date() },
    { organizationId: ORG, customerId: "c100", kind: "date-set", key: "v1", channel: "sms", to: "+13035550142", body: "Your turn-on is May 5", status: "delivered" },
    { organizationId: ORG, customerId: "c121", kind: "receipt", key: "p2", channel: "email", to: "x@example.com", body: "Receipt", status: "failed" },
  ])
})
afterAll(() => db.close())

describe("messages.list", () => {
  it("filters by customer and hides the address from a read key", async () => {
    const read = await callApi(ctxFor(db, readKey), messagesList, { customerId: "c100" })
    expect(read.data).toHaveLength(2)
    expect(JSON.stringify(read)).not.toContain("andrea@example.com")
    expect(JSON.stringify(read)).not.toContain("+13035550142")
    const write = await callApi(ctxFor(db, writeKey), messagesList, { customerId: "c100" })
    expect(write.data.map((m) => m.to).sort()).toEqual(["+13035550142", "andrea@example.com"])
  })
  it("carries the delivery report, and the error code only for a write key", async () => {
    await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c121", kind: "date-set", key: "dr1", channel: "sms", to: "+13035550199", body: "x", status: "sent", deliveryStatus: "undelivered", deliveryError: "30007" })
    const read = (await callApi(ctxFor(db, readKey), messagesList, { customerId: "c121" })).data.find((m) => m.kind === "date-set")!
    expect(read).toMatchObject({ deliveryStatus: "undelivered" })
    expect(read.deliveryError).toBeUndefined()
    const write = (await callApi(ctxFor(db, writeKey), messagesList, { customerId: "c121" })).data.find((m) => m.kind === "date-set")!
    expect(write).toMatchObject({ deliveryStatus: "undelivered", deliveryError: "30007" })
    await db.delete(s.messageLog).where(eq(s.messageLog.key, "dr1"))
  })
  it("pages and rejects a bad limit", async () => {
    const first = await callApi(ctxFor(db, readKey), messagesList, { limit: 2 })
    expect(first.data).toHaveLength(2)
    expect((await callApi(ctxFor(db, readKey), messagesList, { limit: 2, cursor: first.next_cursor! })).data).toHaveLength(1)
    await expect(callApi(ctxFor(db, readKey), messagesList, { limit: 500 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("names the job an invoice text is about, from its invoice (the text is queued on the job, not a visit)", async () => {
    const [job] = await db.select().from(s.job).where(eq(s.job.customerId, "c100"))
    const [inv] = await db.insert(s.invoice).values({ organizationId: ORG, jobId: job!.id, customerId: "c100", number: "INV-2027-9100", amount: 145, total: 145, sentOn: "2027-05-07", dueOn: "2027-05-21", lines: [] }).returning()
    await db.insert(s.messageLog).values([
      { organizationId: ORG, customerId: "c100", kind: "invoice", key: `invoice-${inv!.id}`, channel: "sms", to: "+13035550142", body: "Your invoice", status: "sent" },
      { organizationId: ORG, customerId: "c100", kind: "invoice-reminder", key: `invoice-${inv!.id}-2027-05-10`, channel: "sms", to: "+13035550142", body: "A reminder", status: "sent" },
    ])
    const write = await callApi(ctxFor(db, writeKey), messagesList, { customerId: "c100" })
    expect(write.data.filter((m) => m.kind === "invoice" || m.kind === "invoice-reminder").map((m) => m.jobId)).toEqual([job!.id, job!.id])
    expect(write.data.find((m) => m.kind === "date-set")!.jobId).toBeNull()
  })
})

describe("messages.send", () => {
  beforeAll(() => { vi.stubEnv("APP_URL", "https://www.example.com") })
  it("enforces the scope and the kinds", async () => {
    await expect(callApi(ctxFor(db, readKey), messagesSend, { customerId: "c100", kind: "date-set" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "on-my-way" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "receipt" })).rejects.toMatchObject({ code: "unprocessable" })
  })

  it("queues a canceled email through the gate and a repeat is its own message", async () => {
    const { eq } = await import("drizzle-orm")
    const [p] = await db.select().from(s.job).where(eq(s.job.customerId, "c100"))
    await db.update(s.job).set({ cancelledAt: new Date() }).where(eq(s.job.id, p!.id))
    await db.update(s.customer).set({ email: "andrea@example.com" }).where(eq(s.customer.id, "c100"))
    const sent = await callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "cancelled" })
    expect(sent).toMatchObject({ kind: "cancelled", channel: "email", status: "queued", to: "andrea@example.com" })
    expect(sent.subject).toContain("is canceled")
    const queue = await db.select().from(s.queueItem).where(eq(s.queueItem.key, sent.id))
    expect(queue).toHaveLength(1)
    await callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "cancelled" })
    expect((await db.select().from(s.messageLog).where(eq(s.messageLog.kind, "cancelled")))).toHaveLength(2)
  })

  it("sends on the way for a visit that is today, once per visit per day, as a text only", async () => {
    const { eq } = await import("drizzle-orm")
    await db.update(s.customer).set({ phone: "+17205550155", email: "andrea@example.com" }).where(eq(s.customer.id, "c100"))
    const [v] = await db.select().from(s.visit).where(eq(s.visit.customerId, "c100"))
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-05", startTime: "08:00", personId: "person_truck-1" }).where(eq(s.visit.id, v!.id))
    const today = (day: string) => ctxFor(db, writeKey, `${day}T18:00:00Z`)
    await expect(callApi(today("2027-05-04"), messagesSend, { customerId: "c100", kind: "on-the-way", visitId: v!.id })).rejects.toMatchObject({ code: "unprocessable", message: "On my way is for a visit that is today" })
    await expect(callApi(today("2027-05-05"), messagesSend, { customerId: "c100", kind: "on-the-way" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, readKey), messagesSend, { customerId: "c100", kind: "on-the-way", visitId: v!.id })).rejects.toMatchObject({ code: "forbidden" })
    await db.update(s.visit).set({ status: "cancelled" }).where(eq(s.visit.id, v!.id))
    await expect(callApi(today("2027-05-05"), messagesSend, { customerId: "c100", kind: "on-the-way", visitId: v!.id })).rejects.toMatchObject({ code: "unprocessable" })
    await db.update(s.visit).set({ status: "scheduled" }).where(eq(s.visit.id, v!.id))
    const sent = await callApi(today("2027-05-05"), messagesSend, { customerId: "c100", kind: "on-the-way", visitId: v!.id })
    expect(sent).toMatchObject({ channel: "sms", kind: "on-the-way", status: "queued", visitId: v!.id, to: "+17205550155" })
    expect(sent.body).toMatch(/^Trailhead: Ryan is on the way to .+ for your .+\. See your visit: https:\/\/www\.example\.com\/account\/visits\/[^ ]+\?t=\d+\./)
    expect(await db.select().from(s.queueItem).where(eq(s.queueItem.key, sent.id))).toHaveLength(1)
    await expect(callApi(today("2027-05-05"), messagesSend, { customerId: "c100", kind: "on-the-way", visitId: v!.id })).rejects.toMatchObject({ code: "conflict" })
    expect((await db.select().from(s.messageLog).where(eq(s.messageLog.kind, "on-the-way")))).toHaveLength(1)
  })

  it("will not send a renewal to a customer without the opt-in", async () => {
    await db.insert(s.consent).values({ organizationId: ORG, customerId: "c100", marketingOptIn: false, marketingChannels: [], source: "checkout" })
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "renewal" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})
