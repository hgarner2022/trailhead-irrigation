// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { makeCtx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import { apiDb, ORG } from "@/api/test-helpers"
import type { CheckoutSubmission } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-submit"
import { completeSession, stubStripe } from "@/lib/stripe/test-stripe"
import { beginCheckoutWith, finishCheckoutWith, problemOf, type CheckoutDeps } from "./checkout"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))
vi.mock("./create", async (original) => ({ ...(await original<typeof import("./create")>()), emailDomainReachable: async () => true }))

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  vi.stubEnv("APP_URL", "https://site.test")
})
afterAll(() => db.close())

const NOW = new Date("2026-12-01T17:00:00Z")
const submission = (over: Partial<CheckoutSubmission> = {}): CheckoutSubmission => ({
  address: { id: "p1", label: "5 Pine St, Erie, CO 80516", line1: "5 Pine St", town: "Erie", state: "CO", zip: "80516" },
  town: "Erie",
  needsCustomerHome: false,
  accessNote: "",
  zones: 8,
  inspection: false,
  turnOnPreference: "earlier",
  blowoutPreference: "recommended",
  firstName: "Eli",
  email: "eli@example.com",
  phone: "(303) 555-0111",
  ...over,
})
const depsWith = (stripe: ReturnType<typeof stubStripe>["stripe"]): CheckoutDeps => ({
  ctx: async (passId) => makeCtx(db, { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"], ...(passId ? { passId } : {}) }, { now: NOW }),
  stripe: () => stripe,
})

describe("beginCheckoutWith", () => {
  it("makes the pending pass and a setup-mode embedded session for it, charging nothing", async () => {
    const stub = stubStripe()
    const result = await beginCheckoutWith(depsWith(stub.stripe), submission())
    expect(result).toMatchObject({ ok: true, clientSecret: "cs_secret" })
    if (!result.ok) return
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, result.passId))
    expect(pass).toMatchObject({ status: "pending", zones: 8, turnOnPreference: "earlier" })
    const params = stub.calls.sessionCreate.mock.calls[0]![0]
    expect(params).toMatchObject({ mode: "setup", ui_mode: "embedded_page", redirect_on_completion: "never", customer_email: "eli@example.com", metadata: { purpose: "pass-setup", passId: pass!.id } })
    const expiresIn = (params.expires_at as number) - Math.floor(Date.now() / 1000)
    expect(expiresIn).toBeGreaterThan(34 * 60)
    expect(expiresIn).toBeLessThanOrEqual(45 * 60)
    expect(stub.calls.paymentIntentsCreate).not.toHaveBeenCalled()
  })
  it("going back reuses the same pending pass", async () => {
    const stub = stubStripe()
    const first = await beginCheckoutWith(depsWith(stub.stripe), submission({ email: "back2@example.com" }))
    const again = await beginCheckoutWith(depsWith(stub.stripe), submission({ email: "back2@example.com", zones: 10 }), first.ok ? first.passId : undefined)
    expect(first.ok && again.ok && first.passId === again.passId).toBe(true)
  })
  it("answers a refusal as a problem, never a throw", async () => {
    const stub = stubStripe()
    const out = await beginCheckoutWith(depsWith(stub.stripe), submission({ address: { id: "x", label: "1 Main, Denver", line1: "1 Main", town: "Erie", state: "CO", zip: "80202" }, phone: "12" }))
    expect(out).toMatchObject({ ok: false, problem: "invalid" })
    expect(stub.calls.sessionCreate).not.toHaveBeenCalled()
    const boom = { ...stubStripe().stripe, checkout: { sessions: { create: async () => { throw new Error("stripe down") } } } } as never
    expect(await beginCheckoutWith(depsWith(boom), submission({ email: "boom@example.com" }))).toMatchObject({ ok: false, problem: "unavailable" })
  })
})

describe("finishCheckoutWith", () => {
  it("activates from the finished session with the ticked consent and returns the real pass", async () => {
    const begun = await beginCheckoutWith(depsWith(stubStripe().stripe), submission({ email: "fin@example.com", inspection: true, zones: 6 }))
    if (!begun.ok) throw new Error("begin failed")
    getStripe.mockReturnValue(stubStripe({ sessions: { cs_f: completeSession("cs_f", { purpose: "pass-setup", passId: begun.passId }, { last4: "4242" }) } }).stripe)
    const done = await finishCheckoutWith(depsWith(stubStripe().stripe), begun.passId, "cs_f", { termsAccepted: true, marketingEmail: true, marketingSms: false }, "Eli")
    expect(done.ok).toBe(true)
    if (!done.ok) return
    expect(done.pass).toMatchObject({ status: "active", firstName: "Eli", town: "Erie", zones: 6, cardLast4: "4242" })
    expect(done.pass.visits.map((v) => v.kind)).toEqual(["turn-on", "inspection", "blowout"])
    expect(done.pass.number).toMatch(/^TH-2027-\d{4}$/)
    expect(done.pass.consent).toMatchObject({ marketingChannels: ["email"], source: "checkout" })
  })
  it("refuses without the terms, and a session from another pass", async () => {
    const a = await beginCheckoutWith(depsWith(stubStripe().stripe), submission({ email: "fa@example.com" }))
    const b = await beginCheckoutWith(depsWith(stubStripe().stripe), submission({ email: "fb@example.com" }))
    if (!a.ok || !b.ok) throw new Error("begin failed")
    expect(await finishCheckoutWith(depsWith(stubStripe().stripe), a.passId, "cs_a", { termsAccepted: false, marketingEmail: false, marketingSms: false })).toMatchObject({ ok: false, problem: "invalid" })
    getStripe.mockReturnValue(stubStripe({ sessions: { cs_b: completeSession("cs_b", { purpose: "pass-setup", passId: b.passId }) } }).stripe)
    expect(await finishCheckoutWith(depsWith(stubStripe().stripe), a.passId, "cs_b", { termsAccepted: true, marketingEmail: false, marketingSms: false })).toMatchObject({ ok: false, problem: "unavailable" })
  })
})

describe("problemOf", () => {
  it("words each reason the API gives", () => {
    const reason = (message: string, code: "unprocessable" | "rate_limited" = "unprocessable") => new ApiError(code, "x", [{ path: "reason", message }])
    expect(problemOf(reason("out-of-area")).problem).toBe("out-of-area")
    expect(problemOf(reason("email-unreachable")).message).toContain("mail server")
    expect(problemOf(reason("too-many", "rate_limited")).problem).toBe("too-many")
    expect(problemOf(new Error("x")).problem).toBe("unavailable")
  })
})
