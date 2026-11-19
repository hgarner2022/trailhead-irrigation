// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { testDb, type TestDb } from "./test-db"
import * as s from "./schema"

let db: TestDb
const ORG = "org-photo"

beforeAll(async () => {
  db = await testDb()
  await db.insert(s.organization).values({ id: ORG, name: "Trailhead", termsVersion: "2026-11", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
  await db.insert(s.customer).values({ id: "c1", organizationId: ORG, firstName: "Andrea" })
  await db.insert(s.property).values({ id: "pr1", organizationId: ORG, customerId: "c1", address: "1 Main St", town: "Erie" })
  await db.insert(s.job).values({ id: "j1", organizationId: ORG, customerId: "c1", propertyId: "pr1", source: "office" })
  await db.insert(s.visit).values({ id: "v1", organizationId: ORG, jobId: "j1", customerId: "c1", propertyId: "pr1", kind: "repair" })
})
afterAll(() => db.close())

const row = (over: Partial<typeof s.photo.$inferInsert> = {}) => ({ organizationId: ORG, visitId: "v1", jobId: "j1", customerId: "c1", blobKey: "photos/v1/a-1.jpg", contentType: "image/jpeg", bytes: 1200, addedBy: "ryan@example.com", ...over })

describe("photo table", () => {
  it("keeps a staff photo hidden from the customer and live until it is soft deleted", async () => {
    const [p] = await db.insert(s.photo).values(row()).returning()
    expect(p!.id).toMatch(/^photo_/)
    expect(p!.shownToCustomer).toBe(false)
    expect(p!.deletedAt).toBeNull()
    expect(p!.createdAt).toBeInstanceOf(Date)
    await db.update(s.photo).set({ deletedAt: new Date() }).where(eq(s.photo.id, p!.id))
    const [after] = await db.select().from(s.photo).where(eq(s.photo.id, p!.id))
    expect(after!.deletedAt).toBeInstanceOf(Date)
  })
  it("refuses a second row for the same stored file", async () => {
    await db.insert(s.photo).values(row({ blobKey: "photos/v1/dup.jpg" }))
    await expect(db.insert(s.photo).values(row({ blobKey: "photos/v1/dup.jpg" }))).rejects.toThrow()
  })
  it("refuses a photo for a visit, job, customer or organization that does not exist", async () => {
    await expect(db.insert(s.photo).values(row({ blobKey: "k1", visitId: "nope" }))).rejects.toThrow()
    await expect(db.insert(s.photo).values(row({ blobKey: "k2", jobId: "nope" }))).rejects.toThrow()
    await expect(db.insert(s.photo).values(row({ blobKey: "k3", customerId: "nope" }))).rejects.toThrow()
    await expect(db.insert(s.photo).values(row({ blobKey: "k4", organizationId: "nope" }))).rejects.toThrow()
  })
  it("has its indexes from the migration", async () => {
    const out = await db.execute(sql`select indexname from pg_indexes where tablename = 'photo' order by indexname`)
    expect(out.rows.map((r) => (r as { indexname: string }).indexname)).toEqual(["photo_blob_key_unique", "photo_job_idx", "photo_pkey", "photo_visit_idx"])
  })
})
