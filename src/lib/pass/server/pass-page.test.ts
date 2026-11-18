// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, customerPerson, jobIdOfPassId, owner, passJobOf, setPass } from "@/api/test-helpers"
import { loadPassPage } from "./pass-page"

let db: TestDb
let customerId: string
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  customerId = (await passJobOf(db, "p3")).customerId
})
afterAll(() => db.close())

describe("loadPassPage", () => {
  it("shapes the customer's own pass, with a booked visit carrying its date and the person coming", async () => {
    await db.update(s.visit).set({ status: "scheduled", personId: "person_truck-1", scheduledOn: "2027-05-04", startTime: "08:00" }).where(eq(s.visit.id, "p3-turn-on"))
    const data = await loadPassPage(ctxFor(db, customerPerson(customerId)))
    expect(data?.pass.id).toBe(await jobIdOfPassId(db, "p3"))
    expect(data?.passes.every((p) => p.clientId === customerId)).toBe(true)
    const turnOn = data!.pass.visits.find((v) => v.kind === "turn-on")!
    expect(turnOn.scheduledAt).toMatch(/^2027-05-04T/)
    expect(turnOn.personName).toBe("Ryan Garner")
    expect(data!.today).toBe("2027-04-20")
    expect(Object.keys(data!.pickDays).sort()).toEqual(["blowout", "turn-on"])
  })

  it("offers days to change to whether or not the customer is marked as needing to be home", async () => {
    await setPass(db, "p3", { needsCustomerHome: false })
    const data = await loadPassPage(ctxFor(db, customerPerson(customerId)))
    expect(data!.pickDays["blowout"]?.length).toBeGreaterThan(0)
    expect(data!.pickDays["turn-on"]?.length).toBeGreaterThan(0)
  })

  it("returns null for a customer with no pass and does not show an admin anyone's pass as theirs", async () => {
    expect(await loadPassPage(ctxFor(db, customerPerson("no-pass")))).toBeNull()
    expect(owner.type).toBe("admin")
  })
})
