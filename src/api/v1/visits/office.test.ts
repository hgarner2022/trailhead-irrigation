// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { alertsDismiss } from "../alerts/handlers"
import { customersGet } from "../customers/handlers"
import { messagesSend } from "../messages/handlers"
import { adminKey, apiDb, ctxFor, linesOfJob, ORG, readKey, writeKey } from "../../test-helpers"
import { SERVICES } from "@/lib/services"
import { visitsCancel, visitsCreate, visitsMarkNotDone, visitsUpdate } from "./office"
import { visitsMove } from "./handlers"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ phone: "+13035550111" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const as = (p = writeKey) => ctxFor(db, p)
const create = (input: Record<string, unknown>, p = writeKey) => callApi(as(p), visitsCreate, input)
const count = async (t: typeof s.job | typeof s.customer | typeof s.visit | typeof s.lineItem) => (await db.select().from(t)).length

describe("visits.create", () => {
  it("makes the job and the visit, places it with the first person on the schedule (Ryan, the owner) and texts the date", async () => {
    const out = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-05", price: 145, notes: "Zone 3 will not shut off" })
    expect(out).toMatchObject({ kind: "repair", status: "scheduled", scheduledOn: "2027-05-05", personId: "person_truck-1", personName: "Ryan Garner", truckId: "person_truck-1", truckName: "Ryan Garner", amount: 145, durationMinutes: 120, notes: "Zone 3 will not shut off", bookingId: null, passId: null })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, out.jobId))
    expect(job).toMatchObject({ kind: "repair", source: "office", status: "active", price: 145, customerId: "c100" })
    const texts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === out.id)
    expect(texts.map((m) => [m.kind, m.channel])).toEqual([["date-set", "sms"]])
    expect(await linesOfJob(db, out.jobId)).toMatchObject([{ visitId: out.id, name: "Repair", unitPrice: 145, quantity: 1, taxable: false, serviceKey: "repair", description: SERVICES.repair!.description, cancelledAt: null }])
  })
  it("a repair with no price given is priced from the service, $145, on the line and the legacy columns alike", async () => {
    const out = await create({ customerId: "c100", kind: "repair" })
    expect(out.amount).toBe(145)
    expect(await linesOfJob(db, out.jobId)).toMatchObject([{ visitId: out.id, unitPrice: 145, serviceKey: "repair" }])
    expect((await db.select().from(s.job).where(eq(s.job.id, out.jobId)))[0]!.price).toBe(145)
  })
  it("with no day waits as Needs a day, minutes from the kind, price left blank", async () => {
    const out = await create({ newCustomer: { firstName: "nora", lastName: "ortiz", email: "Nora@Example.com", phone: "303-555-0177", property: { address: "9 Oak St", town: "Erie" } }, kind: "install" })
    expect(out).toMatchObject({ status: "unscheduled", scheduledOn: null, personId: null, durationMinutes: 120, firstName: "Nora", amount: 0 })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, out.jobId))
    expect(job).toMatchObject({ kind: "install", price: null })
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
    const changes = await db.select().from(s.passChange).where(eq(s.passChange.visitId, v.id))
    expect(changes.find((c) => c.kind === "not-done")?.detail).toMatchObject({ reason: "no-water", day: "2027-05-06" })
    await expect(callApi(as(), visitsMarkNotDone, { id: v.id, reason: "no-water" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("visits.update", () => {
  it("changes minutes and notes, clears notes, and writes a change row", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-07" })
    const out = await callApi(as(), visitsUpdate, { id: v.id, durationMinutes: 180, notes: "Bring a valve" })
    expect(out).toMatchObject({ durationMinutes: 180, notes: "Bring a valve" })
    expect(await callApi(as(), visitsUpdate, { id: v.id, notes: "" })).toMatchObject({ notes: null })
    expect((await db.select().from(s.passChange).where(eq(s.passChange.visitId, v.id))).some((c) => c.kind === "visit-edited")).toBe(true)
    await expect(callApi(as(), visitsUpdate, { id: v.id, durationMinutes: 50 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("sets a pass's access note from its visit, and refuses one on a one-off visit", async () => {
    const one = await create({ customerId: "c100", kind: "repair" })
    await expect(callApi(as(), visitsUpdate, { id: one.id, accessNote: "Gate 1234" })).rejects.toMatchObject({ code: "unprocessable" })
    await callApi(as(), visitsUpdate, { id: "p3-turn-on", accessNote: "Gate 1234" })
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p3"))
    expect(pass!.accessNote).toBe("Gate 1234")
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
      expect((await db.select().from(s.passChange).where(eq(s.passChange.visitId, v.id))).some((c) => c.kind === "visit-edited")).toBe(false)
    } finally {
      await db.update(s.person).set({ active: true }).where(eq(s.person.id, "person_truck-1"))
    }
  })
})

describe("visits.update price", () => {
  it("changes the visit's line and its amount, not job.price, and records the change", async () => {
    const v = await create({ customerId: "c100", kind: "repair", price: 145 })
    const out = await callApi(as(), visitsUpdate, { id: v.id, price: 220 })
    expect(out.amount).toBe(220)
    expect(await linesOfJob(db, v.jobId)).toMatchObject([{ visitId: v.id, name: "Repair", unitPrice: 220 }])
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]!.price).toBe(145)
    expect((await db.select().from(s.passChange).where(eq(s.passChange.visitId, v.id))).find((c) => c.kind === "visit-edited")?.detail).toMatchObject({ price: { from: 145, to: 220 } })
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
    const [passRow] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p4"))
    const before = (await db.select().from(s.job).where(eq(s.job.id, passRow!.jobId)))[0]!.price!
    const out = await callApi(as(), visitsCancel, { id: "p4-blowout", reason: "Moving" })
    expect(out).toMatchObject({ status: "cancelled", scheduledOn: null, personId: null })
    const rest = await db.select().from(s.visit).where(eq(s.visit.passId, "p4"))
    expect(rest.filter((v) => v.status !== "cancelled").length).toBeGreaterThan(0)
    expect((await db.select().from(s.job).where(eq(s.job.id, passRow!.jobId)))[0]!.price!).toBeLessThan(before)
    expect((await db.select().from(s.queueItem).where(eq(s.queueItem.key, "p4-blowout")))[0]).toMatchObject({ status: "done", lastError: "visit cancelled" })
    expect((await linesOfJob(db, passRow!.jobId)).find((l) => l.visitId === "p4-blowout")!.cancelledAt).toBeInstanceOf(Date)
    await expect(callApi(as(), visitsCancel, { id: "p4-blowout" })).rejects.toMatchObject({ code: "unprocessable" })
  })
  it("cancels a one-off visit and its job", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-10" })
    await callApi(as(), visitsCancel, { id: v.id })
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]).toMatchObject({ status: "cancelled" })
    expect((await linesOfJob(db, v.jobId))[0]!.cancelledAt).toBeInstanceOf(Date)
    await expect(callApi(as(readKey), visitsCancel, { id: v.id })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("alerts.dismiss", () => {
  it("resolves a stored alert, records a worked-out row as dismissed, and is safe twice", async () => {
    await db.insert(s.adminAlert).values({ organizationId: ORG, kind: "new-pass", key: "a1", message: "New pass" })
    await callApi(as(), alertsDismiss, { kind: "new-pass", key: "a1" })
    await callApi(as(), alertsDismiss, { kind: "charge-failed", key: "p1@2027-05-01" })
    await callApi(as(), alertsDismiss, { kind: "charge-failed", key: "p1@2027-05-01" })
    const rows = await db.select().from(s.adminAlert)
    expect(rows.filter((r) => r.resolvedAt).map((r) => `${r.kind}:${r.key}`).sort()).toEqual(["charge-failed:p1@2027-05-01", "new-pass:a1"])
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
