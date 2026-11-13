// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { apiDb, ctxFor, ORG, owner, readKey } from "@/api/test-helpers"
import { customersUpdate } from "@/api/v1/customers/handlers"
import { visitsMove } from "@/api/v1/visits/handlers"
import { failedChargeVisits } from "./shape"
import { passVisitJob, visitJob } from "./jobs"
import { getLiveAdminData } from "./live"
import type { AdminData } from "./types"

// The job states and the data the admin shows, read through the real API handlers from a seeded database:
// one status set for a visit, derived from the row, with a pending pass never a job and never Active.

const NOW = "2027-04-20T15:00:00Z"
const TODAY = "2027-04-20"
const TZ = "America/Denver"
let db: TestDb
let data: AdminData

const jobsOf = (passId: string) => {
  const pass = data.passes.find((p) => p.id === passId)!
  return Object.fromEntries(pass.visits.map((v) => [v.kind, passVisitJob(pass, v, TODAY, TZ)]))
}

beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  // p4: a day with a start time (Routed). p3: marked done, its charge failed once (Charge failed). p6: done, failed, retried and charged.
  await callApi(ctxFor(db, owner, NOW), visitsMove, { id: "p4-turn-on", truckId: "truck-1", scheduledOn: "2027-05-05", startTime: "09:30" })
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, "p3-turn-on"))
  await db.insert(s.charge).values({ organizationId: ORG, passId: "p3", visitId: "p3-turn-on", attempt: 1, amount: 145, status: "failed", failureMessage: "Card declined" })
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19", chargedAt: new Date("2027-04-20T09:00:00Z") }).where(eq(s.visit.id, "p6-turn-on"))
  await db.insert(s.charge).values([
    { organizationId: ORG, passId: "p6", visitId: "p6-turn-on", attempt: 1, amount: 145, status: "failed" },
    { organizationId: ORG, passId: "p6", visitId: "p6-turn-on", attempt: 2, amount: 145, status: "succeeded" },
  ])
  // p7: a day that has passed and nobody marked done (Scheduled, with the Not closed flag).
  await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-04-15", startTime: null, truckId: "truck-1" }).where(eq(s.visit.id, "p7-turn-on"))
  // p8: a pass whose card failed after a visit was marked done, and the card never retried.
  await db.update(s.seasonPass).set({ cardFailedAt: new Date("2027-04-19T10:00:00Z") }).where(eq(s.seasonPass.id, "p8"))
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-18", chargedAt: null }).where(eq(s.visit.id, "p8-turn-on"))
  await callApi(ctxFor(db, owner, NOW), customersUpdate, { id: "c121", lastName: "garner" })
  data = await getLiveAdminData(ctxFor(db, owner, NOW))
})
afterAll(() => db.close())

describe("the job states, read from the rows", () => {
  it("reads Needs a day for an unscheduled visit and Scheduled for a day with no start time", () => {
    expect(jobsOf("p3").inspection).toEqual({ state: "needs-a-day", notClosed: false })
    const withDay = data.passes.flatMap((p) => p.visits.map((v) => ({ p, v }))).find(({ v }) => v.scheduledOn && !v.startTime && !v.completedAt)!
    expect(passVisitJob(withDay.p, withDay.v, "2027-01-01", TZ)).toMatchObject({ state: "scheduled", notClosed: false })
  })

  it("reads Routed once a start time is set", () => {
    expect(jobsOf("p4")["turn-on"]).toMatchObject({ state: "routed", notClosed: false })
    expect(data.passes.find((p) => p.id === "p4")!.visits[0]).toMatchObject({ scheduledOn: "2027-05-05", startTime: "09:30" })
  })

  it("reads Charged for a visit with a charge, and Done for one marked done and not charged", () => {
    expect(jobsOf("p1")["turn-on"].state).toBe("charged")
    const done = { ...data.passes.find((p) => p.id === "p2")!, cardFailedAt: undefined }
    expect(passVisitJob(done, { ...done.visits[1], completedAt: "2027-04-19T17:00:00Z" }, TODAY, TZ).state).toBe("done")
  })

  it("reads Charge failed from a failed charge row, and again from the pass's failed card on a done job", () => {
    expect(jobsOf("p3")["turn-on"].state).toBe("charge-failed")
    expect(jobsOf("p8")["turn-on"].state).toBe("charge-failed")
    // A retry that went through clears the failure: the newest attempt decides.
    expect(jobsOf("p6")["turn-on"].state).toBe("charged")
    expect(failedChargeVisits([{ visitId: "v", attempt: 1, status: "failed" }, { visitId: "v", attempt: 2, status: "succeeded" }, { visitId: "w", attempt: 1, status: "failed" }])).toEqual(["w"])
  })

  it("flags Not closed on a Scheduled job whose day has passed, as a badge and not a state", () => {
    expect(jobsOf("p7")["turn-on"]).toMatchObject({ state: "scheduled", notClosed: true })
    const visit = data.visits.find((v) => v.id === "p7-turn-on")!
    expect(visitJob(visit, TODAY, TZ)).toMatchObject({ state: "scheduled", notClosed: true })
    // Another day ahead is not flagged.
    expect(visitJob(visit, "2027-04-10", TZ)).toMatchObject({ state: "scheduled", notClosed: false })
  })

  it("reads the same state from the calendar visit row and from the pass's own visit", () => {
    for (const id of ["p3", "p4", "p7", "p8"]) {
      const pass = data.passes.find((p) => p.id === id)!
      for (const pv of pass.visits) {
        const row = data.visits.find((v) => v.id === pv.id)!
        expect(visitJob(row, TODAY, TZ, pass.cardFailedAt).state, `${id} ${pv.kind}`).toBe(passVisitJob(pass, pv, TODAY, TZ).state)
      }
    }
  })
})

describe("a pending pass", () => {
  it("is Pending, never Active", () => {
    const pending = data.passes.filter((p) => p.status === "pending")
    expect(pending.map((p) => p.id)).toEqual(["p13"])
    expect(data.passes.filter((p) => p.status === "active").some((p) => p.id === "p13")).toBe(false)
  })

  it("has no job anywhere on the calendar's data", () => {
    expect(data.visits.some((v) => v.passId === "p13" || v.id.startsWith("p13-"))).toBe(false)
    expect(data.passes.find((p) => p.id === "p13")!.visits.length).toBe(2)
  })
})

describe("the customer record the admin reads", () => {
  it("carries the full name on the client and the pass", () => {
    expect(data.clients.find((c) => c.id === "c121")).toMatchObject({ firstName: "Reese", lastName: "Garner" })
    expect(data.passes.find((p) => p.clientId === "c121")).toMatchObject({ firstName: "Reese", lastName: "Garner" })
    expect(data.visits.find((v) => v.clientId === "c121" && v.isPass)?.clientName).toBe("Reese Garner")
  })

  it("carries the street and the consent history for the admin session", () => {
    const andrea = data.clients.find((c) => c.id === "c100")!
    expect(andrea.address).toBeTruthy()
    expect(andrea.consentHistory?.length).toBeGreaterThan(0)
  })

  it("leaves the contact fields out for a read key, and keeps the name", async () => {
    const read = await getLiveAdminData(ctxFor(db, readKey, NOW))
    const reese = read.clients.find((c) => c.id === "c121")!
    expect(reese.lastName).toBe("Garner")
    expect(reese).not.toHaveProperty("email")
    expect(reese).not.toHaveProperty("phone")
    expect(reese).not.toHaveProperty("address")
    expect(JSON.stringify(read.clients)).not.toContain("@")
  })
})
