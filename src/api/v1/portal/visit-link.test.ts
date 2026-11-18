// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { PersonPrincipal } from "@/lib/auth/types"
import { signVisitLink, verifyVisitLink, visitLinkUrl, VISIT_LINK_DAYS } from "@/lib/messaging/tokens"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, customerPerson, writeKey } from "../../test-helpers"
import { customersCreate } from "../customers/handlers"
import { visitsAreaDays, visitsPick } from "../visits/handlers"
import { visitsCreate } from "../visits/office"
import { jobsList } from "./jobs"
import { visitsCancelSelf } from "./cancel"
import { customersMe } from "./me"

let db: TestDb
let dana: string
let eve: string
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  vi.stubEnv("API_KEY_PEPPER", "test-pepper-for-visit-links")
  db = await apiDb()
  const make = async (firstName: string, email: string) => (await callApi(ctxFor(db, writeKey), customersCreate, { firstName, lastName: "Tester", email, phone: "970-555-0142", property: { address: "12 Cottonwood Way", town: "Erie" } })).id
  dana = await make("Dana", "dana@example.com")
  eve = await make("Eve", "eve@example.com")
})
afterAll(() => db.close())

const NOW = "2027-05-20T15:00:00Z"
const office = () => ctxFor(db, writeKey, NOW)
/** What `visitLinkCtx` builds after a token checks out: the visit's customer, held to that one visit. */
const linked = (customerId: string, visitId: string): PersonPrincipal => ({ ...customerPerson(customerId, "x@example.com"), onlyVisitId: visitId })
const asLink = (customerId: string, visitId: string) => ctxFor(db, linked(customerId, visitId), NOW)

describe("the visit link token", () => {
  const now = new Date("2027-05-20T15:00:00Z")
  it("opens the visit and customer it was signed for, and no other", () => {
    const t = signVisitLink("visit-1", "cust-1", now)
    expect(verifyVisitLink("visit-1", "cust-1", t, now)).toBe(true)
    expect(verifyVisitLink("visit-2", "cust-1", t, now)).toBe(false)
    expect(verifyVisitLink("visit-1", "cust-2", t, now)).toBe(false)
  })
  it("is good for 30 days and not a minute more", () => {
    const t = signVisitLink("visit-1", "cust-1", now)
    const exp = Math.floor(now.getTime() / 1000) + VISIT_LINK_DAYS * 86_400
    expect(verifyVisitLink("visit-1", "cust-1", t, new Date((exp - 60) * 1000))).toBe(true)
    expect(verifyVisitLink("visit-1", "cust-1", t, new Date((exp + 1) * 1000))).toBe(false)
  })
  it("cannot be stretched: a changed expiry or a changed signature fails, and so does nothing, junk or another purpose's token", () => {
    const t = signVisitLink("visit-1", "cust-1", now)
    const [exp, sig] = t.split(".")
    expect(verifyVisitLink("visit-1", "cust-1", `${Number(exp) + 86_400}.${sig}`, now)).toBe(false)
    expect(verifyVisitLink("visit-1", "cust-1", `${exp}.${sig!.slice(0, -1)}x`, now)).toBe(false)
    expect(verifyVisitLink("visit-1", "cust-1", null, now)).toBe(false)
    expect(verifyVisitLink("visit-1", "cust-1", "junk", now)).toBe(false)
    expect(verifyVisitLink("visit-1", "cust-1", "123.abc", now)).toBe(false)
  })
  it("builds the address of that visit's page with the token in t", () => {
    const url = visitLinkUrl("https://site.test", "visit-1", "cust-1", now)
    expect(url).toMatch(/^https:\/\/site\.test\/account\/visits\/visit-1\?t=\d+\.[A-Za-z0-9_-]{32}$/)
  })
})

describe("what a visit link may call", () => {
  it("lets the link's customer see the days, move and cancel that one visit", async () => {
    const v = await callApi(office(), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: "2027-06-09", price: 145 })
    const { days } = await callApi(asLink(dana, v.id), visitsAreaDays, { id: v.id, count: 5 })
    expect(days.length).toBeGreaterThan(0)
    await expect(callApi(asLink(dana, v.id), visitsPick, { id: v.id, day: days[0]! })).resolves.toMatchObject({ status: "scheduled", scheduledOn: days[0] })
    await expect(callApi(asLink(dana, v.id), visitsCancelSelf, { id: v.id })).resolves.toMatchObject({ id: v.id, status: "cancelled" })
  })

  it("refuses another visit, even the same customer's, and another customer's visit", async () => {
    const mine = await callApi(office(), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: "2027-06-10", price: 145 })
    const sameCustomer = await callApi(office(), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: "2027-06-11", price: 145 })
    const theirs = await callApi(office(), visitsCreate, { customerId: eve, kind: "turn-on", scheduledOn: "2027-06-14", price: 145 })
    for (const other of [sameCustomer.id, theirs.id]) {
      await expect(callApi(asLink(dana, mine.id), visitsAreaDays, { id: other })).rejects.toMatchObject({ code: "forbidden" })
      await expect(callApi(asLink(dana, mine.id), visitsPick, { id: other, day: "2027-06-21" })).rejects.toMatchObject({ code: "forbidden" })
      await expect(callApi(asLink(dana, mine.id), visitsCancelSelf, { id: other })).rejects.toMatchObject({ code: "forbidden" })
    }
    expect((await db.select().from(s.visit).where(eq(s.visit.id, theirs.id)))[0]!.status).toBe("scheduled")
  })

  it("refuses everything else: the account, the list of jobs, anything not marked for a link", async () => {
    const v = await callApi(office(), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: "2027-06-15", price: 145 })
    await expect(callApi(asLink(dana, v.id), customersMe, {})).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(asLink(dana, v.id), jobsList, {})).rejects.toMatchObject({ code: "forbidden" })
  })

  it("still holds the 24-hour rule: inside it the link cannot cancel or move either", async () => {
    const v = await callApi(office(), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: "2027-05-21", price: 145 })
    await expect(callApi(asLink(dana, v.id), visitsCancelSelf, { id: v.id })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("within 24 hours") })
  })
})
