// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, owner } from "@/api/test-helpers"
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

  it("says to mark the visit done first when it is not", async () => {
    const made = await callApi(ctxFor(db, owner), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-11", price: 145 })
    expect(await recordPayment(made.id, { method: "cash" })).toEqual({ ok: false, message: "Mark the visit done first" })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, made.id))).toEqual([])
  })
})
