// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, customerPerson, passJobOf, setPass } from "@/api/test-helpers"
import { renewUrl, signToken } from "@/lib/messaging/tokens"
import { loadRenewal } from "./renewal"

let db: TestDb
let customerId: string
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  // the yard answers live on the property
  await setPass(db, "p1", { needsCustomerHome: true, accessNote: "Gate 12" })
  customerId = (await passJobOf(db, "p1")).customerId
  // The card the checkout offers to reuse is the customer's.
  await db.update(s.customer).set({ stripePaymentMethodId: "pm_old", cardExpires: "2029-08" }).where(eq(s.customer.id, customerId))
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

  it("opens by the job id with a link signed over it, and by the old pass id with a link signed over that", async () => {
    const jobId = (await passJobOf(db, "p1")).id
    expect(await ask({ passId: jobId, token: signToken("renew-pass", jobId) })).toMatchObject({ passId: jobId, season: 2028, zones: 6 })
    // a link signed over one id does not open the other spelling of it: the signature is checked over the id as it arrived
    expect(await ask({ passId: jobId, token: token() })).toBeNull()
    expect(await ask({ passId: "p1", token: signToken("renew-pass", jobId) })).toBeNull()
  })

  it("reads the add-on from the pass's lines", async () => {
    const jobId = (await passJobOf(db, "p1")).id
    expect((await ask({ token: token() }))?.inspection).toBe(true)
    await db.update(s.lineItem).set({ cancelledAt: new Date() }).where(and(eq(s.lineItem.jobId, jobId), eq(s.lineItem.name, "Mid-season inspection")))
    expect((await ask({ token: token() }))?.inspection).toBe(false)
    await db.update(s.lineItem).set({ cancelledAt: null }).where(and(eq(s.lineItem.jobId, jobId), eq(s.lineItem.name, "Mid-season inspection")))
  })

  it("opens as an ordinary checkout for a pass that is canceled, or whose next season is already held", async () => {
    expect(await loadRenewal(db, { passId: "nope", today: "2027-11-02", token: token() })).toBeNull()
    const { id: jobId } = await passJobOf(db, "p1")
    await db.update(s.job).set({ cancelledAt: new Date() }).where(eq(s.job.id, jobId))
    expect(await ask({ token: token() })).toBeNull()
    await db.update(s.job).set({ cancelledAt: null }).where(eq(s.job.id, jobId))
  })

  it("has a card of null when none is on file, so the checkout keeps its card step", async () => {
    await db.update(s.customer).set({ stripePaymentMethodId: null }).where(eq(s.customer.id, customerId))
    expect((await ask({ token: token() }))?.card).toBeNull()
  })
})

describe("renewUrl", () => {
  it("is the prefilled checkout with the signed token", () => {
    expect(renewUrl("https://site.test", "p1")).toBe(`https://site.test/season-pass/checkout?renew=p1&token=${token()}`)
  })
})
