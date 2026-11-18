// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq, isNotNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { Principal } from "@/lib/auth/types"
import { callApi } from "../../core/call"
import { alertsDismiss } from "../alerts/handlers"
import { customersGet } from "../customers/handlers"
import { messagesSend } from "../messages/handlers"
import { adminKey, apiDb, ctxFor, eventsOf, jobIdOfPassId, linesOfJob, ORG, owner, passViewOf, readKey, writeKey } from "../../test-helpers"
import { SERVICES } from "@/lib/services"
import { visitsCancel, visitsCreate, visitsMarkNotDone, visitsUpdate } from "./office"
import { visitsGet, visitsMove } from "./handlers"
import { jobTotal } from "@/lib/jobs/lines"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ phone: "+13035550111" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const OWNER_WHO = "owner@example.com"
const as = (p: Principal = writeKey, now?: string) => ctxFor(db, p, now)
const create = (input: Record<string, unknown>, p = writeKey) => callApi(as(p), visitsCreate, input)
const count = async (t: typeof s.job | typeof s.customer | typeof s.visit | typeof s.lineItem) => (await db.select().from(t)).length

describe("visits.create", () => {
  it("makes the job and the visit, places it with the first person on the schedule (Ryan, the owner) and texts the date", async () => {
    const out = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-05", price: 145, notes: "Zone 3 will not shut off" })
    expect(out).toMatchObject({ kind: "repair", status: "scheduled", scheduledOn: "2027-05-05", personId: "person_truck-1", personName: "Ryan Garner", truckId: "person_truck-1", truckName: "Ryan Garner", amount: 145, durationMinutes: 120, notes: "Zone 3 will not shut off", bookingId: null, passId: null })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, out.jobId))
    expect(job).toMatchObject({ source: "office", customerId: "c100", soldOn: "2027-04-20", cancelledAt: null })
    const texts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === out.id)
    expect(texts.map((m) => [m.kind, m.channel])).toEqual([["date-set", "sms"]])
    expect(await linesOfJob(db, out.jobId)).toMatchObject([{ visitId: out.id, name: "Repair", unitPrice: 145, quantity: 1, taxable: false, serviceKey: "repair", description: SERVICES.repair!.description, cancelledAt: null }])
  })
  it("refuses a second visit of a pass kind on a job that already has one, and takes the first", async () => {
    const first = await create({ customerId: "c100", kind: "turn-on" })
    await expect(create({ jobId: first.jobId, kind: "turn-on" })).rejects.toMatchObject({ code: "unprocessable", message: "This job already has a turn-on visit." })
    await expect(create({ jobId: first.jobId, kind: "blowout" })).resolves.toMatchObject({ kind: "blowout", jobId: first.jobId })
    await expect(create({ jobId: first.jobId, kind: "blowout" })).rejects.toMatchObject({ message: "This job already has a blowout visit." })
    // a repair visit may be added as often as the work needs; and a Season Pass takes none this way
    const repair = await create({ customerId: "c100", kind: "repair" })
    await expect(create({ jobId: repair.jobId, kind: "repair" })).resolves.toMatchObject({ jobId: repair.jobId })
    await expect(create({ jobId: await jobIdOfPassId(db, "p1"), kind: "inspection" })).rejects.toMatchObject({ code: "unprocessable" })
    expect(await db.select().from(s.visit).where(and(eq(s.visit.jobId, first.jobId), eq(s.visit.kind, "turn-on")))).toHaveLength(1)
  })
  it("a repair with no price given is priced from the service, $145, on its line (and so on the visit and the job)", async () => {
    const out = await create({ customerId: "c100", kind: "repair" })
    expect(out.amount).toBe(145)
    expect(await linesOfJob(db, out.jobId)).toMatchObject([{ visitId: out.id, unitPrice: 145, serviceKey: "repair" }])
    expect((await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === out.jobId)).toMatchObject({ price: 145, kind: "repair", status: "open" })
  })
  it("with no day waits as Needs a day, minutes from the kind, price left blank", async () => {
    const out = await create({ newCustomer: { firstName: "nora", lastName: "ortiz", email: "Nora@Example.com", phone: "303-555-0177", property: { address: "9 Oak St", town: "Erie" } }, kind: "install" })
    expect(out).toMatchObject({ status: "unscheduled", scheduledOn: null, personId: null, durationMinutes: 120, firstName: "Nora", amount: 0 })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, out.jobId))
    expect(job).toMatchObject({ source: "office", soldOn: expect.any(String) })
    expect((await callApi(as(readKey), customersGet, { id: out.customerId })).jobs.find((j) => j.id === out.jobId)).toMatchObject({ kind: "install", price: null, status: "needs-a-quote" })
    expect(await linesOfJob(db, out.jobId)).toMatchObject([{ visitId: out.id, name: "Installation", unitPrice: 0, serviceKey: "install", description: SERVICES.install!.description }])
  })
  it("a refused day leaves nothing behind, not even a new customer", async () => {
    const [jobs, customers, visits, lines] = [await count(s.job), await count(s.customer), await count(s.visit), await count(s.lineItem)]
    await expect(create({ newCustomer: { firstName: "Gone", lastName: "Tester", property: { address: "1 Main St", town: "Erie" } }, kind: "repair", scheduledOn: "2027-05-02" })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringMatching(/does not work on sundays/) })
    expect([await count(s.job), await count(s.customer), await count(s.visit), await count(s.lineItem)]).toEqual([jobs, customers, visits, lines])
  })
  it("refuses a read key, both or neither customer, and a time with no day", async () => {
    await expect(create({ customerId: "c100", kind: "repair" }, readKey)).rejects.toMatchObject({ code: "forbidden" })
    await expect(create({ kind: "repair" })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ customerId: "c100", kind: "repair", startTime: "09:00" })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ customerId: "nope", kind: "repair" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("with a serviceKey, takes the service's kind, minutes, price rule and description; kind is not needed", async () => {
    const out = await create({ customerId: "c100", serviceKey: "blowout" })
    expect(out).toMatchObject({ kind: "blowout", amount: SERVICES.blowout!.price, durationMinutes: SERVICES.blowout!.slotMinutes })
    expect(await linesOfJob(db, out.jobId)).toMatchObject([{ visitId: out.id, name: "Fall blowout", unitPrice: SERVICES.blowout!.price, serviceKey: "blowout", description: SERVICES.blowout!.description }])
    const own = await create({ customerId: "c100", serviceKey: "blowout", price: 120 })
    expect(own.amount).toBe(120)
  })
  it("refuses an unknown service and a call with neither a service nor a kind", async () => {
    await expect(create({ customerId: "c100", serviceKey: "nope-nope" })).rejects.toThrow(/not offered/)
    await expect(create({ customerId: "c100" })).rejects.toThrow(/what the job is for/)
  })
  it("takes a one-off repair line's name from the one convention, Repair, and a one-off turn-on's as Spring turn-on", async () => {
    const repair = await create({ customerId: "c100", serviceKey: "repair" })
    expect(await linesOfJob(db, repair.jobId)).toMatchObject([{ name: "Repair", serviceKey: "repair" }])
    const turnOn = await create({ customerId: "c100", serviceKey: "turn-on-8" })
    expect(await linesOfJob(db, turnOn.jobId)).toMatchObject([{ name: "Spring turn-on", serviceKey: "turn-on-8", description: SERVICES["turn-on-8"]!.description }])
  })
  it("refuses an inactive service for an existing customer, and for a new one makes no customer", async () => {
    await db.update(s.service).set({ active: false }).where(eq(s.service.key, "aeration"))
    const [jobs, customers, properties, visits] = [await count(s.job), await count(s.customer), (await db.select().from(s.property)).length, await count(s.visit)]
    await expect(create({ customerId: "c100", serviceKey: "aeration" })).rejects.toMatchObject({ code: "invalid", message: expect.stringMatching(/not offered/) })
    await expect(create({ newCustomer: { firstName: "Orphan", lastName: "Test", property: { address: "3 Elm St", town: "Erie" } }, serviceKey: "aeration" })).rejects.toMatchObject({ code: "invalid" })
    expect([await count(s.job), await count(s.customer), (await db.select().from(s.property)).length, await count(s.visit)]).toEqual([jobs, customers, properties, visits])
    await db.update(s.service).set({ active: true }).where(eq(s.service.key, "aeration"))
  })
  it("refuses a kind that disagrees with the service, and takes one that agrees", async () => {
    await expect(create({ customerId: "c100", serviceKey: "repair", kind: "install" })).rejects.toMatchObject({ code: "invalid", message: "kind does not match the service" })
    expect((await create({ customerId: "c100", serviceKey: "repair", kind: "repair" })).kind).toBe("repair")
  })
  it("lists the job with its visits on customers.get", async () => {
    const got = await callApi(as(), customersGet, { id: "c100" })
    expect(got.jobs.some((j) => j.kind === "repair" && j.source === "office" && j.visits.length === 1)).toBe(true)
  })
})

describe("visits.create with a jobId", () => {
  it("adds a visit and its line to the open job, with the job's customer and property, and makes no new job", async () => {
    const first = await create({ customerId: "c100", kind: "install" })
    const jobs = await count(s.job)
    const second = await create({ jobId: first.jobId, kind: "repair", price: 145 })
    expect(second).toMatchObject({ jobId: first.jobId, kind: "repair", status: "unscheduled", amount: 145 })
    expect(await count(s.job)).toBe(jobs)
    expect(await linesOfJob(db, first.jobId)).toMatchObject([{ visitId: first.id, name: "Installation" }, { visitId: second.id, name: "Repair", unitPrice: 145 }])
    const [a, b] = await Promise.all([db.select().from(s.visit).where(eq(s.visit.id, first.id)), db.select().from(s.visit).where(eq(s.visit.id, second.id))])
    expect([b[0]!.customerId, b[0]!.propertyId]).toEqual([a[0]!.customerId, a[0]!.propertyId])
  })
  it("refuses a customer beside the job, an unknown job, a cancelled job and a Season Pass, and a refused day takes only the visit back", async () => {
    const first = await create({ customerId: "c100", kind: "repair", price: 145 })
    await expect(create({ jobId: first.jobId, customerId: "c100", kind: "repair" })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ jobId: "nope", kind: "repair" })).rejects.toMatchObject({ code: "not_found" })
    const visits = await count(s.visit)
    const lines = await count(s.lineItem)
    await expect(create({ jobId: first.jobId, kind: "repair", scheduledOn: "2027-05-08" })).rejects.toMatchObject({ code: expect.any(String) })
    expect(await count(s.visit)).toBe(visits)
    expect(await count(s.lineItem)).toBe(lines)
    expect((await db.select().from(s.job).where(eq(s.job.id, first.jobId))).length).toBe(1)
    await callApi(as(), visitsCancel, { id: first.id })
    await expect(create({ jobId: first.jobId, kind: "repair" })).rejects.toMatchObject({ code: "unprocessable" })
    const [pass] = await db.select().from(s.job).where(isNotNull(s.job.season))
    if (pass) await expect(create({ jobId: pass.id, kind: "repair" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("visits.create's default assignee", () => {
  it("is the owner before anyone whose name sorts first", async () => {
    const [aaron] = await db.insert(s.person).values({ organizationId: ORG, name: "Aaron Lee", initials: "AL", role: "tech", truck: "Truck 3" }).returning({ id: s.person.id })
    const out = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-10" })
    expect(out).toMatchObject({ personId: "person_truck-1", personName: "Ryan Garner" })
    await db.update(s.person).set({ active: false }).where(eq(s.person.id, aaron!.id))
  })
  it("with no one on the schedule refuses the day and leaves nothing behind", async () => {
    const [jobs, visits] = [await count(s.job), await count(s.visit)]
    const people = await db.select({ id: s.person.id, truck: s.person.truck }).from(s.person).where(eq(s.person.organizationId, ORG))
    await db.update(s.person).set({ truck: null }).where(eq(s.person.organizationId, ORG))
    await expect(create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-11" })).rejects.toMatchObject({ code: "unprocessable", message: "No one is on the schedule to take this visit" })
    expect([await count(s.job), await count(s.visit)]).toEqual([jobs, visits])
    for (const p of people) await db.update(s.person).set({ truck: p.truck }).where(eq(s.person.id, p.id))
  })
})

describe("visits.markNotDone", () => {
  it("sends a scheduled visit back to Needs a day and keeps the reason", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-06" })
    await expect(callApi(as(), visitsMarkNotDone, { id: v.id, reason: "other" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(readKey), visitsMarkNotDone, { id: v.id, reason: "no-water" })).rejects.toMatchObject({ code: "forbidden" })
    const out = await callApi(as(), visitsMarkNotDone, { id: v.id, reason: "no-water" })
    expect(out).toMatchObject({ status: "unscheduled", scheduledOn: null, personId: null })
    expect((await eventsOf(db, { visitId: v.id, kind: "visit.not-done" }))[0]?.detail).toMatchObject({ reason: "no-water", day: "2027-05-06" })
    await expect(callApi(as(), visitsMarkNotDone, { id: v.id, reason: "no-water" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("visits.update", () => {
  it("changes minutes and notes, never clears a note, and writes a change event", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-07" })
    const out = await callApi(as(), visitsUpdate, { id: v.id, durationMinutes: 180, notes: "Bring a valve" })
    expect(out).toMatchObject({ durationMinutes: 180, notes: "Bring a valve" })
    // the same text again, or an empty one, is no new note: the newest stays what it was
    expect(await callApi(as(), visitsUpdate, { id: v.id, notes: "" })).toMatchObject({ notes: "Bring a valve" })
    expect((await eventsOf(db, { visitId: v.id, kind: "visit.edited" })).length).toBeGreaterThan(0)
    await expect(callApi(as(), visitsUpdate, { id: v.id, durationMinutes: 50 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("sets a pass's access note from its visit, and a one-off visit's on its property", async () => {
    const one = await create({ customerId: "c100", kind: "repair" })
    const out = await callApi(as(), visitsUpdate, { id: one.id, accessNote: "Gate 1234" })
    expect(out.property.accessNote).toBe("Gate 1234")
    await callApi(as(), visitsUpdate, { id: "p3-turn-on", accessNote: "Gate 1234" })
    expect((await passViewOf(db, "p3")).accessNote).toBe("Gate 1234")
  })
  it("writes a pass visit's access note on the property of the visit, the pass keeping the same words", async () => {
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p3-turn-on"))
    await callApi(as(), visitsUpdate, { id: "p3-turn-on", accessNote: "Side gate, code 7788" })
    const [prop] = await db.select().from(s.property).where(eq(s.property.id, visit!.propertyId))
    expect(prop!.accessNote).toBe("Side gate, code 7788")
    await callApi(as(), visitsUpdate, { id: "p3-turn-on", accessNote: "" })
    expect((await db.select().from(s.property).where(eq(s.property.id, visit!.propertyId)))[0]!.accessNote).toBeNull()
  })
  it("writes a new customer's access note on their new property", async () => {
    const out = await create({ newCustomer: { firstName: "gil", lastName: "park", email: "gil@example.com", phone: "303-555-0188", property: { address: "3 Birch St", town: "Erie" }, accessNote: "  Dog loose  " }, kind: "repair" })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, out.id))
    const [prop] = await db.select().from(s.property).where(eq(s.property.id, visit!.propertyId))
    expect(prop).toMatchObject({ address: "3 Birch St", accessNote: "Dog loose" })
  })
  it("refuses a person who does not work the day, and a person for a visit with no day", async () => {
    const none = await create({ customerId: "c100", kind: "repair" })
    await expect(callApi(as(), visitsUpdate, { id: none.id, personId: "person_truck-2" })).rejects.toMatchObject({ code: "unprocessable" })
    const dated = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-11" })
    await expect(callApi(as(), visitsUpdate, { id: dated.id, personId: "nope" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(as(readKey), visitsUpdate, { id: none.id, notes: "x" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("naming the person the visit already has is a no-op, by either id, even once that person is out of service", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-12" })
    expect(v.personId).toBe("person_truck-1")
    await db.update(s.person).set({ active: false }).where(eq(s.person.id, "person_truck-1"))
    try {
      expect(await callApi(as(), visitsUpdate, { id: v.id, personId: "person_truck-1" })).toMatchObject({ personId: "person_truck-1", scheduledOn: "2027-05-12", startTime: v.startTime, stopOrder: v.stopOrder })
      expect(await callApi(as(), visitsUpdate, { id: v.id, truckId: "truck-1" })).toMatchObject({ personId: "person_truck-1", scheduledOn: "2027-05-12", startTime: v.startTime, stopOrder: v.stopOrder })
      expect((await eventsOf(db, { visitId: v.id, kind: "visit.edited" })).length).toBe(0)
    } finally {
      await db.update(s.person).set({ active: true }).where(eq(s.person.id, "person_truck-1"))
    }
  })
})

describe("visits.update price", () => {
  it("changes the visit's line, and so its price and the job's, and records the change", async () => {
    const v = await create({ customerId: "c100", kind: "repair", price: 145 })
    const out = await callApi(as(), visitsUpdate, { id: v.id, price: 220 })
    expect(out.amount).toBe(220)
    expect(await linesOfJob(db, v.jobId)).toMatchObject([{ visitId: v.id, name: "Repair", unitPrice: 220 }])
    expect((await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!.price).toBe(220)
    expect((await eventsOf(db, { visitId: v.id, kind: "visit.edited" }))[0]?.detail).toMatchObject({ price: { from: 145, to: 220 } })
    await expect(callApi(as(), visitsUpdate, { id: v.id, price: -1 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("makes the line when the visit has none yet", async () => {
    const v = await create({ customerId: "c100", kind: "repair", price: 145 })
    await db.delete(s.lineItem).where(eq(s.lineItem.visitId, v.id))
    await callApi(as(), visitsUpdate, { id: v.id, price: 300 })
    expect(await linesOfJob(db, v.jobId)).toMatchObject([{ visitId: v.id, name: "Repair", unitPrice: 300, serviceKey: "repair" }])
  })
})

describe("visits.update unscheduled", () => {
  it("takes a placed visit back to Needs a day, and refuses one with no day", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-12" })
    const out = await callApi(as(), visitsUpdate, { id: v.id, unscheduled: true })
    expect(out).toMatchObject({ status: "unscheduled", scheduledOn: null, personId: null })
    await expect(callApi(as(), visitsUpdate, { id: v.id, unscheduled: true })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("visits.cancel", () => {
  it("cancels one pass visit, keeps the others, drops its price and does not make a pending charge", async () => {
    await callApi(as(), visitsMove, { id: "p4-blowout", personId: "person_truck-1", scheduledOn: "2027-10-12" })
    await db.insert(s.queueItem).values({ organizationId: ORG, kind: "pass-charge", key: "p4-blowout", payload: { visitId: "p4-blowout" } })
    const passRow = { jobId: await jobIdOfPassId(db, "p4") }
    const before = jobTotal(await linesOfJob(db, passRow.jobId))
    const out = await callApi(as(), visitsCancel, { id: "p4-blowout", reason: "Moving" })
    expect(out).toMatchObject({ status: "cancelled", scheduledOn: null, personId: null })
    const rest = await db.select().from(s.visit).where(eq(s.visit.jobId, passRow.jobId))
    expect(rest.filter((v) => v.status !== "cancelled").length).toBeGreaterThan(0)
    expect(jobTotal(await linesOfJob(db, passRow.jobId))).toBeLessThan(before)
    expect((await db.select().from(s.queueItem).where(eq(s.queueItem.key, "p4-blowout")))[0]).toMatchObject({ status: "done", lastError: "visit cancelled" })
    expect((await linesOfJob(db, passRow.jobId)).find((l) => l.visitId === "p4-blowout")!.cancelledAt).toBeInstanceOf(Date)
    await expect(callApi(as(), visitsCancel, { id: "p4-blowout" })).rejects.toMatchObject({ code: "unprocessable" })
  })
  it("cancels a one-off visit and its job", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-10" })
    await callApi(as(), visitsCancel, { id: v.id })
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]).toMatchObject({ cancelledAt: expect.any(Date) })
    expect((await linesOfJob(db, v.jobId))[0]!.cancelledAt).toBeInstanceOf(Date)
    // The emptied job is cancelled by a `job.cancelled` event of its own, beside the visit's.
    expect(await eventsOf(db, { kind: "job.cancelled", jobId: v.jobId })).toMatchObject([{ about: "job", aboutId: v.jobId, customerId: "c100", visitId: null }])
    await expect(callApi(as(readKey), visitsCancel, { id: v.id })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("alerts.dismiss", () => {
  it("resolves a stored alert, records a worked-out row as dismissed, and is safe twice", async () => {
    await db.insert(s.adminAlert).values({ organizationId: ORG, kind: "new-pass", key: "a1", message: "New pass" })
    await callApi(as(), alertsDismiss, { kind: "new-pass", key: "a1" })
    // a worked-out row is keyed by the pass's job id; a caller still holding the old pass id names the same row
    const jobId = await jobIdOfPassId(db, "p1")
    await callApi(as(), alertsDismiss, { kind: "charge-failed", key: "p1@2027-05-01" })
    await callApi(as(), alertsDismiss, { kind: "charge-failed", key: `${jobId}@2027-05-01` })
    const rows = await db.select().from(s.adminAlert)
    expect(rows.filter((r) => r.resolvedAt).map((r) => `${r.kind}:${r.key}`).sort()).toEqual([`charge-failed:${jobId}@2027-05-01`, "new-pass:a1"])
    await callApi(as(), alertsDismiss, { kind: "new-pass", key: "a1", undo: true })
    await callApi(as(), alertsDismiss, { kind: "charge-failed", key: "p1@2027-05-01", undo: true })
    const back = await db.select().from(s.adminAlert)
    expect(back.filter((r) => r.kind === "charge-failed")).toEqual([])
    expect(back.find((r) => r.key === "a1")?.resolvedAt).toBeNull()
    await expect(callApi(as(readKey), alertsDismiss, { kind: "x", key: "y" })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("messages.send kind note", () => {
  it("queues a text with the opt-out line, and refuses with the reason in words", async () => {
    const out = await callApi(as(), messagesSend, { customerId: "c100", kind: "note", text: "Running 20 minutes late." })
    expect(out).toMatchObject({ channel: "sms", kind: "note", status: "queued" })
    expect(out.body).toBe("Trailhead: Running 20 minutes late. Reply STOP to opt out.")
    await expect(callApi(as(), messagesSend, { customerId: "c100", kind: "note" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(), messagesSend, { customerId: "c100", kind: "note", text: "x".repeat(321) })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(readKey), messagesSend, { customerId: "c100", kind: "note", text: "Hi" })).rejects.toMatchObject({ code: "forbidden" })
    await db.insert(s.customer).values({ id: "c-nophone", organizationId: ORG, firstName: "Quiet" })
    await expect(callApi(as(), messagesSend, { customerId: "c-nophone", kind: "note", text: "Hi" })).rejects.toThrow(/no mobile number/)
    await db.insert(s.consent).values({ organizationId: ORG, customerId: "c100", source: "reply", note: "STOP" })
    await expect(callApi(as(), messagesSend, { customerId: "c100", kind: "note", text: "Hi" })).rejects.toThrow(/replied STOP/)
  })
})

describe("the events office actions write", () => {
  it("visits.create writes job.sold about its job (the one-off, source office) and one note when notes are given", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-13", price: 145, notes: "Zone 3 sticks" })
    const [sold] = await eventsOf(db, { kind: "job.sold", jobId: v.jobId })
    expect(sold).toMatchObject({ about: "job", aboutId: v.jobId, customerId: "c100", visitId: v.id, who: "api", detail: { source: "office", name: "Repair", kind: "repair", day: "2027-05-13" } })
    expect(await eventsOf(db, { kind: "note", jobId: v.jobId })).toMatchObject([{ about: "job", aboutId: v.jobId, customerId: "c100", visitId: v.id, detail: { text: "Zone 3 sticks" } }])
    const quiet = await create({ customerId: "c100", kind: "repair" })
    expect(await eventsOf(db, { kind: "note", jobId: quiet.jobId })).toEqual([])
  })
  it("a refused visits.create writes nothing", async () => {
    const before = (await db.select().from(s.event)).length
    await expect(create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-14", notes: "x", personId: "nope" })).rejects.toBeTruthy()
    expect((await db.select().from(s.event)).length).toBe(before)
  })
  it("visits.update with notes writes a note event only, VisitOut.notes reads the newest, and no notes key on visit.edited", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-14" })
    await callApi(as(owner), visitsUpdate, { id: v.id, notes: "Bring a valve", durationMinutes: 150 })
    const [note] = await eventsOf(db, { kind: "note", visitId: v.id })
    expect(note).toMatchObject({ about: "visit", aboutId: v.id, customerId: "c100", jobId: v.jobId, who: OWNER_WHO, detail: { text: "Bring a valve" } })
    expect((await callApi(as(owner), visitsGet, { id: v.id })).notes).toBe("Bring a valve")
    const [edited] = await eventsOf(db, { kind: "visit.edited", visitId: v.id })
    expect(edited).toMatchObject({ about: "visit", who: OWNER_WHO, detail: { name: "Repair", durationMinutes: { from: 120, to: 150 } } })
    expect(edited!.detail).not.toHaveProperty("notes")
    // A notes-only edit is only a note; the same text again, or an empty one, writes none.
    await callApi(as(owner, "2027-04-20T15:05:00Z"), visitsUpdate, { id: v.id, notes: "Second thought" })
    expect(await eventsOf(db, { kind: "note", visitId: v.id })).toHaveLength(2)
    expect((await callApi(as(owner), visitsGet, { id: v.id })).notes).toBe("Second thought")
    expect(await eventsOf(db, { kind: "visit.edited", visitId: v.id })).toHaveLength(1)
    await callApi(as(owner, "2027-04-20T15:05:00Z"), visitsUpdate, { id: v.id, notes: "Second thought" })
    await callApi(as(owner), visitsUpdate, { id: v.id, notes: "" })
    expect(await eventsOf(db, { kind: "note", visitId: v.id })).toHaveLength(2)
    await expect(callApi(as(readKey), visitsUpdate, { id: v.id, notes: "no" })).rejects.toMatchObject({ code: "forbidden" })
    expect(await eventsOf(db, { kind: "note", visitId: v.id })).toHaveLength(2)
  })
  it("visits.update writes visit.edited with the price change and the line name", async () => {
    const v = await create({ customerId: "c100", kind: "repair", price: 145 })
    await callApi(as(owner), visitsUpdate, { id: v.id, price: 220 })
    expect(await eventsOf(db, { kind: "visit.edited", visitId: v.id })).toMatchObject([{ about: "visit", detail: { name: "Repair", price: { from: 145, to: 220 } } }])
  })
  it("visits.markNotDone writes visit.not-done with the reason, the day and the person, and a refused call writes none", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-17" })
    await expect(callApi(as(), visitsMarkNotDone, { id: v.id, reason: "other" })).rejects.toMatchObject({ code: "invalid" })
    expect(await eventsOf(db, { kind: "visit.not-done", visitId: v.id })).toEqual([])
    await callApi(as(owner), visitsMarkNotDone, { id: v.id, reason: "no-water", note: "Main off" })
    expect(await eventsOf(db, { kind: "visit.not-done", visitId: v.id })).toMatchObject([{ about: "visit", aboutId: v.id, customerId: "c100", jobId: v.jobId, who: OWNER_WHO, detail: { name: "Repair", reason: "no-water", note: "Main off", day: "2027-05-17", personId: "person_truck-1" } }])
  })
  it("visits.cancel writes visit.cancelled with the reason, the day and the amount", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-18", price: 145 })
    await callApi(as(owner), visitsCancel, { id: v.id, reason: "Fixed it themselves" })
    expect(await eventsOf(db, { kind: "visit.cancelled", visitId: v.id })).toMatchObject([{ about: "visit", aboutId: v.id, customerId: "c100", jobId: v.jobId, who: OWNER_WHO, detail: { name: "Repair", reason: "Fixed it themselves", day: "2027-05-18", amount: 145 } }])
    await expect(callApi(as(owner), visitsCancel, { id: v.id })).rejects.toMatchObject({ code: "unprocessable" })
    expect(await eventsOf(db, { kind: "visit.cancelled", visitId: v.id })).toHaveLength(1)
  })
})
