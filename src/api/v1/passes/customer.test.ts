// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { drain } from "@/lib/queue"
import { handlers as queueHandlers } from "@/lib/queue/handlers"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, ORG, readKey } from "../../test-helpers"
import { passesCancel, passesList, passesStartCardUpdate } from "./handlers"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
})
afterAll(() => db.close())

const customerOf = async (passId: string) => (await db.select({ id: s.seasonPass.customerId }).from(s.seasonPass).where(eq(s.seasonPass.id, passId)))[0]!.id
const setEmail = async (passId: string, email: string) => {
  const id = await customerOf(passId)
  await db.update(s.customer).set({ email }).where(eq(s.customer.id, id))
  return id
}
const statusOf = async (passId: string) => (await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, passId)))[0]!.status

describe("passes.cancel for a customer", () => {
  it("refuses a customer whose email is not the pass's, even with the right customer id, and lets an admin through", async () => {
    const id = await setEmail("p4", "owner-of-p4@example.com")
    await expect(callApi(ctxFor(db, customerPerson(id, "someone-else@example.com")), passesCancel, { id: "p4" })).rejects.toMatchObject({ code: "forbidden" })
    expect(await statusOf("p4")).not.toBe("cancelled")
    await expect(callApi(ctxFor(db, customerPerson("c-other", "owner-of-p4@example.com")), passesCancel, { id: "p4" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, readKey), passesCancel, { id: "p4" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, adminKey), passesCancel, { id: "p4" })).resolves.toMatchObject({ status: "cancelled" })
  })

  it("queues the routine's task, the cancelled email and the event; the task raises one Home alert", async () => {
    const id = await setEmail("p5", "p5@example.com")
    await db.insert(s.webhookEndpoint).values({ id: "hook-c", organizationId: ORG, url: "https://hooks.example.com/c", secret: "whsec_c", events: ["pass.cancelled"] })
    await expect(callApi(ctxFor(db, customerPerson(id, "P5@Example.com")), passesCancel, { id: "p5", reason: "moving" })).resolves.toMatchObject({ status: "cancelled" })
    expect(await statusOf("p5")).toBe("cancelled")
    const queued = (await db.select().from(s.queueItem)).filter((q) => q.kind === "pass-cancel" && q.key === "p5")
    expect(queued).toHaveLength(1)
    const mail = (await db.select().from(s.messageLog)).filter((m) => m.kind === "cancelled" && m.customerId === id)
    expect(mail).toHaveLength(1)
    expect(mail[0]).toMatchObject({ to: "p5@example.com", status: "queued" })
    expect((await db.select().from(s.outboundEvent)).map((e) => e.event)).toContain("pass.cancelled")
    // a second cancel changes nothing
    await callApi(ctxFor(db, adminKey), passesCancel, { id: "p5" })
    expect((await db.select().from(s.queueItem)).filter((q) => q.kind === "pass-cancel" && q.key === "p5")).toHaveLength(1)
    await drain(db, { "pass-cancel": queueHandlers["pass-cancel"]! })
    const alerts = (await db.select().from(s.adminAlert)).filter((a) => a.passId === "p5")
    expect(alerts.map((a) => a.kind)).toEqual(["pass-cancelled"])
    expect(alerts[0]!.message).toMatch(/^Season Pass TH-2027-\d{4} cancelled: .+, .+$/)
  })
})

describe("passes.list as a customer", () => {
  it("returns only the caller's own passes", async () => {
    const id = await customerOf("p3")
    const out = await callApi(ctxFor(db, customerPerson(id)), passesList, {})
    expect(out.data.map((p) => p.id)).toContain("p3")
    expect(out.data.every((p) => p.customerId === id)).toBe(true)
  })
})

describe("passes.startCardUpdate", () => {
  it("returns Stripe's hosted URL for the customer's own pass and refuses another's", async () => {
    const create = vi.fn().mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" })
    getStripe.mockReturnValue({ checkout: { sessions: { create } } })
    const id = await customerOf("p3")
    await db.update(s.customer).set({ stripeCustomerId: "cus_p3" }).where(eq(s.customer.id, id))
    await expect(callApi(ctxFor(db, customerPerson(id)), passesStartCardUpdate, { id: "p3" })).resolves.toEqual({ url: "https://checkout.stripe.test/cs_1" })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_p3", metadata: { purpose: "card-update", passId: "p3" } }))
    await expect(callApi(ctxFor(db, customerPerson("someone-else")), passesStartCardUpdate, { id: "p3" })).rejects.toMatchObject({ code: "forbidden" })
  })
})
