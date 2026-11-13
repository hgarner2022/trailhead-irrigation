// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb } from "@/api/test-helpers"
import { expiryWords, lastDayOf, queueCardExpiryMessages } from "./card-expiry"

let db: TestDb
let passId: string
let customerId: string
const link = vi.fn(async () => "https://billing.stripe.com/s/x")
beforeAll(async () => {
  db = await apiDb()
  const [p] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.status, "active")).limit(1)
  passId = p!.id
  customerId = p!.customerId
  await db.update(s.customer).set({ email: "andrea@example.com", stripeCustomerId: "cus_1" }).where(eq(s.customer.id, customerId))
  await db.update(s.seasonPass).set({ cardExpires: "2027-07", season: 2027 }).where(eq(s.seasonPass.id, passId))
  await db.update(s.visit).set({ status: "unscheduled" }).where(eq(s.visit.passId, passId))
  await db.delete(s.messageLog)
})
afterAll(() => db.close())

describe("card expiry", () => {
  it("reads the last day and the words of an expiry", () => {
    expect(lastDayOf("2027-07")).toBe("2027-07-31")
    expect(lastDayOf("2028-02")).toBe("2028-02-29")
    expect(expiryWords("2027-07")).toBe("July 2027")
  })

  it("does nothing more than sixty days ahead", async () => {
    expect(await queueCardExpiryMessages(db, link, "https://x.test", new Date("2027-05-20T18:00:00Z"))).toBe(0)
  })

  it("queues one card-expiring message inside sixty days with the update link, and a repeat adds nothing", async () => {
    expect(await queueCardExpiryMessages(db, link, "https://x.test", new Date("2027-06-10T18:00:00Z"))).toBe(1)
    expect(await queueCardExpiryMessages(db, link, "https://x.test", new Date("2027-06-11T18:00:00Z"))).toBe(0)
    const [row] = await db.select().from(s.messageLog).where(eq(s.messageLog.kind, "card-expiring"))
    expect(row).toMatchObject({ channel: "email", to: "andrea@example.com", key: `expiry-${passId}-2027-07` })
    expect(row!.body).toContain("expires in July 2027")
    expect(row!.body).toContain("https://billing.stripe.com/s/x")
  })

  it("leaves a card that outlasts October, and a pass with nothing left to do", async () => {
    await db.update(s.seasonPass).set({ cardExpires: "2028-01" }).where(eq(s.seasonPass.id, passId))
    expect(await queueCardExpiryMessages(db, link, "https://x.test", new Date("2027-12-10T18:00:00Z"))).toBe(0)
    await db.update(s.seasonPass).set({ cardExpires: "2027-08" }).where(eq(s.seasonPass.id, passId))
    await db.update(s.visit).set({ status: "completed" }).where(eq(s.visit.passId, passId))
    expect(await queueCardExpiryMessages(db, link, "https://x.test", new Date("2027-07-10T18:00:00Z"))).toBe(0)
  })
})
