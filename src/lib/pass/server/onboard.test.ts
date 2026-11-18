// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { and, eq, isNotNull, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb } from "@/api/test-helpers"
import { shapeAdminData } from "@/lib/admin/shape"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { newPassMessage, onboardPass } from "./onboard"

let db: TestDb
beforeAll(async () => { db = await apiDb() })
afterAll(() => db.close())

describe("onboardPass", () => {
  it("raises one 'New Season Pass' alert for an active pass, creates no jobs and leaves the visits to schedule", async () => {
    const [pass] = await db.select().from(s.job).where(and(isNotNull(s.job.season), isNotNull(s.job.soldOn), isNull(s.job.cancelledAt))).limit(1)
    const before = await db.select().from(s.visit).where(eq(s.visit.jobId, pass!.id))
    expect(await onboardPass(db, pass!.id)).toBe(true)
    expect(await onboardPass(db, pass!.id)).toBe(false)
    const alerts = await db.select().from(s.adminAlert).where(eq(s.adminAlert.jobId, pass!.id))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ kind: "new-pass", key: pass!.id, resolvedAt: null })
    expect(alerts[0]!.message).toMatch(/^New Season Pass: \w+, \w+, \d+ zones$/)
    expect(await db.select().from(s.visit).where(eq(s.visit.jobId, pass!.id))).toEqual(before)
  })
  it("words the alert with first name, town and zones, and skips a pass that is not active", async () => {
    expect(newPassMessage("Andrea", "Erie", 8)).toBe("New Season Pass: Andrea, Erie, 8 zones")
    const [cancelled] = await db.select().from(s.job).where(and(isNotNull(s.job.season), isNotNull(s.job.cancelledAt))).limit(1)
    if (cancelled) expect(await onboardPass(db, cancelled.id)).toBe(false)
    await expect(onboardPass(db, "nope")).rejects.toThrow(/not found/)
  })
  it("runs as the pass-onboard queue handler", async () => {
    const [pass] = await db.select().from(s.job).where(and(isNotNull(s.job.season), isNotNull(s.job.soldOn), isNull(s.job.cancelledAt))).offset(1).limit(1)
    await db.insert(s.queueItem).values({ organizationId: pass!.organizationId, kind: "pass-onboard", key: pass!.id, payload: { passId: pass!.id } })
    expect(await drain(db, { "pass-onboard": handlers["pass-onboard"]! })).toEqual({ done: 1, failed: 0 })
    expect(await db.select().from(s.adminAlert).where(eq(s.adminAlert.jobId, pass!.id))).toHaveLength(1)
  })
  it("answers a task queued with the old pass id and keys its alert by the job", async () => {
    const [pass] = await db.select().from(s.job).where(and(isNotNull(s.job.season), isNotNull(s.job.legacyPassId), isNotNull(s.job.soldOn), isNull(s.job.cancelledAt))).offset(2).limit(1)
    await db.insert(s.queueItem).values({ organizationId: pass!.organizationId, kind: "pass-onboard", key: pass!.legacyPassId!, payload: { passId: pass!.legacyPassId! } })
    expect(await drain(db, { "pass-onboard": handlers["pass-onboard"]! })).toEqual({ done: 1, failed: 0 })
    expect((await db.select().from(s.adminAlert).where(eq(s.adminAlert.jobId, pass!.id))).map((a) => a.key)).toEqual([pass!.id])
  })
})

describe("another organization's queue item", () => {
  it("cannot read this organization's pass job: the lookup is scoped by the item's organization", async () => {
    const [pass] = await db.select().from(s.job).where(and(isNotNull(s.job.season), isNotNull(s.job.soldOn), isNull(s.job.cancelledAt))).offset(3).limit(1)
    const item = { organizationId: "org-someone-else", kind: "pass-onboard", key: pass!.id, payload: { passId: pass!.id } } as never
    await expect(handlers["pass-onboard"]!(db, item)).rejects.toThrow(/not found/)
    await expect(handlers["pass-cancel"]!(db, { ...(item as object), kind: "pass-cancel" } as never)).rejects.toThrow(/not found/)
    await expect(onboardPass(db, pass!.id, "org-someone-else")).rejects.toThrow(/not found/)
    expect(await db.select().from(s.adminAlert).where(eq(s.adminAlert.jobId, pass!.id))).toEqual([])
  })
})

describe("the alert on Home", () => {
  it("shows up as a new-pass attention row from the shaped data", () => {
    const base = { organizationId: "o", now: new Date("2026-12-01T00:00:00Z"), today: "2026-12-01", syncedAt: new Date(), customers: [], jobberClientOf: new Map(), consents: [], visits: [], passes: [], messages: [], trucks: [], areas: [], settings: {}, settingsChanges: [], mirror: { clients: [], visits: [], jobsWithoutVisit: [], quotes: [], invoices: [] }, queueProblems: [], blocks: [] }
    const data = shapeAdminData({ ...base, alerts: [{ kind: "new-pass", passId: "p1", message: "New Season Pass: Andrea, Erie, 8 zones", createdAt: new Date("2026-12-01T00:00:00Z") }] } as never)
    expect(data.attention).toEqual([{ kind: "new-pass", passId: "p1", message: "New Season Pass: Andrea, Erie, 8 zones", since: "2026-12-01T00:00:00Z" }])
  })
})
