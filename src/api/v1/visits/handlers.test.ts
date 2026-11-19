// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { desc, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { recordEvent } from "@/lib/events/record"
import { waitingVisitIds } from "@/lib/admin/move-rules"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, eventsOf, jobIdOfPassId, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsConfirm, visitsGet, visitsList, visitsMove, visitsRequestMove, visitsStretch } from "./handlers"
import { visitsMarkClosed } from "./money"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.insert(s.webhookEndpoint).values({ id: "hook", organizationId: ORG, url: "https://hooks.example.com/x", secret: "whsec_x", events: ["visit.scheduled", "visit.moved"] })
})
afterAll(() => db.close())

const move = (input: Record<string, unknown>, principal = writeKey) => callApi(ctxFor(db, principal), visitsMove, input)

describe("visits.list and visits.get", () => {
  it("filters by kind, status, pass and day range", async () => {
    expect((await callApi(ctxFor(db, readKey), visitsList, { passId: "p1" })).data.map((v) => v.kind).sort()).toEqual(["blowout", "inspection", "turn-on"])
    // the job id of that pass finds the same visits, and carries itself as their pass id; a pass that is not there matches none
    const jobId = await jobIdOfPassId(db, "p1")
    const byJob = await callApi(ctxFor(db, readKey), visitsList, { passId: jobId })
    expect(byJob.data.map((v) => v.kind).sort()).toEqual(["blowout", "inspection", "turn-on"])
    expect(byJob.data.every((v) => v.passId === jobId)).toBe(true)
    expect((await callApi(ctxFor(db, readKey), visitsList, { passId: "no-such-pass" })).data).toEqual([])
    const done = await callApi(ctxFor(db, readKey), visitsList, { status: "completed", kind: "turn-on" })
    expect(done.data.map((v) => v.id)).toContain("p1-turn-on")
    expect((await callApi(ctxFor(db, readKey), visitsList, { from: "2027-05-03", to: "2027-05-03" })).data.map((v) => v.id)).toEqual(["p1-turn-on"])
    await expect(callApi(ctxFor(db, readKey), visitsList, { status: "lost" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("hides addresses from a read key", async () => {
    expect(await callApi(ctxFor(db, readKey), visitsGet, { id: "p1-turn-on" })).not.toHaveProperty("address")
    expect(await callApi(ctxFor(db, writeKey), visitsGet, { id: "p1-turn-on" })).toHaveProperty("address")
    await expect(callApi(ctxFor(db, readKey), visitsGet, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("visits carry the job's lines", () => {
  it("lists the lines with the service's description, and the amount is the visit's own line", async () => {
    const got = await callApi(ctxFor(db, readKey), visitsGet, { id: "p1-turn-on" })
    expect(got.lineItems.length).toBeGreaterThan(1)
    const own = got.lineItems.find((l) => l.visitId === "p1-turn-on")!
    expect(own.description).toContain("controller programming")
    expect(got.amount).toBe(own.quantity * own.unitPrice)
  })
  it("a visit's price is its line's, and a canceled line takes it to nothing", async () => {
    const [line] = await db.select().from(s.lineItem).where(eq(s.lineItem.visitId, "p1-blowout"))
    try {
      expect((await callApi(ctxFor(db, readKey), visitsGet, { id: "p1-blowout" })).amount).toBe(line!.quantity * line!.unitPrice)
      await db.update(s.lineItem).set({ cancelledAt: new Date() }).where(eq(s.lineItem.id, line!.id))
      const got = await callApi(ctxFor(db, readKey), visitsGet, { id: "p1-blowout" })
      expect(got.amount).toBe(0)
      expect(got.lineItems.find((l) => l.id === line!.id)!.cancelledAt).toMatch(/^\d{4}-\d\d-\d\dT/)
    } finally {
      await db.update(s.lineItem).set({ cancelledAt: null }).where(eq(s.lineItem.id, line!.id))
    }
  })
  it("a visit with no line of its own costs nothing", async () => {
    const [line] = await db.select().from(s.lineItem).where(eq(s.lineItem.visitId, "p1-inspection"))
    await db.update(s.lineItem).set({ visitId: null }).where(eq(s.lineItem.id, line!.id))
    try {
      expect((await callApi(ctxFor(db, readKey), visitsGet, { id: "p1-inspection" })).amount).toBe(0)
    } finally {
      await db.update(s.lineItem).set({ visitId: "p1-inspection" }).where(eq(s.lineItem.id, line!.id))
    }
  })
})

describe("visits.move after the write", () => {
  it("orders both truck-days, resolves the unplaced row and texts date-set, then date-moved", async () => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "p11-turn-on"))
    await db.update(s.customer).set({ phone: "303-555-0111" }).where(eq(s.customer.id, v!.customerId))
    await db.insert(s.adminAlert).values({ organizationId: ORG, kind: "unplaced", key: "p11-turn-on", message: "x" })
    const first = await move({ id: "p11-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-17" })
    expect(first).toMatchObject({ status: "scheduled", stopOrder: 1, startTime: "09:00" })
    expect((await db.select().from(s.adminAlert).where(eq(s.adminAlert.key, "p11-turn-on")))[0]!.resolvedAt).not.toBeNull()
    await move({ id: "p11-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-18" })
    const texts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === "p11-turn-on")
    expect(texts.map((m) => m.kind).sort()).toEqual(["date-moved", "date-set"])
    expect(texts.every((m) => m.channel === "sms")).toBe(true)
  })

  it("counts a Jobber calendar block against the day", async () => {
    await db.insert(s.jobberVisit).values({ id: "feed:person_truck-2:blk", organizationId: ORG, isBlock: true, title: "Out", startAt: new Date("2027-05-20T06:00:00Z"), endAt: new Date("2027-05-21T06:00:00Z") })
    await expect(move({ id: "p12-turn-on", personId: "person_truck-2", scheduledOn: "2027-05-20" })).rejects.toThrow(/full of turn-on/)
  })
})

describe("visits.move", () => {
  it("places a visit, marks it scheduled and queues the visit.scheduled event", async () => {
    const out = await move({ id: "p3-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-05", startTime: "08:30" })
    expect(out).toMatchObject({ status: "scheduled", personId: "person_truck-1", scheduledOn: "2027-05-05", startTime: "08:30", awaitingPick: false })
    const events = await db.select().from(s.outboundEvent)
    expect(events.map((e) => e.event)).toContain("visit.scheduled")
    await move({ id: "p3-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-06" })
    expect((await db.select().from(s.outboundEvent)).map((e) => e.event)).toContain("visit.moved")
    // The story: one event per placement, about the visit, with the job and the customer, by the key that placed it.
    const [first] = await eventsOf(db, { kind: "visit.scheduled", aboutId: "p3-turn-on" })
    expect(first).toMatchObject({ about: "visit", aboutId: "p3-turn-on", customerId: expect.any(String), jobId: expect.any(String), visitId: "p3-turn-on", who: "api", detail: { name: "Spring turn-on", day: "2027-05-05", from: null, personId: "person_truck-1" } })
    expect(await eventsOf(db, { kind: "visit.moved", aboutId: "p3-turn-on" })).toMatchObject([{ detail: { day: "2027-05-06", from: "2027-05-05", personId: "person_truck-1" } }])
  })
  it("names the person and answers the same under the old truck names", async () => {
    const out = await move({ id: "p3-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-07" })
    expect(out).toMatchObject({ personId: "person_truck-1", personName: "Ryan Garner", truckId: "person_truck-1", truckName: "Ryan Garner" })
    const event = (await db.select().from(s.outboundEvent).orderBy(desc(s.outboundEvent.createdAt))).find((e) => e.event === "visit.moved")!
    expect(event.payload).toMatchObject({ visitId: "p3-turn-on", personId: "person_truck-1", truckId: "person_truck-1", scheduledOn: "2027-05-07" })
  })
  it("takes `truckId` as an alias of personId for one season: the person's id, or the truck id they were made from", async () => {
    await expect(move({ id: "p3-turn-on", truckId: "person_truck-2", scheduledOn: "2027-05-07" })).resolves.toMatchObject({ personId: "person_truck-2", personName: "Tech Two" })
    await expect(move({ id: "p3-turn-on", truckId: "truck-1", scheduledOn: "2027-05-06" })).resolves.toMatchObject({ personId: "person_truck-1", personName: "Ryan Garner" })
    await expect(move({ id: "p3-turn-on", scheduledOn: "2027-05-07" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("refuses a person who is not on the schedule: out of service, or with no truck to drive", async () => {
    await db.update(s.person).set({ active: false }).where(eq(s.person.id, "person_truck-2"))
    await expect(move({ id: "p3-turn-on", personId: "person_truck-2", scheduledOn: "2027-05-06" })).rejects.toThrow(/not in service/)
    await db.update(s.person).set({ active: true, truck: null }).where(eq(s.person.id, "person_truck-2"))
    await expect(move({ id: "p3-turn-on", personId: "person_truck-2", scheduledOn: "2027-05-06" })).rejects.toThrow(/not in service/)
    await db.update(s.person).set({ truck: "Truck 2" }).where(eq(s.person.id, "person_truck-2"))
  })
  it("refuses a day the truck does not work", async () => {
    await expect(move({ id: "p4-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-08" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(move({ id: "p4-turn-on", personId: "person_truck-2", scheduledOn: "2027-05-08" })).resolves.toMatchObject({ scheduledOn: "2027-05-08" })
  })
  it("refuses a day outside the visit's window", async () => {
    await expect(move({ id: "p5-turn-on", personId: "person_truck-1", scheduledOn: "2027-06-02" })).rejects.toThrow(/must land between/)
    await expect(move({ id: "p5-blowout", personId: "person_truck-1", scheduledOn: "2027-05-05" })).rejects.toThrow(/must land between/)
  })
  it("refuses a second area on a truck-day", async () => {
    await expect(move({ id: "p6-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-06" })).rejects.toThrow(/different area/)
    await expect(move({ id: "p7-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-06" })).resolves.toMatchObject({ personId: "person_truck-1" })
  })
  it("refuses a full truck-day", async () => {
    await db.update(s.person).set({ capacityByKind: { "turn-on": 1, inspection: 5, blowout: 10, repair: 4, other: 2 } }).where(eq(s.person.id, "person_truck-2"))
    await move({ id: "p8-turn-on", personId: "person_truck-2", scheduledOn: "2027-05-12" })
    await expect(move({ id: "p10-turn-on", personId: "person_truck-2", scheduledOn: "2027-05-12" })).rejects.toThrow(/full of turn-on/)
  })
  it("writes no event for a placement that is refused", async () => {
    const before = (await eventsOf(db, { visitId: "p11-blowout" })).length
    await expect(move({ id: "p11-blowout", personId: "person_truck-1", scheduledOn: "2027-05-01" })).rejects.toMatchObject({ code: "unprocessable" })
    expect(await eventsOf(db, { visitId: "p11-blowout" })).toHaveLength(before)
  })
  it("refuses a finished visit, an unknown truck, a bad day and a read key", async () => {
    await expect(move({ id: "p1-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-10" })).rejects.toThrow(/completed/)
    await expect(move({ id: "p11-turn-on", personId: "nope", scheduledOn: "2027-05-10" })).rejects.toMatchObject({ code: "not_found" })
    await expect(move({ id: "p11-turn-on", personId: "person_truck-1", scheduledOn: "May 10" })).rejects.toMatchObject({ code: "invalid" })
    await expect(move({ id: "p11-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-10" }, readKey)).rejects.toMatchObject({ code: "forbidden" })
  })
  it("is idempotent on an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "move-1" }
    const a = await callApi(ctx, visitsMove, { id: "p12-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-11" })
    const b = await callApi(ctx, visitsMove, { id: "p12-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-11" })
    expect(b).toEqual(a)
  })
})

describe("visits.move texts, Ryan's line and Waiting on customer (step 4)", () => {
  const textsOf = async (visitId: string) => (await db.select().from(s.messageLog)).filter((m) => m.visitId === visitId && m.kind === "date-moved").sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
  const withPhone = async (visitId: string) => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, visitId))
    await db.update(s.customer).set({ phone: "303-555-0142" }).where(eq(s.customer.id, v!.customerId))
    return v!
  }
  const place = (id: string, day: string) => move({ id, personId: "person_truck-1", scheduledOn: day })

  it("texts the new day with Ryan's line and the signed one-visit link, and records that it texted", async () => {
    await withPhone("p9-turn-on")
    await place("p9-turn-on", "2027-05-24")
    await move({ id: "p9-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-25", note: "  Rain on Tuesday  " })
    const text = (await textsOf("p9-turn-on")).at(-1)
    expect(text!.body).toMatch(/^Trailhead: your spring turn-on moved to Tue, May 25\. Another day\? Rain on Tuesday\. Doesn't work\? Pick another day: https:\/\/site\.test\/account\/visits\/p9-turn-on\?t=/)
    expect(text!.body).not.toContain("Reply YES")
    const [ev] = await eventsOf(db, { kind: "visit.moved", aboutId: "p9-turn-on" })
    expect(ev!.detail).toMatchObject({ texted: true, note: "Rain on Tuesday", day: "2027-05-25" })
    expect(ev!.detail).not.toHaveProperty("asked")
  })

  it("moves without texting when nothing was promised: no message, the event says so", async () => {
    await withPhone("p9-blowout")
    await place("p9-blowout", "2027-10-05")
    await move({ id: "p9-blowout", personId: "person_truck-1", scheduledOn: "2027-10-06", notify: false })
    expect(await textsOf("p9-blowout")).toHaveLength(0)
    const [ev] = await eventsOf(db, { kind: "visit.moved", aboutId: "p9-blowout" })
    expect(ev!.detail).toMatchObject({ texted: false, quiet: true })
    // the note goes in the text, so a note with no text is refused
    await expect(move({ id: "p9-blowout", personId: "person_truck-1", scheduledOn: "2027-10-07", notify: false, note: "hi" })).rejects.toMatchObject({ code: "invalid" })
  })

  it("never moves a booked time without texting: a told window, or a time on a one-off", async () => {
    await withPhone("p4-blowout")
    await place("p4-blowout", "2027-10-12")
    // the day-before text went for its present day: the window is told
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "p4-blowout"))
    await db.insert(s.messageLog).values({ organizationId: ORG, customerId: v!.customerId, visitId: v!.id, kind: "day-before", key: `p4-blowout-${v!.scheduledOn}`, channel: "sms", to: "303-555-0142", subject: null, body: "x", data: {}, status: "sent" })
    await expect(move({ id: "p4-blowout", personId: "person_truck-1", scheduledOn: "2027-10-13", notify: false })).rejects.toThrow(/booked time, so the customer is always texted/)
    expect(await textsOf("p4-blowout")).toHaveLength(0)
    await expect(move({ id: "p4-blowout", personId: "person_truck-1", scheduledOn: "2027-10-13", startTime: "10:00" })).resolves.toMatchObject({ scheduledOn: "2027-10-13", startTime: "10:00" })
    // a chosen time is in the text: the window and who is coming
    expect((await textsOf("p4-blowout")).at(-1)!.body).toContain("moved to Wed, Oct 13, 10 am to 12 pm.")
  })

  it("asks a must-be-home property to reply YES and reads Waiting on customer until a confirmation, a later move or the customer's own pick", async () => {
    const v = await withPhone("p3-blowout")
    await db.update(s.property).set({ mustBeHome: true }).where(eq(s.property.id, v.propertyId))
    await place("p3-blowout", "2027-10-19")
    await move({ id: "p3-blowout", personId: "person_truck-1", scheduledOn: "2027-10-20", note: "Away on the 19th" })
    const text = (await textsOf("p3-blowout")).at(-1)
    expect(text!.body).toMatch(/^Trailhead: your fall blowout moved to Wed, Oct 20\. Away on the 19th\. Reply YES or pick another day: https:\/\/site\.test\/account\/visits\/p3-blowout\?t=/)
    // `eventsOf` lists oldest first; the rule reads newest first, as the API lists them
    const waiting = async () => waitingVisitIds((await eventsOf(db, { visitId: "p3-blowout" })).reverse())
    expect((await waiting()).has("p3-blowout")).toBe(true)
    // without the text there is nothing to answer
    await move({ id: "p3-blowout", personId: "person_truck-1", scheduledOn: "2027-10-21", notify: false })
    expect((await waiting()).has("p3-blowout")).toBe(false)
    await move({ id: "p3-blowout", personId: "person_truck-1", scheduledOn: "2027-10-22" })
    expect((await waiting()).has("p3-blowout")).toBe(true)
    await callApi(ctxFor(db, writeKey), visitsConfirm, { id: "p3-blowout" })
    expect((await waiting()).has("p3-blowout")).toBe(false)
    expect(await eventsOf(db, { kind: "visit.confirmed", aboutId: "p3-blowout" })).toMatchObject([{ about: "visit", detail: { day: "2027-10-22" } }])
  })

  it("does not ask a first placement (a day set, not a move), and Confirm needs a scheduled visit and the write scope", async () => {
    const v = await withPhone("p2-blowout")
    await db.update(s.property).set({ mustBeHome: true }).where(eq(s.property.id, v.propertyId))
    await place("p2-blowout", "2027-10-26")
    const [ev] = await eventsOf(db, { kind: "visit.scheduled", aboutId: "p2-blowout" })
    expect(ev!.detail).not.toHaveProperty("asked")
    await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, personId: null }).where(eq(s.visit.id, "p7-blowout"))
    await expect(callApi(ctxFor(db, writeKey), visitsConfirm, { id: "p7-blowout" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, readKey), visitsConfirm, { id: "p2-blowout" })).rejects.toMatchObject({ code: "forbidden" })
  })

  it("asks nobody, and so waits on nobody, when the customer cannot be reached", async () => {
    const v = await withPhone("p2-inspection")
    await db.update(s.customer).set({ phone: null, email: null }).where(eq(s.customer.id, v.customerId))
    await db.update(s.property).set({ mustBeHome: true }).where(eq(s.property.id, v.propertyId))
    await place("p2-inspection", "2027-07-13")
    await place("p2-inspection", "2027-07-14")
    const [ev] = await eventsOf(db, { kind: "visit.moved", aboutId: "p2-inspection" })
    expect(ev!.detail).toMatchObject({ texted: false })
    expect(ev!.detail).not.toHaveProperty("asked")
  })

  it("texts a time Ryan gives on the same day: the text says the time and the history names it", async () => {
    await withPhone("p8-turn-on")
    await place("p8-turn-on", "2027-05-24")
    const before = (await textsOf("p8-turn-on")).length
    // refused silently: a chosen time is always told
    await expect(move({ id: "p8-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-24", startTime: "10:00", notify: false })).rejects.toThrow(/always told/)
    await move({ id: "p8-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-24", startTime: "10:00" })
    const texts = await textsOf("p8-turn-on")
    expect(texts).toHaveLength(before + 1)
    expect(texts.at(-1)!.body).toMatch(/^Trailhead: your spring turn-on is still Mon, May 24, now 10 am to 12 pm\. /)
    const evs = await eventsOf(db, { kind: "visit.moved", aboutId: "p8-turn-on" })
    expect(evs.at(-1)!.detail).toMatchObject({ texted: true, sameDay: true, startTime: "10:00", day: "2027-05-24" })
    // the same time again is nothing new: no second text
    await move({ id: "p8-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-24", startTime: "10:00" })
    expect(await textsOf("p8-turn-on")).toHaveLength(before + 1)
  })

  it("texts every move Ryan makes, even back to a day it was texted before", async () => {
    await withPhone("p8-blowout")
    await place("p8-blowout", "2027-10-27")
    await place("p8-blowout", "2027-10-28")
    await place("p8-blowout", "2027-10-27")
    await place("p8-blowout", "2027-10-28")
    expect(await textsOf("p8-blowout")).toHaveLength(3)
  })
})

describe("visits.markClosed and visits.stretch", () => {
  it("closes a scheduled visit for the collect scope and not for a read key", async () => {
    await expect(callApi(ctxFor(db, readKey), visitsMarkClosed, { id: "p3-turn-on" })).rejects.toMatchObject({ code: "forbidden" })
    const out = await callApi(ctxFor(db, adminKey, "2027-05-07T20:00:00Z"), visitsMarkClosed, { id: "p3-turn-on" })
    expect(out).toMatchObject({ status: "completed", completedOn: "2027-05-07" })
    await expect(callApi(ctxFor(db, adminKey), visitsMarkClosed, { id: "p11-blowout" })).rejects.toMatchObject({ code: "unprocessable" })
  })
  it("queues no charge for a pass visit however many times it is closed: Done is not a charge", async () => {
    await callApi(ctxFor(db, adminKey), visitsMarkClosed, { id: "p3-turn-on" })
    await callApi(ctxFor(db, adminKey), visitsMarkClosed, { id: "p3-turn-on" })
    expect((await db.select().from(s.queueItem)).filter((q) => q.kind === "pass-charge" && q.key === "p3-turn-on")).toEqual([])
  })
  it("closes a visit the daily check marked not closed", async () => {
    await db.update(s.visit).set({ status: "not-closed", scheduledOn: "2027-05-05" }).where(eq(s.visit.id, "p9-turn-on"))
    expect(await callApi(ctxFor(db, adminKey, "2027-05-08T20:00:00Z"), visitsMarkClosed, { id: "p9-turn-on", completedOn: "2027-05-05" })).toMatchObject({ status: "completed", completedOn: "2027-05-05" })
  })
  it("stretches a scheduled visit in 15-minute steps", async () => {
    expect(await callApi(ctxFor(db, writeKey), visitsStretch, { id: "p4-turn-on", durationMinutes: 120 })).toMatchObject({ durationMinutes: 120 })
    expect(await eventsOf(db, { kind: "visit.edited", aboutId: "p4-turn-on" })).toMatchObject([{ about: "visit", visitId: "p4-turn-on", who: "api", detail: { name: "Spring turn-on", durationMinutes: { to: 120 } } }])
    await expect(callApi(ctxFor(db, writeKey), visitsStretch, { id: "p4-turn-on", durationMinutes: 100 })).rejects.toMatchObject({ code: "invalid" })
    expect(await eventsOf(db, { kind: "visit.edited", aboutId: "p4-turn-on" })).toHaveLength(1)
    await expect(callApi(ctxFor(db, writeKey), visitsStretch, { id: "p11-blowout", durationMinutes: 60 })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("visits.requestMove", () => {
  it("records a customer's request on their own visit only", async () => {
    await expect(callApi(ctxFor(db, customerPerson("c104")), visitsRequestMove, { id: "p6-blowout", preferredWeek: "2027-10-18", note: "away that week" })).resolves.toEqual({ ok: true })
    expect(await eventsOf(db, { kind: "visit.move-requested", aboutId: "p6-blowout" })).toMatchObject([{ about: "visit", customerId: "c104", visitId: "p6-blowout", who: "customer", detail: { preferredWeek: "2027-10-18", note: "away that week" } }])
    await expect(callApi(ctxFor(db, customerPerson("c104")), visitsRequestMove, { id: "p7-blowout" })).rejects.toMatchObject({ code: "forbidden" })
    expect(await eventsOf(db, { kind: "visit.move-requested", aboutId: "p7-blowout" })).toEqual([])
    await expect(callApi(ctxFor(db, readKey), visitsRequestMove, { id: "p6-blowout" })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("visits.list by person, after the moves", () => {
  it("filters by person, with `truckId` taking the legacy truck id for one season", async () => {
    const byPerson = (await callApi(ctxFor(db, readKey), visitsList, { personId: "person_truck-1" })).data.map((v) => v.id)
    expect(byPerson.length).toBeGreaterThan(0)
    expect((await callApi(ctxFor(db, readKey), visitsList, { truckId: "truck-1" })).data.map((v) => v.id)).toEqual(byPerson)
    expect((await callApi(ctxFor(db, readKey), visitsList, { truckId: "person_truck-1" })).data.map((v) => v.id)).toEqual(byPerson)
    await expect(callApi(ctxFor(db, readKey), visitsList, { truckId: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("visit events", () => {
  it("carries the visit's newest 50 events, newest first, and none from another visit", async () => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "p1-turn-on"))
    for (let i = 0; i < 55; i++) await recordEvent(db, { organizationId: ORG, about: "visit", aboutId: v!.id, customerId: v!.customerId, jobId: v!.jobId, visitId: v!.id, kind: "note", detail: { text: `visit note ${i}` }, who: "system", at: new Date(Date.UTC(2027, 5, 1, 12, i)) })
    await recordEvent(db, { organizationId: ORG, about: "visit", aboutId: "p1-blowout", customerId: v!.customerId, jobId: v!.jobId, visitId: "p1-blowout", kind: "note", detail: { text: "another visit" }, who: "system", at: new Date(Date.UTC(2027, 6, 1)) })
    const got = await callApi(ctxFor(db, readKey), visitsGet, { id: v!.id })
    expect(got.events).toHaveLength(50)
    expect(got.events![0]!.detail).toEqual({ text: "visit note 54" })
    expect(JSON.stringify(got.events)).not.toContain("another visit")
    const listed = (await callApi(ctxFor(db, readKey), visitsList, { passId: "p1" })).data.find((x) => x.id === v!.id)!
    expect(listed.events).toHaveLength(50)
  })
})
