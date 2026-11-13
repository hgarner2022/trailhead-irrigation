// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb } from "@/api/test-helpers"
import { cancelledMessage, cancelPassTask, queueCancelledEmail } from "./cancel"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("cancelPassTask", () => {
  it("raises one Home alert for a cancelled pass and none for a pass still open", async () => {
    expect(await cancelPassTask(db, "p1")).toBe(false)
    await db.update(s.seasonPass).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(s.seasonPass.id, "p1"))
    expect(await cancelPassTask(db, "p1")).toBe(true)
    expect(await cancelPassTask(db, "p1")).toBe(false)
    const alerts = await db.select().from(s.adminAlert).where(eq(s.adminAlert.passId, "p1"))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ kind: "pass-cancelled", key: "p1" })
    expect(alerts[0]!.message).toMatch(/^Season Pass TH-\d{4}-\d{4} cancelled: \w+, \w+$/)
  })
  it("words the alert with the number, first name and town", () => {
    expect(cancelledMessage("TH-2027-0004", "Andrea", "Erie")).toBe("Season Pass TH-2027-0004 cancelled: Andrea, Erie")
  })
})

describe("queueCancelledEmail", () => {
  it("queues one email with the pass page link, and a repeat adds nothing", async () => {
    const [{ customerId }] = await db.select({ customerId: s.seasonPass.customerId }).from(s.seasonPass).where(eq(s.seasonPass.id, "p2"))
    await db.update(s.customer).set({ email: "p2@example.com" }).where(eq(s.customer.id, customerId!))
    expect(await queueCancelledEmail(db, "p2", "https://site.test")).toBe(true)
    expect(await queueCancelledEmail(db, "p2", "https://site.test")).toBe(false)
    const rows = await db.select().from(s.messageLog).where(eq(s.messageLog.kind, "cancelled"))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ channel: "email", to: "p2@example.com", status: "queued" })
    expect(rows[0]!.body).toContain("https://site.test/account/pass")
  })
})
