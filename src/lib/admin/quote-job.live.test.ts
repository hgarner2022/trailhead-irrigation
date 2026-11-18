// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { apiDb, ctxFor, owner, writeKey } from "@/api/test-helpers"
import { jobsCreate } from "@/api/v1/jobs/handlers"
import { jobRows, jobsContext } from "@/app/(admin)/admin/_screens/jobs-model"
import { jobTiles, notClosedCount, tileModels } from "@/app/(admin)/admin/_screens/home-model"
import { trayItems } from "@/app/(admin)/admin/_screens/schedule-model"
import { todayView } from "@/app/(admin)/admin/_screens/today-model"
import { getLiveAdminData } from "./live"
import type { AdminData } from "./types"

// A quote asked for online is a job with no visit: the Jobs grid shows it as Needs a quote, and nothing on the Schedule or in
// Home's counts moves, because those read visits.

const NOW = "2027-04-20T15:00:00Z"
const TODAY = "2027-04-20"
let db: TestDb
let before: AdminData
let after: AdminData
let jobId: string

beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  before = await getLiveAdminData(ctxFor(db, owner, NOW))
  const made = await callApi(ctxFor(db, writeKey, NOW), jobsCreate, {
    customer: { firstName: "Dana", lastName: "Quill", email: "dana.quill@example.com", phone: "970-555-0142" },
    property: { address: "12 Cottonwood Way", town: "Erie" },
    serviceKey: "install", notes: "New system for the back yard", needsQuote: true,
  })
  jobId = made.id
  after = await getLiveAdminData(ctxFor(db, owner, NOW))
})
afterAll(() => db.close())

describe("a job that needs a quote, with no visit", () => {
  it("is on the Jobs grid as Needs a quote, from the site, with one unpriced line and a story that says it was asked for online", () => {
    const job = after.jobs!.find((j) => j.id === jobId)!
    expect(job).toMatchObject({ status: "needs-a-quote", source: "site", kind: "install" })
    expect(job.price).toBeUndefined()
    expect(job.lines).toHaveLength(1)
    expect(job.lines![0]).toMatchObject({ name: "New sprinkler system installation", description: "New system for the back yard", unitPrice: 0 })
    expect(job.timeline?.map((e) => e.what)).toEqual(["Quote asked for online"])
    const row = jobRows(after, TODAY).find((r) => r.id === jobId)!
    expect(row).toBeDefined()
    expect(row.stage).toBe("needs-a-quote")
    expect(jobRows(after, TODAY)).toHaveLength(jobRows(before, TODAY).length + 1)
    expect(jobsContext(jobRows(after, TODAY), TODAY)).not.toBe(jobsContext(jobRows(before, TODAY), TODAY))
  })

  it("has no visit, so the Schedule's visits and tray are the same as before", () => {
    expect(after.visits.filter((v) => v.jobId === jobId)).toEqual([])
    expect(after.visits).toEqual(before.visits)
    expect(trayItems(after)).toEqual(trayItems(before))
  })

  it("moves none of Home's counts: its tiles, the days's rows and the not-marked-done count", () => {
    expect(tileModels(after, TODAY)).toEqual(tileModels(before, TODAY))
    expect(jobTiles(after, TODAY)).toEqual(jobTiles(before, TODAY))
    expect(todayView(after, TODAY)).toEqual(todayView(before, TODAY))
    expect(notClosedCount(after.visits, TODAY, "America/Denver")).toBe(notClosedCount(before.visits, TODAY, "America/Denver"))
  })
})
