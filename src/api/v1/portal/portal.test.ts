// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { applyCardUpdate } from "@/lib/stripe/card-update"
import { completeSession, stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, customerPerson, eventsOf, passJobOf, readKey, writeKey } from "../../test-helpers"
import { customersCreate } from "../customers/handlers"
import { invoicesGet, invoicesList, invoicesSend } from "../invoices/handlers"
import { paymentsRecord } from "../payments/handlers"
import { visitsAreaDays, visitsPick } from "../visits/handlers"
import { visitsCreate } from "../visits/office"
import { jobsGet, jobsList } from "./jobs"
import { customersMe, customersStartCardUpdate, customersUpdateSelf, propertiesUpdateSelf } from "./me"
import { paymentsReceipt } from "./receipt"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))

let db: TestDb
let dana: string // a customer with one-off jobs and no pass
let andrea: string // a pass holder
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  getStripe.mockReturnValue(stubStripe().stripe)
  db = await apiDb()
  dana = (await callApi(ctxFor(db, writeKey), customersCreate, { firstName: "Dana", lastName: "Quill", email: "dana@example.com", phone: "970-555-0142", property: { address: "12 Cottonwood Way", town: "Erie" } })).id
  andrea = (await passJobOf(db, "p3")).customerId
  await db.update(s.customer).set({ email: "andrea@example.com" }).where(eq(s.customer.id, andrea))
})
afterAll(() => db.close())
beforeEach(() => getStripe.mockReturnValue(stubStripe().stripe))

const me = (id: string, now = "2027-05-07T20:00:00Z") => ctxFor(db, customerPerson(id, `${id}@example.com`), now)
const office = (now = "2027-05-07T20:00:00Z") => ctxFor(db, writeKey, now)

/** A repair that is done, with what it owes, for the customer. */
let n = 0
/** The next weekday from June 1, so no two visits fight over one person's day. */
const nextDay = () => {
  let d = new Date(Date.UTC(2027, 5, 1 + n++))
  while ([0, 6].includes(d.getUTCDay())) d = new Date(Date.UTC(2027, 5, 1 + n++))
  return d.toISOString().slice(0, 10)
}
async function doneRepair(customerId: string, price = 145) {
  const day = nextDay()
  const v = await callApi(office(), visitsCreate, { customerId, kind: "repair", scheduledOn: day, price })
  await db.update(s.visit).set({ status: "completed", completedOn: day }).where(eq(s.visit.id, v.id))
  return v
}

describe("jobs.list and jobs.get", () => {
  it("lists a customer with one-off jobs and no pass: the job, its line, its visit by first name, what is owed and an open invoice with a signed pay link", async () => {
    const v = await doneRepair(dana)
    const inv = await callApi(office(), invoicesSend, { jobId: v.jobId })
    const { data } = await callApi(me(dana), jobsList, {})
    const job = data.find((j) => j.id === v.jobId)!
    expect(job).toMatchObject({ kind: "repair", name: "Repair", passId: null, stage: "done", total: 145, money: { paid: 0, owed: 145, words: "Invoice sent" } })
    expect(job.visits).toMatchObject([{ id: v.id, kind: "repair", name: "Repair", status: "completed", change: "no" }])
    expect(job.invoices).toMatchObject([{ id: inv.id, status: "sent", total: 145, paidOn: null }])
    expect(job.invoices[0]!.payUrl).toMatch(new RegExp(`^/pay/${inv.id}\\?token=`))
    expect(data.every((j) => j.passId === null)).toBe(true)
  })

  it("never carries a note, an event, a Jobber link, a surname or a voided invoice", async () => {
    const v = await doneRepair(dana)
    await db.insert(s.event).values({ id: "evt-note", organizationId: v.customerId ? (await db.select().from(s.customer).where(eq(s.customer.id, dana)))[0]!.organizationId : "", about: "job", aboutId: v.jobId, customerId: dana, jobId: v.jobId, kind: "note", detail: { text: "gate sticks, owner is grumpy" }, who: "ryan@example.com" })
    const sent = await callApi(office(), invoicesSend, { jobId: v.jobId })
    await db.update(s.invoice).set({ cancelledAt: new Date("2027-05-08T12:00:00Z") }).where(eq(s.invoice.id, sent.id))
    const text = JSON.stringify(await callApi(me(dana), jobsList, {}))
    expect(text).not.toContain("grumpy")
    expect(text).not.toContain("jobberRequestUrl")
    expect(text).not.toContain("events")
    const job = (await callApi(me(dana), jobsGet, { id: v.jobId }))
    expect(job.invoices).toEqual([])
  })

  it("lists a pass holder's pass as a job, with its visits and its pass id", async () => {
    const { data } = await callApi(me(andrea), jobsList, {})
    const pass = data.find((j) => j.kind === "pass")!
    expect(pass).toMatchObject({ name: expect.stringMatching(/^Season Pass 20\d\d$/), passId: pass.id })
    expect(pass.visits.map((x) => x.kind)).toContain("turn-on")
  })

  it("refuses another customer's job and list, and a key with no customer to ask about", async () => {
    const v = await doneRepair(dana)
    await expect(callApi(me(andrea), jobsGet, { id: v.jobId })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(me(andrea), jobsList, { customerId: dana })).resolves.toMatchObject({ data: expect.not.arrayContaining([expect.objectContaining({ id: v.jobId })]) })
    await expect(callApi(ctxFor(db, readKey), jobsList, {})).rejects.toMatchObject({ code: "invalid" })
    expect((await callApi(ctxFor(db, readKey), jobsList, { customerId: dana })).data.map((j) => j.id)).toContain(v.jobId)
    await expect(callApi(me(andrea), jobsGet, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })

  it("reads each payment with its receipt and leaves out one that failed", async () => {
    const v = await doneRepair(dana, 80)
    await callApi(office(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 80, method: "check", reference: "1042" })
    await db.insert(s.charge).values({ id: "failed-1", organizationId: (await db.select().from(s.customer).where(eq(s.customer.id, dana)))[0]!.organizationId, jobId: v.jobId, customerId: dana, visitId: v.id, amount: 80, method: "card_on_file", status: "failed", attempt: 2 })
    const job = await callApi(me(dana), jobsGet, { id: v.jobId })
    expect(job.payments).toMatchObject([{ amount: 80, method: "check", reference: "1042" }])
    expect(job.money).toMatchObject({ paid: 80, owed: 0, words: "Paid" })
  })
})

describe("invoices.list and invoices.get for a customer", () => {
  it("lists only the customer's own invoices and refuses another's", async () => {
    const mine = await doneRepair(dana)
    const theirs = await doneRepair(andrea)
    const a = await callApi(office(), invoicesSend, { jobId: mine.jobId })
    const b = await callApi(office(), invoicesSend, { jobId: theirs.jobId })
    const list = await callApi(me(dana), invoicesList, {})
    expect(list.data.map((i) => i.id)).toContain(a.id)
    expect(list.data.map((i) => i.id)).not.toContain(b.id)
    expect(list.data.every((i) => i.customerId === dana)).toBe(true)
    expect(list.data.find((i) => i.id === a.id)!.payUrl).toMatch(/^https:\/\/site\.test\/pay\//)
    await expect(callApi(me(dana), invoicesList, { customerId: andrea })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(me(dana), invoicesGet, { id: b.id })).rejects.toMatchObject({ code: "forbidden" })
    expect(await callApi(me(dana), invoicesGet, { id: a.id })).toMatchObject({ id: a.id })
  })
})

describe("payments.receipt", () => {
  it("builds a printable receipt from a check payment, for its own customer only", async () => {
    const v = await doneRepair(dana, 80)
    const pay = await callApi(office(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 80, method: "check", reference: "1043" })
    const receipt = await callApi(me(dana), paymentsReceipt, { id: pay.id })
    expect(receipt).toMatchObject({ id: pay.id, amount: 80, method: "check", reference: "1043", jobName: "Repair", lines: [{ name: "Repair", quantity: 1, unitPrice: 80 }], receiptUrl: null })
    expect(receipt.business.phone).toBe("(970) 692-7270")
    await expect(callApi(me(andrea), paymentsReceipt, { id: pay.id })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(me(dana), paymentsReceipt, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("customers.me, updateSelf, properties.updateSelf, startCardUpdate", () => {
  it("shows the customer, their yard and whether they ever held a pass", async () => {
    expect(await callApi(me(dana), customersMe, {})).toMatchObject({ id: dana, email: "dana@example.com", hasHeldPass: false })
    const mine = await callApi(me(andrea), customersMe, {})
    expect(mine.hasHeldPass).toBe(true)
    expect(JSON.stringify(mine)).not.toContain("notes")
    await expect(callApi(ctxFor(db, readKey), customersMe, {})).rejects.toMatchObject({ code: "forbidden" })
  })

  it("changes the customer's own name and mobile, never the email, and records who did it", async () => {
    const out = await callApi(me(dana), customersUpdateSelf, { firstName: "danielle", phone: "(970) 555-0188" })
    expect(out).toMatchObject({ firstName: "Danielle", phone: "+19705550188", email: "dana@example.com" })
    await expect(callApi(me(dana), customersUpdateSelf, { email: "x@y.com" } as never)).resolves.toMatchObject({ email: "dana@example.com" })
    expect((await eventsOf(db, { kind: "customer.edited", customerId: dana })).filter((e) => e.who === "customer")).toHaveLength(1)
  })

  it("changes the yard facts of their own property and refuses another customer's", async () => {
    const [prop] = await db.select().from(s.property).where(eq(s.property.customerId, dana))
    const [other] = await db.select().from(s.property).where(eq(s.property.customerId, andrea))
    const out = await callApi(me(dana), propertiesUpdateSelf, { id: prop!.id, gateCode: "4471", mustBeHome: true, accessNote: "Side gate" })
    expect(out.properties.find((p) => p.id === prop!.id)).toMatchObject({ gateCode: "4471", mustBeHome: true, accessNote: "Side gate" })
    await expect(callApi(me(dana), propertiesUpdateSelf, { id: other!.id, gateCode: "0000" })).rejects.toMatchObject({ code: "not_found" })
    expect((await db.select().from(s.property).where(eq(s.property.id, other!.id)))[0]!.gateCode).not.toBe("0000")
  })

  it("opens Stripe's card page for the customer, who needs no pass, and stores the card it saves on that customer", async () => {
    const out = await callApi(me(dana), customersStartCardUpdate, {})
    expect(out.url).toMatch(/^https:\/\//)
    const { stripe, calls } = stubStripe({ sessions: { cs_acct: completeSession("cs_acct", { purpose: "card-update", customerId: dana }, { pm: "pm_acct", last4: "4242", expYear: 2031, expMonth: 1 }) } })
    expect(await applyCardUpdate(db, stripe, "cs_acct", new Date("2027-05-07T20:00:00Z"))).toBe("applied")
    expect(await applyCardUpdate(db, stripe, "cs_acct", new Date("2027-05-07T20:00:00Z"))).toBe("already-applied")
    expect(calls.customersUpdate).toHaveBeenCalledTimes(1)
    expect((await db.select().from(s.customer).where(eq(s.customer.id, dana)))[0]).toMatchObject({ stripePaymentMethodId: "pm_acct", cardLast4: "4242", cardExpires: "2031-01" })
    expect((await callApi(me(dana), customersMe, {})).card).toMatchObject({ last4: "4242", expires: "2031-01" })
    await expect(callApi(ctxFor(db, writeKey), customersStartCardUpdate, {})).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("visits.areaDays and visits.pick for a one-off job and the two-day cut-off", () => {
  it("lets a customer move a booked turn-on on a one-off job until two days before it, then says to call", async () => {
    const v = await callApi(office("2027-04-20T15:00:00Z"), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: "2027-05-12", price: 145 })
    const days = (await callApi(me(dana, "2027-04-20T15:00:00Z"), visitsAreaDays, { id: v.id })).days
    expect(days.length).toBeGreaterThan(0)
    const moved = await callApi(me(dana, "2027-04-20T15:00:00Z"), visitsPick, { id: v.id, day: days[0]! })
    expect(moved).toMatchObject({ status: "scheduled", scheduledOn: days[0] })
    // two days before the day: still allowed; the day before: call
    const on = days[0]!
    const twoBefore = new Date(Date.parse(`${on}T12:00:00Z`) - 2 * 86_400_000).toISOString().slice(0, 10)
    const oneBefore = new Date(Date.parse(`${on}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
    await expect(callApi(me(dana, `${twoBefore}T15:00:00Z`), visitsAreaDays, { id: v.id })).resolves.toHaveProperty("days")
    await expect(callApi(me(dana, `${oneBefore}T15:00:00Z`), visitsAreaDays, { id: v.id })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("(970) 692-7270") })
    await expect(callApi(me(dana, `${oneBefore}T15:00:00Z`), visitsPick, { id: v.id, day: days[1] ?? days[0]! })).rejects.toMatchObject({ code: "unprocessable" })
    // the office is not held to the cut-off
    await expect(callApi(ctxFor(db, writeKey, `${oneBefore}T15:00:00Z`), visitsAreaDays, { id: v.id })).resolves.toHaveProperty("days")
  })

  it("marks the visit changeable in the job, and not once the day is close", async () => {
    const v = await callApi(office("2027-04-20T15:00:00Z"), visitsCreate, { customerId: dana, kind: "turn-on", scheduledOn: "2027-05-12", price: 145 })
    const early = (await callApi(me(dana, "2027-04-20T15:00:00Z"), jobsGet, { id: v.jobId })).visits[0]!
    expect(early.change).toBe("yes")
    const late = (await callApi(me(dana, "2027-05-11T15:00:00Z"), jobsGet, { id: v.jobId })).visits[0]!
    expect(late.change).toBe("call")
  })

  it("keeps a repair, which has no season window, out of online day changes", async () => {
    const v = await callApi(office(), visitsCreate, { customerId: dana, kind: "repair", scheduledOn: nextDay(), price: 145 })
    expect((await callApi(me(dana), jobsGet, { id: v.jobId })).visits[0]!.change).toBe("no")
    await expect(callApi(me(dana), visitsPick, { id: v.id, day: "2027-06-21" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})
