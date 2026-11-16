// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { testDb, type TestDb } from "@/db/test-db"
import * as s from "@/db/schema"
import { ADMIN, ORG, OWNER, seedAuth } from "@/lib/auth/test-seed"
import { queueStaffMessage } from "./queue"

const HANNAH = "hannah@example.com"
const TECH = "tech@example.com"
const GONE = "gone@example.com"

let db: TestDb
beforeAll(async () => {
  db = await testDb()
  await seedAuth(db)
  // People with no admin_user row: the person table is the one source of who hears from the office.
  await db.insert(s.person).values([
    { organizationId: ORG, name: "Hannah Garner", initials: "HG", email: HANNAH, role: "owner" },
    { organizationId: ORG, name: "Sam Tech", initials: "ST", email: TECH, role: "tech" },
    { organizationId: ORG, name: "Gone Owner", initials: "GO", email: GONE, role: "owner", active: false },
    { organizationId: ORG, name: "No Email", initials: "NE", email: null, role: "admin" },
  ])
})
afterAll(() => db.close())

describe("queueStaffMessage", () => {
  it("queues one message for each active owner or admin with an email, and nobody else", async () => {
    const queued = await queueStaffMessage(db, ORG, "admin-alert", "test:1", { title: "Hello" })
    const items = await db.select().from(s.queueItem).where(eq(s.queueItem.organizationId, ORG))
    const to = items.map((i) => (i.payload as { to: string }).to).sort()
    expect(queued).toBe(3)
    expect(to).toEqual([ADMIN, HANNAH, OWNER].sort())
    expect(items.every((i) => i.kind === "message" && (i.payload as { staff: boolean }).staff === true)).toBe(true)
  })
  it("adds nothing for the same event twice", async () => {
    expect(await queueStaffMessage(db, ORG, "admin-alert", "test:1", { title: "Hello" })).toBe(0)
  })
})
