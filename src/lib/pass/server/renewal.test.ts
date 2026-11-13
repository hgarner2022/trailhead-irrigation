// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, customerPerson } from "@/api/test-helpers"
import { renewUrl, signToken } from "@/lib/messaging/tokens"
import { loadRenewal } from "./renewal"

let db: TestDb
let customerId: string
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.seasonPass).set({ stripePaymentMethodId: "pm_old", cardExpires: "2029-08", needsCustomerHome: true, accessNote: "Gate 12" }).where(eq(s.seasonPass.id, "p1"))
  customerId = (await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p1")))[0]!.customerId
})
afterAll(() => db.close())

const token = () => signToken("renew-pass", "p1")
const ask = (over: Partial<Parameters<typeof loadRenewal>[1]> = {}) => loadRenewal(db, { passId: "p1", today: "2027-11-02", ...over })

describe("loadRenewal", () => {
  it("fills the checkout from the last pass for the signed link, and for the signed-in customer, and for nobody else", async () => {
    const byLink = await ask({ token: token() })
    expect(byLink).toMatchObject({ passId: "p1", season: 2028, zones: 6, card: { last4: "4242", expires: "2029-08" }, needsCustomerHome: true, accessNote: "Gate 12", place: { town: "Erie", state: "CO" }, token: token() })
    expect(await ask({ principal: customerPerson(customerId) })).toMatchObject({ passId: "p1", season: 2028 })
    expect(await ask()).toBeNull()
    expect(await ask({ token: "not-the-token" })).toBeNull()
    expect(await ask({ principal: customerPerson("someone-else") })).toBeNull()
    expect(await ask({ token: signToken("pass-image", "p1") })).toBeNull()
  })

  it("opens as an ordinary checkout for a pass that is cancelled, or whose next season is already held", async () => {
    expect(await loadRenewal(db, { passId: "nope", today: "2027-11-02", token: token() })).toBeNull()
    await db.update(s.seasonPass).set({ status: "cancelled" }).where(eq(s.seasonPass.id, "p1"))
    expect(await ask({ token: token() })).toBeNull()
    await db.update(s.seasonPass).set({ status: "active" }).where(eq(s.seasonPass.id, "p1"))
  })

  it("has a card of null when none is on file, so the checkout keeps its card step", async () => {
    await db.update(s.seasonPass).set({ stripePaymentMethodId: null }).where(eq(s.seasonPass.id, "p1"))
    expect((await ask({ token: token() }))?.card).toBeNull()
  })
})

describe("renewUrl", () => {
  it("is the prefilled checkout with the signed token", () => {
    expect(renewUrl("https://site.test", "p1")).toBe(`https://site.test/season-pass/checkout?renew=p1&token=${token()}`)
  })
})
