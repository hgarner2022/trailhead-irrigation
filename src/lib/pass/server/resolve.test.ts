// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG, passJobOf } from "@/api/test-helpers"
import { jobIdsOfPassIds, resolvePassJob, resolvePassJobAnywhere } from "./resolve"

let db: TestDb
beforeAll(async () => { db = await apiDb() })
afterAll(() => db.close())

describe("resolvePassJob", () => {
  it("finds a pass by its job id, and by the old pass id its job kept", async () => {
    const job = await passJobOf(db, "p3")
    expect(job.legacyPassId).toBe("p3")
    expect((await resolvePassJob(db, ORG, job.id))?.id).toBe(job.id)
    expect((await resolvePassJob(db, ORG, "p3"))?.id).toBe(job.id)
    expect(await resolvePassJob(db, ORG, "no-such-pass")).toBeNull()
  })

  it("does not find another organization's pass, by either id", async () => {
    const job = await passJobOf(db, "p3")
    expect(await resolvePassJob(db, "org-other", job.id)).toBeNull()
    expect(await resolvePassJob(db, "org-other", "p3")).toBeNull()
    // the lookup that does not know the organization finds it and says which it is
    expect((await resolvePassJobAnywhere(db, "p3"))?.organizationId).toBe(ORG)
  })

  it("does not find a job that has no season, by its id or by an old id written on it", async () => {
    const [repair] = await db.select().from(s.job).where(eq(s.job.kind, "pass"))
    const customerId = repair!.customerId
    await db.insert(s.job).values({ id: "job-repair-x", organizationId: ORG, customerId, propertyId: repair!.propertyId, kind: "repair", source: "office", legacyPassId: "old-repair-x" })
    expect(await resolvePassJob(db, ORG, "job-repair-x")).toBeNull()
    expect(await resolvePassJob(db, ORG, "old-repair-x")).toBeNull()
    expect(await resolvePassJobAnywhere(db, "job-repair-x")).toBeNull()
  })

  it("prefers a job's own id over another job's old id that happens to match it", async () => {
    const a = await passJobOf(db, "p1")
    const b = await passJobOf(db, "p2")
    // b's old id is spelled like a's job id: the id wins as a job id
    await db.update(s.job).set({ legacyPassId: a.id }).where(eq(s.job.id, b.id))
    expect((await resolvePassJob(db, ORG, a.id))?.id).toBe(a.id)
    expect((await resolvePassJobAnywhere(db, a.id))?.id).toBe(a.id)
    expect((await jobIdsOfPassIds(db, ORG, [a.id])).get(a.id)).toBe(a.id)
    await db.update(s.job).set({ legacyPassId: b.legacyPassId }).where(eq(s.job.id, b.id))
  })
})

describe("jobIdsOfPassIds", () => {
  it("maps new and old ids to job ids at once and leaves unknown ones out", async () => {
    const p1 = await passJobOf(db, "p1")
    const p2 = await passJobOf(db, "p2")
    const found = await jobIdsOfPassIds(db, ORG, [p1.id, "p2", "nope", p1.id])
    expect(Object.fromEntries(found)).toEqual({ [p1.id]: p1.id, p2: p2.id })
    expect((await jobIdsOfPassIds(db, ORG, [])).size).toBe(0)
    expect((await jobIdsOfPassIds(db, "org-other", ["p1"])).size).toBe(0)
  })
})
