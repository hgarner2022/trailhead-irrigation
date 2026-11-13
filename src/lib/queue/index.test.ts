// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { claimNext, drain, enqueue, MAX_ATTEMPTS } from "./index"

let db: TestDb
beforeAll(async () => { db = await apiDb() })
afterAll(() => db.close())
const item = (key: string) => db.select().from(s.queueItem).where(eq(s.queueItem.key, key)).then((r) => r[0]!)

describe("queue", () => {
  it("ignores a second item with the same kind and key", async () => {
    expect(await enqueue(db, ORG, "geocode", "p-dup", {})).toBe(true)
    expect(await enqueue(db, ORG, "geocode", "p-dup", {})).toBe(false)
  })
  it("claims an item once and not before it is due", async () => {
    await enqueue(db, ORG, "geocode", "p-later", {}, new Date("2030-01-01T00:00:00Z"))
    const first = await claimNext(db, ["geocode"], new Date("2027-01-01T00:00:00Z"))
    expect(first?.key).toBe("p-dup")
    expect(await claimNext(db, ["geocode"], new Date("2027-01-01T00:00:00Z"))).toBeUndefined()
    expect(await claimNext(db, ["geocode"], new Date("2031-01-01T00:00:00Z"))).toMatchObject({ key: "p-later" })
  })
  it("retries a throwing handler with a delay and fails it after the last attempt", async () => {
    await enqueue(db, ORG, "message", "m-1", {})
    let clock = new Date("2027-02-01T00:00:00Z")
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      expect(await drain(db, { message: async () => { throw new Error("boom") } }, () => clock)).toEqual({ done: 0, failed: 1 })
      clock = new Date(clock.getTime() + 24 * 3600_000)
    }
    expect(await item("m-1")).toMatchObject({ status: "failed", attempts: MAX_ATTEMPTS, lastError: "boom" })
  })
  it("marks a successful item done", async () => {
    await enqueue(db, ORG, "renewal-email", "r-1", {})
    expect(await drain(db, { "renewal-email": async () => {} })).toEqual({ done: 1, failed: 0 })
    expect(await item("r-1")).toMatchObject({ status: "done" })
  })
})
