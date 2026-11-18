// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { recordEvent } from "@/lib/events/record"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, eventsOf, ORG, owner, readKey, tech, writeKey } from "../../test-helpers"
import { passesGet } from "../passes/handlers"
import { visitsGet } from "../visits/handlers"
import { eventsList, eventsNote } from "./handlers"

let db: TestDb
let customerId: string
let propertyId: string
let jobId: string
const visitId = "p1-turn-on"
const OTHER = "org-events"
const otherAdmin = { ...adminKey, organizationId: OTHER }
const at = (n: number) => new Date(Date.UTC(2027, 3, 10, 12, n))

beforeAll(async () => {
  db = await apiDb()
  const [v] = await db.select().from(s.visit).where(eq(s.visit.id, visitId))
  customerId = v!.customerId
  jobId = v!.jobId
  propertyId = v!.propertyId
  await db.insert(s.organization).values({ id: OTHER, name: "Other", termsVersion: "1", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
  const base = { organizationId: ORG, customerId, who: owner.email }
  // oldest first: the sale, a note, the visit done and paid, the payment, a card, the invoice, a consent, and one from the system
  await recordEvent(db, { ...base, about: "job", aboutId: jobId, jobId, kind: "job.sold", detail: { source: "website", name: "Season Pass", passNumber: "TH-2027-0001", amount: 395 }, who: "customer", at: at(0) })
  await recordEvent(db, { ...base, about: "customer", aboutId: customerId, kind: "note", detail: { text: "Prefers mornings" }, at: at(1) })
  await recordEvent(db, { ...base, about: "visit", aboutId: visitId, jobId, visitId, kind: "visit.done", detail: { name: "Spring turn-on", completedOn: "2027-04-10", paidBy: "venmo", price: { from: 1, to: 2 } }, at: at(2) })
  await recordEvent(db, { ...base, about: "payment", aboutId: "pay-1", jobId, visitId, kind: "payment.succeeded", detail: { amount: 145, method: "venmo", name: "Spring turn-on", reference: "vm-9" }, at: at(3) })
  await recordEvent(db, { ...base, about: "customer", aboutId: customerId, kind: "card.saved", detail: { brand: "visa", last4: "4242" }, at: at(4) })
  await recordEvent(db, { ...base, about: "invoice", aboutId: "inv-1", jobId, kind: "invoice.sent", detail: { number: "INV-2027-0001", total: 145, dueOn: "2027-05-01" }, at: at(5) })
  await recordEvent(db, { ...base, about: "job", aboutId: jobId, jobId, kind: "consent", detail: { marketingOptIn: true, marketingChannels: ["sms"], source: "checkout" }, at: at(6) })
  await recordEvent(db, { ...base, about: "visit", aboutId: visitId, jobId, visitId, kind: "visit.moved", detail: { name: "Spring turn-on", day: "2027-04-22", from: "2027-04-20", personId: "x", accessNote: "dog" }, who: "system", at: at(7) })
  // another organization's rows, about the very same ids
  await recordEvent(db, { organizationId: OTHER, about: "customer", aboutId: customerId, customerId, jobId, visitId, kind: "note", detail: { text: "secret of another organization" }, who: "x@other.test", at: at(8) })
})
afterAll(() => db.close())

const list = (input: Record<string, unknown>, principal: Parameters<typeof ctxFor>[1] = readKey) => callApi(ctxFor(db, principal), eventsList, input)
const note = (input: Record<string, unknown>, principal: Parameters<typeof ctxFor>[1] = adminKey) => callApi(ctxFor(db, principal), eventsNote, input)

describe("events.list", () => {
  it("lists a customer's story newest first with the name of who did it, and never another organization's rows", async () => {
    const out = await list({ customerId }, writeKey)
    expect(out.data.map((e) => e.kind)).toEqual(["visit.moved", "consent", "invoice.sent", "card.saved", "payment.succeeded", "visit.done", "note", "job.sold"])
    expect(out.next_cursor).toBeNull()
    expect(out.data[0]).toMatchObject({ about: "visit", aboutId: visitId, customerId, jobId, visitId, who: "system", whoName: null, at: at(7).toISOString() })
    expect(out.data[1]).toMatchObject({ who: owner.email, whoName: "Owner" })
    expect(JSON.stringify(out)).not.toContain("another organization")
  })
  it("lists by job, by visit and by the record it is about", async () => {
    expect((await list({ jobId }, writeKey)).data.map((e) => e.kind)).toEqual(["visit.moved", "consent", "invoice.sent", "payment.succeeded", "visit.done", "job.sold"])
    expect((await list({ visitId }, writeKey)).data.map((e) => e.kind)).toEqual(["visit.moved", "payment.succeeded", "visit.done"])
    expect((await list({ about: "invoice", aboutId: "inv-1" }, writeKey)).data.map((e) => e.kind)).toEqual(["invoice.sent"])
    expect((await list({ about: "customer", aboutId: customerId }, writeKey)).data.map((e) => e.kind)).toEqual(["card.saved", "note"])
  })
  it("needs a customer, a job, a visit, or about with aboutId", async () => {
    await expect(list({})).rejects.toMatchObject({ code: "invalid" })
    await expect(list({ about: "visit" })).rejects.toMatchObject({ code: "invalid" })
    await expect(list({ aboutId: visitId })).rejects.toMatchObject({ code: "invalid" })
    await expect(list({ about: "nothing", aboutId: "x" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("pages with a cursor and rejects a bad limit", async () => {
    const seen: string[] = []
    let cursor: string | undefined
    for (let guard = 0; guard < 10; guard++) {
      const out = await list({ customerId, limit: 3, ...(cursor ? { cursor } : {}) }, writeKey)
      expect(out.data.length).toBeLessThanOrEqual(3)
      seen.push(...out.data.map((e) => e.kind))
      cursor = out.next_cursor ?? undefined
      if (!cursor) break
    }
    expect(seen).toEqual(["visit.moved", "consent", "invoice.sent", "card.saved", "payment.succeeded", "visit.done", "note", "job.sold"])
    await expect(list({ customerId, limit: 500 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("shows an organization only its own rows", async () => {
    const out = await callApi(ctxFor(db, otherAdmin), eventsList, { customerId })
    expect(out.data.map((e) => e.detail)).toEqual([{ text: "secret of another organization" }])
    expect((await callApi(ctxFor(db, otherAdmin), eventsList, { visitId })).data).toHaveLength(1)
  })
  it("gives a tech or a read key only notes, the sale, the pass and the visit, with money, gate and contact fields stripped", async () => {
    for (const principal of [tech, readKey]) {
      const out = await list({ customerId }, principal)
      expect(out.data.map((e) => e.kind)).toEqual(["visit.moved", "visit.done", "note", "job.sold"])
      const text = JSON.stringify(out)
      for (const hidden of ["395", "vm-9", "4242", "INV-2027", "dog", "payment.succeeded", "card.saved", "consent"]) expect(text, hidden).not.toContain(hidden)
      expect(out.data.find((e) => e.kind === "visit.done")!.detail).toEqual({ name: "Spring turn-on", completedOn: "2027-04-10", paidBy: "venmo" })
      expect(out.data.find((e) => e.kind === "job.sold")!.detail).toEqual({ source: "website", name: "Season Pass", passNumber: "TH-2027-0001" })
    }
  })
  it("fills a tech's page with kinds they may read, not with ones that are then dropped", async () => {
    const first = await list({ customerId, limit: 2 }, tech)
    expect(first.data.map((e) => e.kind)).toEqual(["visit.moved", "visit.done"])
    expect(first.next_cursor).not.toBeNull()
    expect((await list({ customerId, limit: 2, cursor: first.next_cursor! }, tech)).data.map((e) => e.kind)).toEqual(["note", "job.sold"])
  })
  it("is not a customer's call", async () => {
    await expect(callApi(ctxFor(db, customerPerson(customerId)), eventsList, { customerId })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("events.note", () => {
  const storedNote = async (about: string, aboutId: string) => (await eventsOf(db, { kind: "note", about, aboutId })).at(-1)!

  it("adds a note about a customer: the event only, and no alias column", async () => {
    const out = await note({ about: "customer", aboutId: customerId, text: "  Call before coming  " })
    expect(out).toMatchObject({ about: "customer", aboutId: customerId, customerId, jobId: null, visitId: null, kind: "note", detail: { text: "Call before coming" }, who: "api", whoName: null, at: "2027-04-20T15:00:00.000Z" })
    expect(await storedNote("customer", customerId)).toMatchObject({ id: out.id, customerId, who: "api", detail: { text: "Call before coming" } })
  })
  it("adds a note about a visit: the event with its job and customer, and the visit's notes alias", async () => {
    const out = await note({ about: "visit", aboutId: visitId, text: "Gate sticks" }, owner)
    expect(out).toMatchObject({ about: "visit", aboutId: visitId, customerId, jobId, visitId, who: owner.email, whoName: "Owner", detail: { text: "Gate sticks" } })
    expect(await storedNote("visit", visitId)).toMatchObject({ id: out.id, jobId, visitId })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, visitId))
    expect(visit!.notes).toBe("Gate sticks")
  })
  it("adds a note about a job: the event with its customer, and the job's notes alias", async () => {
    const out = await note({ about: "job", aboutId: jobId, text: "Paid at the door" })
    expect(out).toMatchObject({ about: "job", aboutId: jobId, customerId, jobId, visitId: null })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, jobId))
    expect(job!.notes).toBe("Paid at the door")
  })
  it("adds a note about a property without touching the property's standing notes", async () => {
    await db.update(s.property).set({ notes: "Sprinkler heads along the fence" }).where(eq(s.property.id, propertyId))
    const out = await note({ about: "property", aboutId: propertyId, text: "New fence going in" })
    expect(out).toMatchObject({ about: "property", aboutId: propertyId, customerId, jobId: null, visitId: null, detail: { text: "New fence going in" } })
    const [property] = await db.select().from(s.property).where(eq(s.property.id, propertyId))
    expect(property!.notes).toBe("Sprinkler heads along the fence")
  })
  it("shows the note at the top of the story, in full", async () => {
    const text = "Line one\nLine two"
    await callApi(ctxFor(db, adminKey, "2027-04-21T09:00:00Z"), eventsNote, { about: "customer", aboutId: customerId, text })
    expect((await list({ customerId }, writeKey)).data[0]).toMatchObject({ kind: "note", detail: { text } })
  })

  it("lets a tech add a note, and a tech reads it back", async () => {
    const out = await note({ about: "visit", aboutId: visitId, text: "Left a door hanger" }, tech)
    expect(out).toMatchObject({ kind: "note", who: tech.email, detail: { text: "Left a door hanger" } })
    expect((await list({ visitId }, tech)).data.map((e) => e.detail.text).filter(Boolean)).toContain("Left a door hanger")
  })
  it("refuses a read-only key, a customer and a call with no text, too much text or no record", async () => {
    await expect(note({ about: "visit", aboutId: visitId, text: "x" }, readKey)).rejects.toMatchObject({ code: "forbidden", message: "A read key cannot add notes" })
    await expect(note({ about: "visit", aboutId: visitId, text: "x" }, customerPerson(customerId))).rejects.toMatchObject({ code: "forbidden" })
    await expect(note({ about: "visit", aboutId: visitId, text: "   " })).rejects.toMatchObject({ code: "invalid" })
    await expect(note({ about: "visit", aboutId: visitId, text: "" })).rejects.toMatchObject({ code: "invalid" })
    await expect(note({ about: "visit", aboutId: visitId, text: "a".repeat(2001) })).rejects.toMatchObject({ code: "invalid" })
    await expect(note({ about: "payment", aboutId: "pay-1", text: "x" })).rejects.toMatchObject({ code: "invalid" })
    expect((await note({ about: "customer", aboutId: customerId, text: "a".repeat(2000) })).detail.text).toHaveLength(2000)
  })
  it("refuses a record of another organization and writes nothing", async () => {
    const before = (await db.select().from(s.event)).length
    for (const about of ["customer", "property", "job", "visit"] as const) {
      const id = { customer: customerId, property: propertyId, job: jobId, visit: visitId }[about]
      await expect(callApi(ctxFor(db, otherAdmin), eventsNote, { about, aboutId: id, text: "hello" })).rejects.toMatchObject({ code: "not_found" })
    }
    expect((await db.select().from(s.event)).length).toBe(before)
  })
})

describe("events on the other handlers", () => {
  it("visits.get carries the visit's events, newest first, and a tech reads them stripped", async () => {
    const full = await callApi(ctxFor(db, writeKey), visitsGet, { id: visitId })
    expect(full.events!.map((e) => e.kind)).toEqual(expect.arrayContaining(["visit.moved", "payment.succeeded", "visit.done", "note"]))
    expect(full.events![0]!.at >= full.events![1]!.at).toBe(true)
    const asTech = await callApi(ctxFor(db, tech), visitsGet, { id: visitId })
    expect(asTech.events!.map((e) => e.kind)).not.toContain("payment.succeeded")
    expect(JSON.stringify(asTech.events)).not.toContain("vm-9")
  })
  it("a signed-in customer reading their own pass gets no events at all", async () => {
    const pass = await callApi(ctxFor(db, customerPerson("c100")), passesGet, { id: "p1" })
    expect(pass.visits.length).toBeGreaterThan(0)
    for (const v of pass.visits) expect(v).not.toHaveProperty("events")
    expect(JSON.stringify(pass)).not.toContain("Gate sticks")
  })
})
