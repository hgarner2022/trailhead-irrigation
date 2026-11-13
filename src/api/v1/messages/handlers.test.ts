// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
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
  it("is a stub that enforces the scope and the kinds", async () => {
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "date-set" })).rejects.toMatchObject({ code: "not_implemented" })
    await expect(callApi(ctxFor(db, readKey), messagesSend, { customerId: "c100", kind: "date-set" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), messagesSend, { customerId: "c100", kind: "on-my-way" })).rejects.toMatchObject({ code: "invalid" })
  })
})
