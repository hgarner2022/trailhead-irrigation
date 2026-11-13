// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, customerPerson } from "../../test-helpers"
import { passesGet } from "../passes/handlers"
import { visitsAreaDays, visitsPick } from "./handlers"

let db: TestDb
let customerId: string
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p3"))
  customerId = pass!.customerId
  await db.update(s.seasonPass).set({ needsCustomerHome: true }).where(eq(s.seasonPass.id, "p3"))
  await db.update(s.customer).set({ phone: "303-555-0100", email: "p3@example.com" }).where(eq(s.customer.id, customerId))
})
afterAll(() => db.close())

const me = () => ctxFor(db, customerPerson(customerId, "p3@example.com"))

describe("visits.areaDays and visits.pick", () => {
  it("offers up to three days inside the window, none earlier than two days out", async () => {
    const { days } = await callApi(me(), visitsAreaDays, { id: "p3-turn-on" })
    expect(days.length).toBeGreaterThan(0)
    expect(days.length).toBeLessThanOrEqual(3)
    expect(days).toEqual([...days].sort())
    for (const d of days) {
      expect(d >= "2027-04-22").toBe(true)
      expect(d <= "2027-05-31").toBe(true)
      expect([0, 6]).not.toContain(new Date(`${d}T12:00:00Z`).getUTCDay())
    }
  })

  it("books the picked day on a truck, texts the date, and texts again when the day changes", async () => {
    const { days } = await callApi(me(), visitsAreaDays, { id: "p3-turn-on" })
    const out = await callApi(me(), visitsPick, { id: "p3-turn-on", day: days[0]! })
    expect(out).toMatchObject({ status: "scheduled", scheduledOn: days[0], awaitingPick: false })
    expect(out.truckName).toMatch(/^Truck/)
    const pass = await callApi(me(), passesGet, { id: "p3" })
    expect(pass.visits.find((v) => v.kind === "turn-on")).toMatchObject({ scheduledOn: days[0], truckName: out.truckName })
    let texts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === "p3-turn-on")
    expect(texts).toHaveLength(1)
    expect(texts[0]).toMatchObject({ channel: "sms", kind: "date-set", to: "303-555-0100", status: "queued" })
    expect(texts[0]!.body).toContain("https://site.test/account/pass")
    const second = (await callApi(me(), visitsAreaDays, { id: "p3-turn-on" })).days.find((d) => d !== days[0])
    await callApi(me(), visitsPick, { id: "p3-turn-on", day: second! })
    texts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === "p3-turn-on")
    expect(texts.map((m) => m.kind).sort()).toEqual(["date-moved", "date-set"])
    expect((await db.select().from(s.passChange).where(eq(s.passChange.visitId, "p3-turn-on"))).map((c) => c.kind)).toContain("day-picked")
  })

  it("refuses a day that was not offered, and another customer's visit", async () => {
    await expect(callApi(me(), visitsPick, { id: "p3-turn-on", day: "2027-05-02" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(me(), visitsPick, { id: "p3-turn-on", day: "2027-09-01" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, customerPerson("someone-else")), visitsAreaDays, { id: "p3-turn-on" })).rejects.toMatchObject({ code: "forbidden" })
  })

  it("offers the same choice whether or not the pass is marked as needing the customer home", async () => {
    await db.update(s.seasonPass).set({ needsCustomerHome: false }).where(eq(s.seasonPass.id, "p3"))
    const { days } = await callApi(me(), visitsAreaDays, { id: "p3-turn-on" })
    expect(days.length).toBeGreaterThan(0)
    await expect(callApi(me(), visitsPick, { id: "p3-turn-on", day: days[0]! })).resolves.toMatchObject({ status: "scheduled", scheduledOn: days[0] })
    await db.update(s.seasonPass).set({ needsCustomerHome: true }).where(eq(s.seasonPass.id, "p3"))
  })

  it("emails the date when the customer has no mobile number", async () => {
    await db.update(s.seasonPass).set({ needsCustomerHome: true }).where(eq(s.seasonPass.id, "p3"))
    await db.update(s.customer).set({ phone: null }).where(eq(s.customer.id, customerId))
    await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, truckId: null }).where(eq(s.visit.id, "p3-turn-on"))
    const { days } = await callApi(me(), visitsAreaDays, { id: "p3-blowout" })
    expect(days.length).toBeGreaterThan(0)
    const offered = (await callApi(me(), visitsAreaDays, { id: "p3-turn-on" })).days
    expect(offered).toHaveLength(3)
    // a day not texted before, since a repeat of the same day adds no second message
    const out = await callApi(me(), visitsPick, { id: "p3-turn-on", day: offered[2]! })
    expect(out.status).toBe("scheduled")
    const mail = (await db.select().from(s.messageLog)).filter((m) => m.visitId === "p3-turn-on" && m.channel === "email")
    expect(mail).toHaveLength(1)
    expect(mail[0]).toMatchObject({ kind: "date-set", to: "p3@example.com" })
  })

  it("leaves off a day both trucks' Jobber calendars block", async () => {
    await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, truckId: null }).where(eq(s.visit.id, "p3-turn-on"))
    const before = (await callApi(me(), visitsAreaDays, { id: "p3-turn-on" })).days
    const day = before[0]!
    const trucks = await db.select().from(s.truck)
    const at = (d: string, h: number) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00Z`)
    for (const [i, truck] of trucks.entries())
      await db.insert(s.jobberVisit).values({ id: `block-${i}`, organizationId: truck.organizationId, truckId: truck.id, isBlock: true, title: "Out", startAt: at(day, 6), endAt: new Date(at(day, 6).getTime() + 30 * 3_600_000) })
    const after = (await callApi(me(), visitsAreaDays, { id: "p3-turn-on" })).days
    expect(after).not.toContain(day)
    expect(after.length).toBeGreaterThan(0)
  })
})
