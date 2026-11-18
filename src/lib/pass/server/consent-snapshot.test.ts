// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { recordEvent } from "@/lib/events/record"
import { eq } from "drizzle-orm"
import { consentSnapshot } from "./consent-snapshot"

let db: TestDb
let pass: typeof s.seasonPass.$inferSelect
beforeAll(async () => {
  db = await apiDb()
  const [p] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p3"))
  pass = p!
})
afterAll(() => db.close())

const consent = (detail: Record<string, unknown>, minute: number, jobId = pass.jobId, organizationId = ORG) =>
  recordEvent(db, { organizationId, about: "job", aboutId: jobId, customerId: pass.customerId, jobId, kind: "consent", detail, who: "customer", at: new Date(Date.UTC(2027, 3, 1, 12, minute)) })

describe("consentSnapshot reads the consent events of the pass's job", () => {
  it("is undefined while nothing was chosen", async () => {
    expect(await consentSnapshot(db, pass.id)).toBeUndefined()
    expect(await consentSnapshot(db, "no-such-pass")).toBeUndefined()
  })
  it("reads the newest consent with stage chosen and ignores the purchase's own consent and other jobs", async () => {
    await consent({ marketingOptIn: true, marketingChannels: ["email"], stage: "chosen" }, 1)
    await consent({ marketingOptIn: true, marketingChannels: ["sms", "email"], stage: "chosen" }, 2)
    await consent({ marketingOptIn: false, marketingChannels: [], source: "checkout" }, 3)
    await consent({ marketingOptIn: false, marketingChannels: [], stage: "chosen" }, 4, "job_other")
    expect(await consentSnapshot(db, pass.id)).toEqual({ marketingOptIn: true, marketingChannels: ["sms", "email"] })
  })
  it("is off when no channel is left", async () => {
    await consent({ marketingOptIn: true, marketingChannels: [], stage: "chosen" }, 5)
    expect(await consentSnapshot(db, pass.id)).toEqual({ marketingOptIn: false, marketingChannels: [] })
  })
})
