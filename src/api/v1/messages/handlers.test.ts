// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
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
  it("pages and rejects a bad limit", async () => {
    const first = await callApi(ctxFor(db, readKey), messagesList, { limit: 2 })
    expect(first.data).toHaveLength(2)
    expect((await callApi(ctxFor(db, readKey), messagesList, { limit: 2, cursor: first.next_cursor! })).data).toHaveLength(1)
    await expect(callApi(ctxFor(db, readKey), messagesList, { limit: 500 })).rejects.toMatchObject({ code: "invalid" })
  })
})

describe("messages.send", () => {
  beforeAll(() => { vi.stubEnv("APP_URL", "https://www.example.com") })
  it("enforces the scope and the kinds", async () => {
    await expect(callApi(ctxFor(db, readKey), messagesSend, { customerId: "c100", kind: "date-set" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "on-my-way" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "receipt" })).rejects.toMatchObject({ code: "unprocessable" })
  })

  it("queues a cancelled email through the gate and a repeat is its own message", async () => {
    const { eq } = await import("drizzle-orm")
    const [p] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.customerId, "c100"))
    await db.update(s.seasonPass).set({ status: "cancelled" }).where(eq(s.seasonPass.id, p!.id))
    await db.update(s.customer).set({ email: "andrea@example.com" }).where(eq(s.customer.id, "c100"))
    const sent = await callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "cancelled" })
    expect(sent).toMatchObject({ kind: "cancelled", channel: "email", status: "queued", to: "andrea@example.com" })
    expect(sent.subject).toContain("is cancelled")
    const queue = await db.select().from(s.queueItem).where(eq(s.queueItem.key, sent.id))
    expect(queue).toHaveLength(1)
    await callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "cancelled" })
    expect((await db.select().from(s.messageLog).where(eq(s.messageLog.kind, "cancelled")))).toHaveLength(2)
  })

  it("will not send a renewal to a customer without the opt-in", async () => {
    await db.insert(s.consent).values({ organizationId: ORG, customerId: "c100", marketingOptIn: false, marketingChannels: [], source: "checkout" })
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "renewal" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})
