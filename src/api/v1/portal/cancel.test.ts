// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, customerPerson, eventsOf, linesOfJob, passJobOf, setPass, writeKey } from "../../test-helpers"
import { customersCreate } from "../customers/handlers"
import { paymentsRecord } from "../payments/handlers"
import { passesSkipVisit } from "../passes/handlers"
import { visitsPick } from "../visits/handlers"
import { visitsCreate } from "../visits/office"
import { visitsCancelSelf } from "./cancel"
import { jobsGet } from "./jobs"

let db: TestDb
let dana: string // one-off jobs, a mobile number and an email
let eve: string // another customer, to prove the scoping
let andrea: string // a pass holder
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  const make = async (firstName: string, email: string, phone: string) => (await callApi(ctxFor(db, writeKey), customersCreate, { firstName, lastName: "Tester", email, phone, property: { address: "12 Cottonwood Way", town: "Erie" } })).id
  dana = await make("Dana", "dana@example.com", "970-555-0142")
  eve = await make("Eve", "eve@example.com", "970-555-0143")
  andrea = (await passJobOf(db, "p3")).customerId
  await db.update(s.customer).set({ email: "andrea@example.com", phone: "303-555-0100" }).where(eq(s.customer.id, andrea))
})
afterAll(() => db.close())

// Tuesday June 8 2027: the cut-off is Mon June 7 00:00 MDT (06:00Z), so Sunday 11:59 pm MDT is the last minute a customer may change it.
const DAY = "2027-06-08"
const LAST_OK = "2027-06-07T05:59:00Z"
const TOO_LATE = "2027-06-07T06:00:00Z"
const EARLY = "2027-05-20T15:00:00Z"
const me = (id: string, now = EARLY) => ctxFor(db, customerPerson(id, `${id}@example.com`), now)
const office = (now = EARLY) => ctxFor(db, writeKey, now)

let n = 0
/** A booked repair on its own job, on the next free weekday from June 14 (so tests do not share a person's day). */
async function bookedRepair(customerId: string, day?: string, price = 145) {
  let d = new Date(Date.UTC(2027, 5, 14 + n++))
  while ([0, 6].includes(d.getUTCDay())) d = new Date(Date.UTC(2027, 5, 14 + n++))
  return callApi(office(), visitsCreate, { customerId, kind: "repair", scheduledOn: day ?? d.toISOString().slice(0, 10), price })
}
const messagesOf = async (visitId: string, kind: string) => (await db.select().from(s.messageLog)).filter((m) => m.visitId === visitId && m.kind === kind)
const staffQueue = async (needle: string) => (await db.select().from(s.queueItem)).filter((q) => q.kind === "message" && (q.payload as { staff?: boolean }).staff && q.key.includes(needle))

describe("visits.cancelSelf: who and when", () => {
  it("refuses another customer's visit and a key", async () => {
    const v = await bookedRepair(dana)
    await expect(callApi(me(eve), visitsCancelSelf, { id: v.id })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(office(), visitsCancelSelf, { id: v.id })).rejects.toMatchObject({ code: "forbidden" })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]).toMatchObject({ status: "scheduled" })
  })

  it("lets a customer cancel up to Sunday 11:59 pm Mountain and refuses from Monday 12:00 am, with the words the screen shows", async () => {
    const v = await bookedRepair(dana, DAY)
    await expect(callApi(me(dana, TOO_LATE), visitsCancelSelf, { id: v.id })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("within 24 hours") })
    await expect(callApi(me(dana, TOO_LATE), visitsCancelSelf, { id: v.id })).rejects.toMatchObject({ message: expect.stringContaining("(970) 692-7270") })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]).toMatchObject({ status: "scheduled", scheduledOn: DAY })
    const out = await callApi(me(dana, LAST_OK), visitsCancelSelf, { id: v.id })
    expect(out).toMatchObject({ id: v.id, status: "cancelled" })
  })

  it("never cancels a done, canceled or skipped visit", async () => {
    const v = await bookedRepair(dana)
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-19" }).where(eq(s.visit.id, v.id))
    await expect(callApi(me(dana), visitsCancelSelf, { id: v.id })).rejects.toMatchObject({ code: "unprocessable" })
  })

  it("a customer's move or skip is refused inside the cut-off by the same rule (visits.pick and passes.skipVisit), the office is not held to it", async () => {
    const v = await callApi(office(), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: DAY, price: 145 })
    await expect(callApi(me(dana, TOO_LATE), visitsPick, { id: v.id, day: "2027-06-10" })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("within 24 hours") })
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: DAY, personId: "person_truck-1" }).where(eq(s.visit.id, "p3-turn-on"))
    await expect(callApi(me(andrea, TOO_LATE), passesSkipVisit, { id: "p3", kind: "turn-on" })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("within 24 hours") })
    await expect(callApi(office(TOO_LATE), passesSkipVisit, { id: "p3", kind: "turn-on" })).resolves.toMatchObject({ status: "skipped" })
  })
})

describe("visits.cancelSelf: a Season Pass visit", () => {
  it("becomes the pass skip: skipped, its line canceled, the pass stays, nothing charged", async () => {
    await setPass(db, "p3", { status: "active" })
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: DAY, personId: "person_truck-1" }).where(eq(s.visit.id, "p3-blowout"))
    const job = await passJobOf(db, "p3")
    const before = (await linesOfJob(db, job.id)).find((l) => l.visitKind === "blowout")!
    expect(before.cancelledAt).toBeNull()
    const out = await callApi(me(andrea), visitsCancelSelf, { id: "p3-blowout", reason: "Away that week" })
    expect(out).toMatchObject({ id: "p3-blowout", status: "skipped" })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, "p3-blowout")))[0]).toMatchObject({ status: "skipped", scheduledOn: null, personId: null })
    expect((await linesOfJob(db, job.id)).find((l) => l.visitKind === "blowout")!.cancelledAt).not.toBeNull()
    expect((await db.select().from(s.job).where(eq(s.job.id, job.id)))[0]!.cancelledAt).toBeNull()
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, "p3-blowout"))).toEqual([])
    // one visit.cancelled event, by the customer, with the reason; no second event for the skip
    expect(await eventsOf(db, { visitId: "p3-blowout", kind: "visit.cancelled" })).toMatchObject([{ about: "visit", who: "customer", customerId: andrea, detail: { name: "Fall blowout", reason: "Away that week", day: DAY, skipped: true } }])
    expect(await eventsOf(db, { visitId: "p3-blowout", kind: "visit.skipped" })).toEqual([])
  })
})

describe("visits.cancelSelf: a one-off visit", () => {
  it("cancels the visit and its line, then the job when it was the only live visit, and says so everywhere once", async () => {
    const v = await bookedRepair(dana)
    const out = await callApi(me(dana), visitsCancelSelf, { id: v.id, reason: "Fixed it myself" })
    expect(out).toMatchObject({ id: v.id, status: "cancelled" })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]).toMatchObject({ status: "cancelled", scheduledOn: null, personId: null })
    expect((await linesOfJob(db, v.jobId)).every((l) => l.cancelledAt !== null)).toBe(true)
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]!.cancelledAt).not.toBeNull()
    expect(await eventsOf(db, { visitId: v.id, kind: "visit.cancelled" })).toMatchObject([{ who: "customer", detail: { reason: "Fixed it myself" } }])
    expect(await eventsOf(db, { jobId: v.jobId, kind: "job.cancelled" })).toHaveLength(1)
    // the customer is told once, in the confirmation text; Ryan has a Home row and a staff message
    const texts = await messagesOf(v.id, "visit-cancelled")
    expect(texts).toHaveLength(1)
    expect(texts[0]).toMatchObject({ channel: "sms", to: "+19705550142", status: "queued" })
    expect(texts[0]!.body).toMatch(/is canceled\. Nothing was charged\./)
    const alerts = (await db.select().from(s.adminAlert)).filter((a) => a.kind === "customer-changed" && a.key.startsWith(`${v.id}:`))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.message).toMatch(/^Dana Tester canceled Repair, .+, Erie\. The day is free\.$/)
    expect(alerts[0]!.message).not.toContain("payment")
    expect(await staffQueue(v.id)).toHaveLength(1)
  })

  it("is idempotent: a second call answers the same and adds no event, message or alert", async () => {
    const v = await bookedRepair(dana)
    const first = await callApi(me(dana), visitsCancelSelf, { id: v.id })
    const second = await callApi(me(dana), visitsCancelSelf, { id: v.id })
    expect(second).toEqual(first)
    expect(await eventsOf(db, { visitId: v.id, kind: "visit.cancelled" })).toHaveLength(1)
    expect(await messagesOf(v.id, "visit-cancelled")).toHaveLength(1)
    expect((await db.select().from(s.adminAlert)).filter((a) => a.key.startsWith(`${v.id}:`))).toHaveLength(1)
  })

  it("keeps the job open when it has another live visit, and still cancels only this visit's line", async () => {
    const first = await bookedRepair(dana)
    const second = await callApi(office(), visitsCreate, { jobId: first.jobId, kind: "repair" })
    await callApi(me(dana), visitsCancelSelf, { id: first.id })
    expect((await db.select().from(s.job).where(eq(s.job.id, first.jobId)))[0]!.cancelledAt).toBeNull()
    expect((await db.select().from(s.visit).where(eq(s.visit.id, second.id)))[0]!.status).not.toBe("cancelled")
    expect(await eventsOf(db, { jobId: first.jobId, kind: "job.cancelled" })).toEqual([])
  })

  it("cancels an unscheduled visit too (no day to free) and voids no invoice that was not there", async () => {
    const v = await callApi(office(), visitsCreate, { customerId: dana, kind: "repair", price: 145 })
    expect(v.status).toBe("unscheduled")
    await expect(callApi(me(dana), visitsCancelSelf, { id: v.id })).resolves.toMatchObject({ status: "cancelled" })
    const alert = (await db.select().from(s.adminAlert)).find((a) => a.kind === "customer-changed" && a.key.startsWith(`${v.id}:`))!
    expect(alert.message).toMatch(/^Dana Tester canceled Repair, Erie\.$/)
  })

  it("a job that holds a payment keeps the job open, tells Ryan so and says what stays paid", async () => {
    const v = await bookedRepair(dana)
    await callApi(office(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check", reference: "5511" })
    await callApi(me(dana), visitsCancelSelf, { id: v.id })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]!.status).toBe("cancelled")
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]!.cancelledAt).toBeNull()
    expect(await db.select().from(s.charge).where(and(eq(s.charge.visitId, v.id), eq(s.charge.status, "succeeded")))).toHaveLength(1)
    const alert = (await db.select().from(s.adminAlert)).find((a) => a.key.startsWith(`${v.id}:`))!
    expect(alert.message).toContain("The job has a payment.")
    const text = (await messagesOf(v.id, "visit-cancelled"))[0]!
    expect(text.body).toContain("$145")
    expect(text.body).not.toContain("Nothing was charged")
    // the customer's own account still shows the job, with its visit canceled
    const job = await callApi(me(dana), jobsGet, { id: v.jobId })
    expect(job.visits[0]).toMatchObject({ status: "cancelled", canceledOn: "2027-05-20" })
  })
})
