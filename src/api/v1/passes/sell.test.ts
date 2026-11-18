// @vitest-environment node
import { NO_TAX } from "@/lib/jobs/tax"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { Principal, PublicPrincipal } from "@/lib/auth/types"
import { chargeVisit } from "@/lib/pass/server/charge-visit"
import { stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, eventsOf, linesOfPass, ORG, readKey, writeKey } from "../../test-helpers"
import { jobTotal } from "@/lib/jobs/lines"
import { SERVICES } from "@/lib/services"
import { scheduleOfferDays } from "../schedule/handlers"
import { paymentsRecord } from "../payments/handlers"
import { visitsMarkClosed } from "../visits/money"
import { passesGet, passesSendCardUpdateLink, passesStartCardUpdate } from "./handlers"
import { passesSell } from "./sell"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
})
afterAll(() => db.close())

// November 10, 2027: the 2028 season is on sale, every visit ahead; the fixture's passes are all 2027.
const NOW = "2027-11-10T17:00:00Z"
const as = (p: Principal = writeKey, now = NOW) => ctxFor(db, p, now)
let n = 0
const newCustomer = (over: Record<string, unknown> = {}) => ({ firstName: "maya", lastName: "ortiz", email: `Maya${++n}@Example.com`, phone: "303-555-0142", property: { address: "12 Elm St", town: "Erie" }, ...over })
const sell = (input: Record<string, unknown>, p: Principal = writeKey) => callApi(as(p), passesSell, { zones: 8, paysBy: "at-visit", termsAccepted: true, ...input })
const messages = (customerId: string) => db.select().from(s.messageLog).where(eq(s.messageLog.customerId, customerId))

describe("passes.sell", () => {
  it("sells an existing customer a pass: active from the start, job source office, consent source admin, the onboarding task and the confirmation", async () => {
    // The card is the customer's: the fixture's Andrea has one, and this sale is the office taking money at each visit.
    await db.update(s.customer).set({ stripePaymentMethodId: null, cardBrand: null, cardLast4: null, cardExpires: null }).where(eq(s.customer.id, "c100"))
    const pass = await sell({ customerId: "c100", email: "andrea@example.com", notes: "Took it by phone" })
    expect(pass).toMatchObject({ season: 2028, status: "active", zones: 8, inspection: false, customerId: "c100", cardLast4: null, cardBrand: null, price: 145 + 95 + 20 })
    expect(pass.visits.map((v) => [v.kind, v.amount, v.status, v.scheduledOn])).toEqual([["turn-on", 145, "unscheduled", null], ["blowout", 115, "unscheduled", null]])
    expect(pass.consent).toMatchObject({ source: "admin", termsVersion: "2026-11", marketingOptIn: false })
    expect(pass.customer?.email).toBe("andrea@example.com")
    const row = { jobId: pass.id }
    const [job] = await db.select().from(s.job).where(eq(s.job.id, row.jobId))
    // an office sale is sold today: the job's sold day is set with the rows
    expect(job).toMatchObject({ source: "office", soldOn: "2027-11-10", season: 2028, passNumber: pass.number, renewsJobId: null, legacyPassId: null })
    const queued = await db.select().from(s.queueItem).where(and(eq(s.queueItem.kind, "pass-onboard"), eq(s.queueItem.key, pass.id)))
    expect(queued).toHaveLength(1)
    const mail = await messages("c100")
    const confirmation = mail.find((m) => m.kind === "purchase-confirmation")!
    expect(confirmation).toMatchObject({ channel: "email", to: "andrea@example.com", status: "queued" })
    expect(confirmation.body).toContain("Ryan sets the days that are missing")
    expect(confirmation.body).toContain("by check, Venmo or cash at the visit")
    expect(confirmation.body).not.toContain("card ending")
    expect(confirmation.body).toMatch(/Spring turn-on.* · \$\d+/)
    expect(confirmation.body).toContain("Season total · $")
    // One sale, one `job.sold` (the activation inside a sale writes none of its own), then the note and the consent it recorded.
    expect(await eventsOf(db, { kind: "job.sold", jobId: row.jobId })).toMatchObject([{ about: "job", aboutId: row.jobId, customerId: "c100", who: "api", detail: { source: "office", name: "Season Pass", passNumber: pass.number, paysBy: "at-visit" } }])
    expect(await eventsOf(db, { kind: "note", jobId: row.jobId })).toMatchObject([{ about: "job", aboutId: row.jobId, customerId: "c100", detail: { text: "Took it by phone" } }])
    expect(await eventsOf(db, { kind: "consent", jobId: row.jobId })).toMatchObject([{ about: "job", customerId: "c100", who: "api", detail: { source: "admin", marketingOptIn: false } }])
    expect(await eventsOf(db, { kind: "card.saved", customerId: "c100" })).toEqual([])
  })

  it("writes no event when the sale is refused", async () => {
    const before = (await db.select().from(s.event)).length
    await expect(sell({ customerId: "c100", email: "andrea@example.com" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(sell({ customerId: "c100" }, readKey)).rejects.toMatchObject({ code: "forbidden" })
    expect((await db.select().from(s.event)).length).toBe(before)
  })

  it("writes the zones sold on an existing customer's property", async () => {
    const [c] = await db.insert(s.customer).values({ organizationId: ORG, firstName: "Ivy", lastName: "Lund", email: "ivy@example.com" }).returning()
    const [p] = await db.insert(s.property).values({ organizationId: ORG, customerId: c!.id, address: "4 Ash St", town: "Erie", zones: 5, gateCode: "55" }).returning()
    const pass = await sell({ customerId: c!.id, zones: 11 })
    expect(pass.zones).toBe(11)
    expect((await db.select().from(s.property).where(eq(s.property.id, p!.id)))[0]).toMatchObject({ zones: 11, gateCode: "55" })
  })

  it("writes one line per visit beside the visits, three with the inspection, each from the service of the pass's zone band", async () => {
    const pass = await sell({ newCustomer: newCustomer(), zones: 12, inspection: true })
    const lines = await linesOfPass(db, pass.id)
    expect(lines.map((l) => [l.visitKind, l.name, l.unitPrice, l.serviceKey, l.quantity, l.taxable, l.cancelledAt])).toEqual([
      ["turn-on", "Spring turn-on", 185, "turn-on-12", 1, false, null],
      ["inspection", "Mid-season inspection", 185, "inspection-12", 1, false, null],
      ["blowout", "Fall blowout", 155, "blowout", 1, false, null],
    ])
    expect(lines.map((l) => l.description)).toEqual([SERVICES["turn-on-12"]!.description, SERVICES["inspection-12"]!.description, SERVICES.blowout.description])
    expect(lines.map((l) => l.visitId).sort()).toEqual(pass.visits.map((v) => v.id).sort())
    expect(jobTotal(lines, NO_TAX)).toBe(pass.price)
    const two = await sell({ newCustomer: newCustomer() })
    expect((await linesOfPass(db, two.id)).map((l) => l.visitKind)).toEqual(["turn-on", "blowout"])
  })

  it("refuses an existing customer with no email on file, a second pass of the season, a read key and the anonymous checkout", async () => {
    await expect(sell({ customerId: "c121", paysBy: "card-link" })).rejects.toMatchObject({ code: "invalid", message: expect.stringMatching(/no email on file/) })
    await expect(sell({ customerId: "c100", email: "andrea@example.com" })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringMatching(/already holds the 2028 Season Pass, TH-2028-/) })
    await expect(sell({ newCustomer: newCustomer() }, readKey)).rejects.toMatchObject({ code: "forbidden" })
    const visitor: PublicPrincipal = { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }
    await expect(sell({ newCustomer: newCustomer() }, visitor)).rejects.toMatchObject({ code: "forbidden" })
    await expect(sell({ customerId: "c100", newCustomer: newCustomer() })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(), passesSell, { newCustomer: newCustomer(), zones: 8, paysBy: "at-visit", termsAccepted: false })).rejects.toMatchObject({ code: "invalid" })
  })

  it("refuses paying at each visit for a customer who has a card on file", async () => {
    const first = await sell({ newCustomer: newCustomer() })
    await db.update(s.customer).set({ stripePaymentMethodId: "pm_have", stripeCustomerId: "cus_have", cardBrand: "visa", cardLast4: "4242" }).where(eq(s.customer.id, first.customerId))
    await expect(sell({ customerId: first.customerId })).rejects.toMatchObject({ code: "unprocessable", message: "This customer has a card on file; it is charged after each visit" })
  })

  it("sells a new customer a pass with the inspection, placing an open day and moving a day that is not open to the next open one", async () => {
    const offer = await callApi(as(), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2028, zones: 8 })
    const open = offer.days[0]!.day
    // October 1, 2028 is a Sunday: no truck works it, so the blowout goes to the next open day and the move is recorded.
    const pass = await sell({ newCustomer: newCustomer({ accessNote: "Gate code 4411" }), inspection: true, days: { "turn-on": open, blowout: "2028-10-01" } })
    expect(pass).toMatchObject({ status: "active", inspection: true, accessNote: "Gate code 4411", firstName: "Maya" })
    const [prop] = await db.select().from(s.property).where(eq(s.property.customerId, pass.customerId))
    expect(prop).toMatchObject({ zones: 8, accessNote: "Gate code 4411" })
    expect(pass.customer).toMatchObject({ lastName: "Ortiz", email: expect.stringMatching(/^maya\d+@example\.com$/), phone: "+13035550142" })
    expect(pass.visits.map((v) => v.kind)).toEqual(["turn-on", "inspection", "blowout"])
    expect(pass.visits.find((v) => v.kind === "turn-on")).toMatchObject({ status: "scheduled", scheduledOn: open, startTime: offer.days[0]!.start })
    expect(pass.visits.find((v) => v.kind === "inspection")).toMatchObject({ status: "unscheduled", scheduledOn: null })
    const blowout = pass.visits.find((v) => v.kind === "blowout")!
    expect(blowout).toMatchObject({ status: "scheduled", scheduledOn: "2028-10-02" })
    expect(await eventsOf(db, { kind: "visit.day-filled", visitId: blowout.id })).toMatchObject([{ about: "visit", aboutId: blowout.id, customerId: pass.customerId, who: "api", detail: { visit: "blowout", from: "2028-10-01", to: "2028-10-02" } }])
    // The held days become scheduled visits written by the system, one event each.
    expect(await eventsOf(db, { kind: "visit.scheduled", visitId: blowout.id })).toMatchObject([{ about: "visit", who: "system", detail: { name: "Fall blowout", day: "2028-10-02", from: null } }])
    const confirmation = (await messages(pass.customerId)).find((m) => m.kind === "purchase-confirmation")!
    expect(confirmation.body).toContain("Your first choice, Sunday, October 1, filled up, so we put it on Monday, October 2.")
    expect(confirmation.body).toContain("Google Calendar:")
    const [property] = await db.select().from(s.property).where(eq(s.property.customerId, pass.customerId))
    expect(property).toMatchObject({ address: "12 Elm St", town: "Erie" })
  })

  it("pays by card link: a Stripe customer is made, the confirmation carries the link, and no second email goes", async () => {
    const stub = stubStripe()
    getStripe.mockReturnValue(stub.stripe)
    const pass = await sell({ newCustomer: newCustomer(), paysBy: "card-link" })
    expect(pass).toMatchObject({ status: "active", cardLast4: null })
    expect(stub.calls.customersCreate).toHaveBeenCalledTimes(1)
    expect(stub.calls.sessionCreate.mock.calls[0]![0]).toMatchObject({ mode: "setup", customer: "cus_new_1", metadata: { purpose: "card-update", passId: pass.id } })
    const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, pass.customerId))
    expect(customer!.stripeCustomerId).toBe("cus_new_1")
    const mail = await messages(pass.customerId)
    expect(mail.map((m) => m.kind)).toEqual(["purchase-confirmation"])
    expect(mail[0]!.body).toContain("You pay $0 today. We charge $145 after the spring turn-on and $115 after the fall blowout.")
    expect(mail[0]!.body).toContain("Add your card: https://checkout.stripe.test/c/pay")
    // Send card link and Add a card reuse that Stripe customer rather than making another.
    await callApi(as(), passesSendCardUpdateLink, { id: pass.id })
    await expect(callApi(as(), passesStartCardUpdate, { id: pass.id })).resolves.toEqual({ url: "https://checkout.stripe.test/c/pay" })
    expect(stub.calls.customersCreate).toHaveBeenCalledTimes(1)
    expect((await messages(pass.customerId)).map((m) => m.kind)).toEqual(["purchase-confirmation", "card-failed"])
  })

  it("at the visit: Done asks how it was paid, records the payment on the pass visit and queues no charge; the charge task meets no card and writes nothing", async () => {
    const stub = stubStripe()
    getStripe.mockReturnValue(stub.stripe)
    const offer = await callApi(as(), scheduleOfferDays, { town: "Longmont", kind: "turn-on", season: 2028, zones: 6 })
    const pass = await sell({ newCustomer: newCustomer({ property: { address: "4 Oak St", town: "Longmont" } }), zones: 6, days: { "turn-on": offer.days[0]!.day } })
    const visit = pass.visits.find((v) => v.kind === "turn-on")!
    const later = (p = adminKey) => as(p, "2028-05-20T20:00:00Z")
    await expect(callApi(later(), visitsMarkClosed, { id: visit.id })).rejects.toMatchObject({ code: "invalid", message: expect.stringMatching(/how it was paid/) })
    expect(await chargeVisit(db, stub.stripe, visit.id, { origin: "https://site.test" })).toBe("no-card")
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, visit.id))).toEqual([])
    const done = await callApi(later(), visitsMarkClosed, { id: visit.id, paidBy: { method: "venmo", reference: "@maya" } })
    expect(done).toMatchObject({ status: "completed", paidBy: "venmo", paymentStatus: "paid" })
    expect(await db.select().from(s.queueItem).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, visit.id)))).toEqual([])
    const [charge] = await db.select().from(s.charge).where(eq(s.charge.visitId, visit.id))
    expect(charge).toMatchObject({ jobId: pass.id, method: "venmo", reference: "@maya", status: "succeeded", amount: 145 })
    const receipt = (await messages(pass.customerId)).find((m) => m.kind === "receipt")!
    expect(receipt.body).toContain("Venmo")
    expect(receipt.body).toContain(`Season Pass ${pass.number}`)
    const detail = await callApi(as(), passesGet, { id: pass.id })
    expect(detail.charges).toHaveLength(1)
    expect(detail.cardFailedAt).toBeNull()
    expect(stub.calls.paymentIntentsCreate).not.toHaveBeenCalled()
    // A later payment on the pass visit is recorded here too, never sent to a card.
    await expect(callApi(later(), paymentsRecord, { jobId: pass.id, visitId: visit.id, amount: 145, method: "cash" })).rejects.toMatchObject({ code: "conflict" })
  })
})
