// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, ORG, owner } from "@/api/test-helpers"
import { callApi } from "@/api/core/call"
import { visitsCreate } from "@/api/v1/visits/office"

const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }))
vi.mock("@/lib/auth/guard", () => ({ requireAdmin: async () => owner }))
vi.mock("@/lib/admin/api-ctx", async () => {
  const { ctxFor } = await import("@/api/test-helpers")
  return { ctxFromSession: async () => ctxFor(state.db as never, owner) }
})
// The real callApi, watched: the Done-and-owed form must go through payments.record.
vi.mock("@/api/core/call", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/api/core/call")>()
  return { ...real, callApi: vi.fn(real.callApi) }
})

import { recordPayment } from "./visit-actions"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  state.db = db
})
afterAll(() => {
  vi.unstubAllEnvs()
  db.close()
})

const handlers = () => vi.mocked(callApi).mock.calls.map(([, handler]) => (handler as { name: string }).name)

describe("Record the payment on a done and owed visit", () => {
  it("posts payments.record with the visit's job and what the visit costs, and the row names the day and the way it came", async () => {
    const made = await callApi(ctxFor(db, owner), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-10", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))
    vi.mocked(callApi).mockClear()

    expect(await recordPayment(made.id, { method: "venmo", reference: "@dana" })).toEqual({ ok: true, data: undefined })
    expect(handlers()).toContain("payments.record")
    expect(handlers()).not.toContain("visits.recordPayment")
    const rows = await db.select().from(s.charge).where(eq(s.charge.visitId, made.id))
    expect(rows).toMatchObject([{ jobId: made.jobId, amount: 145, method: "venmo", reference: "@dana", status: "succeeded" }])
  })

  it("posts only once on a double submit or a stale panel: the second says the visit is paid and writes nothing", async () => {
    const made = await callApi(ctxFor(db, owner), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-12", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))
    expect(await recordPayment(made.id, { method: "check" })).toEqual({ ok: true, data: undefined })
    expect(await recordPayment(made.id, { method: "check" })).toEqual({ ok: false, message: "This visit is already paid" })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, made.id))).toHaveLength(1)
  })

  it("records what is still owed on a part-paid visit, not the whole price again", async () => {
    const made = await callApi(ctxFor(db, owner), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-13", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))
    await db.insert(s.charge).values({ organizationId: ORG, jobId: made.jobId, visitId: made.id, customerId: "c100", attempt: 1, amount: 100, status: "succeeded", method: "cash", paidOn: "2027-04-19" })
    expect(await recordPayment(made.id, { method: "venmo" })).toEqual({ ok: true, data: undefined })
    const rows = await db.select().from(s.charge).where(eq(s.charge.visitId, made.id))
    expect(rows.map((r) => r.amount).sort()).toEqual([100, 45])
  })

  it("records the money for a pass visit whose customer has a card on file too, so a done visit is never stuck owed", async () => {
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, "p3-turn-on"))
    expect(await recordPayment("p3-turn-on", { method: "cash" })).toMatchObject({ ok: true })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, "p3-turn-on"))).toMatchObject([{ method: "cash", status: "succeeded" }])
  })

  it("says to mark the visit done first when it is not", async () => {
    const made = await callApi(ctxFor(db, owner), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-11", price: 145 })
    expect(await recordPayment(made.id, { method: "cash" })).toEqual({ ok: false, message: "Mark the visit done first" })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, made.id))).toEqual([])
  })
})
