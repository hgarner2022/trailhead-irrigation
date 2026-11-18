// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import { renderToString } from "react-dom/server"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, customerPerson, passJobOf } from "@/api/test-helpers"
import { PassPageScreen } from "@/app/(account)/account/pass/_screens/PassPageScreen"
import { loadPassPage } from "./pass-page"

// The pass page must render for every state a visit can be in (a live 500, Nov 18 2026: a blowout booked for today). Each case sets the blowout visit to one
// state, reads the page through the API with the customer's own principal and renders the real screen.

let db: TestDb
let customerId: string
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  customerId = (await passJobOf(db, "p3")).customerId
})
afterAll(() => db.close())
beforeEach(async () => {
  await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, startTime: null, completedOn: null, personId: null }).where(eq(s.visit.id, "p3-blowout"))
})

async function page(set: Partial<typeof s.visit.$inferInsert>, now = "2027-04-20T15:00:00Z") {
  await db.update(s.visit).set(set).where(eq(s.visit.id, "p3-blowout"))
  const data = (await loadPassPage(ctxFor(db, customerPerson(customerId), now)))!
  const html = renderToString(<PassPageScreen pass={data.pass} passes={data.passes} today={data.today} pickDays={data.pickDays} />)
  return { data, html }
}

const TODAY = "2027-04-20"
describe("the pass page renders for every visit state", () => {
  it("no day", async () => expect((await page({ status: "unscheduled" })).html).toContain("Season Pass"))
  it("booked for today", async () => {
    const { html } = await page({ status: "scheduled", scheduledOn: TODAY, startTime: "08:00", personId: "person_truck-2" })
    expect(html).toContain("Season Pass")
  })
  it("booked for today with no time", async () => expect((await page({ status: "scheduled", scheduledOn: TODAY, startTime: null })).html).toContain("Season Pass"))
  it("booked for tomorrow", async () => expect((await page({ status: "scheduled", scheduledOn: "2027-04-21", startTime: "08:00" })).html).toContain("Season Pass"))
  it("booked on a day already past and not closed", async () => expect((await page({ status: "scheduled", scheduledOn: "2027-04-10", startTime: "08:00" })).html).toContain("Season Pass"))
  it("done", async () => expect((await page({ status: "completed", scheduledOn: "2027-04-10", completedOn: "2027-04-10" })).html).toContain("Season Pass"))
  it("skipped", async () => expect((await page({ status: "skipped" })).html).toContain("Season Pass"))
  it("canceled", async () => expect((await page({ status: "cancelled" })).html).toContain("Season Pass"))
})

describe("the live case, Nov 18 2026", () => {
  it("a 2027 pass whose turn-on was done early and whose blowout is booked today", async () => {
    await db.update(s.visit).set({ status: "completed", scheduledOn: "2027-04-27", completedOn: "2026-11-17" }).where(eq(s.visit.id, "p3-turn-on"))
    const { html } = await page({ status: "scheduled", scheduledOn: "2026-11-18", startTime: "08:00", personId: "person_truck-2" }, "2026-11-18T17:00:00Z")
    expect(html).toContain("Season Pass")
  })
})
