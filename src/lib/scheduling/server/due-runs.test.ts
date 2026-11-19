// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { queueDueRuns } from "./daily"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("queueDueRuns reads the saved windows year-agnostic", () => {
  it("queues next season's first run in its own year, though the saved window carries another year", async () => {
    const [org] = await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ORG))
    const saved = org!.settings.windows.find((w) => w.kind === "turn-on")!
    const year = Number(saved.opensOn.slice(0, 4))
    // a day inside the turn-on lead time two years after the year the window was saved in
    const day = `${year + 2}-${saved.opensOn.slice(5, 10)}`
    expect(await queueDueRuns(db, ORG, day)).toBeGreaterThanOrEqual(1)
    const keys = (await db.select().from(s.queueItem).where(eq(s.queueItem.kind, "schedule-run"))).map((q) => q.key)
    expect(keys).toContain(`turn-on:${year + 2}:first`)
    expect(keys).not.toContain(`turn-on:${year}:first`)
  })
})
