// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { passesCreate } from "@/api/v1/passes/handlers"
import { apiDb, ctxFor, eventsOf, passJobOf, writeKey } from "@/api/test-helpers"
import { completeSession, stubStripe } from "@/lib/stripe/test-stripe"
import { activatePass, markPassActive } from "./activate"
import { loadPassRecord } from "./record"

let db: TestDb
beforeAll(async () => { db = await apiDb() })
afterAll(() => db.close())

const NOW = new Date("2026-12-01T17:00:00Z")
let n = 0
const pending = (zones = 8) => {
  n++
  return callApi(ctxFor(db, writeKey, "2026-12-01T17:00:00Z"), passesCreate, {
    customer: { firstName: "Race", lastName: "Tester", email: `race${n}@example.com` }, property: { address: `${n} Race St`, town: "Erie" }, zones, consent: { termsAccepted: true },
  })
}

describe("activatePass", () => {
  it("writes one sale when it is called twice at once: one winner, one job.sold, one card.saved", async () => {
    const pass = await pending()
    const { stripe } = stubStripe({ sessions: { cs_race: completeSession("cs_race", { purpose: "pass-setup", passId: pass.id }, { last4: "4242", customer: "cus_race" }) } })
    const results = await Promise.all([activatePass(db, stripe, pass.id, "cs_race", NOW), activatePass(db, stripe, pass.id, "cs_race", NOW)])
    expect([...results].sort()).toEqual(["activated", "already-active"])
    expect(await eventsOf(db, { kind: "job.sold", jobId: pass.id })).toHaveLength(1)
    expect(await eventsOf(db, { kind: "card.saved", customerId: pass.customerId })).toHaveLength(1)
    expect((await passJobOf(db, pass.id)).soldOn).toBe("2026-12-01")
    // a third call, later, changes nothing
    expect(await activatePass(db, stripe, pass.id, "cs_race", NOW)).toBe("already-active")
    expect(await eventsOf(db, { kind: "job.sold", jobId: pass.id })).toHaveLength(1)
  })

  it("takes the pass named by an old pass id in the session's metadata, and the old id as the argument", async () => {
    const pass = await pending()
    // The job is made now with no old id; give it one the way migration 0021 did for a pass made before the move.
    await db.update(s.job).set({ legacyPassId: `old-${pass.id}` }).where(eq(s.job.id, pass.id))
    const { stripe } = stubStripe({ sessions: { cs_old: completeSession("cs_old", { purpose: "pass-setup", passId: `old-${pass.id}` }, { customer: "cus_old" }) } })
    expect(await activatePass(db, stripe, `old-${pass.id}`, "cs_old", NOW)).toBe("activated")
    expect((await passJobOf(db, pass.id)).soldOn).toBe("2026-12-01")
  })

  it("refuses a session that belongs to a different pass, and a cancelled pass", async () => {
    const a = await pending()
    const b = await pending()
    const { stripe } = stubStripe({ sessions: { cs_b: completeSession("cs_b", { purpose: "pass-setup", passId: b.id }) } })
    await expect(activatePass(db, stripe, a.id, "cs_b", NOW)).rejects.toThrow("different pass")
    await db.update(s.job).set({ cancelledAt: NOW }).where(eq(s.job.id, b.id))
    await expect(activatePass(db, stripe, b.id, "cs_b", NOW)).rejects.toThrow("cancelled")
    expect((await passJobOf(db, b.id)).soldOn).toBeNull()
  })
})

describe("markPassActive", () => {
  it("claims the sale once: the second call is the loser and writes nothing", async () => {
    const pass = await pending()
    const record = (await loadPassRecord(db, pass.id))!
    expect(await markPassActive(db, record, null, NOW)).toBe(true)
    expect(await markPassActive(db, record, null, NOW)).toBe(false)
    expect((await passJobOf(db, pass.id)).soldOn).toBe("2026-12-01")
  })
})
