// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { visitsLinkRequest, visitsList } from "../visits/handlers"
import { mirrorUpsert } from "./handlers"

let db: TestDb
beforeAll(async () => { db = await apiDb() })
afterAll(() => db.close())

const batch = {
  clients: [{ id: "jc-1", firstName: "Dana", town: "Erie", jobberUrl: "https://secure.getjobber.com/clients/1" }],
  jobs: [{ id: "jj-1", clientId: "jc-1", title: "Sprinkler repair", status: "open", hasVisit: false, total: 290 }],
  visits: [{ id: "jv-1", jobId: "jj-1", clientId: "jc-1", kind: "repair", town: "Erie", startAt: "2027-05-06T15:00:00Z", endAt: "2027-05-06T17:00:00Z" }],
  quotes: [{ id: "jq-1", clientName: "Dana", total: 1800, sentAt: "2027-04-01T12:00:00Z", status: "awaiting" }],
  invoices: [{ id: "ji-1", clientName: "Dana", total: 290, issuedAt: "2027-04-02T12:00:00Z", dueAt: "2027-04-16T12:00:00Z", status: "unpaid" }],
}

describe("mirror.upsert", () => {
  it("writes the five record kinds and counts them", async () => {
    expect(await callApi(ctxFor(db, writeKey), mirrorUpsert, batch)).toEqual({ clients: 1, jobs: 1, visits: 1, quotes: 1, invoices: 1 })
    expect((await db.select().from(s.jobberJob).where(eq(s.jobberJob.id, "jj-1")))[0]).toMatchObject({ title: "Sprinkler repair", hasVisit: false, total: 290 })
    expect((await db.select().from(s.jobberVisit).where(eq(s.jobberVisit.id, "jv-1")))[0]!.startAt!.toISOString()).toBe("2027-05-06T15:00:00.000Z")
  })
  it("updates in place when the same id comes again, keeping fields it does not send", async () => {
    await callApi(ctxFor(db, writeKey), mirrorUpsert, { jobs: [{ id: "jj-1", status: "closed", hasVisit: true }] })
    const rows = await db.select().from(s.jobberJob).where(eq(s.jobberJob.id, "jj-1"))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: "closed", hasVisit: true, title: "Sprinkler repair" })
  })
  it("refuses calendar-feed ids, needs the write scope, and never steals another organization's row", async () => {
    await expect(callApi(ctxFor(db, writeKey), mirrorUpsert, { visits: [{ id: "feed:truck-1:x" }] })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, readKey), mirrorUpsert, batch)).rejects.toMatchObject({ code: "forbidden" })
    await db.insert(s.organization).values({ id: "org_other", name: "Other", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] }, termsVersion: "x" })
    await db.insert(s.jobberJob).values({ id: "jj-other", organizationId: "org_other", title: "Theirs" })
    await callApi(ctxFor(db, writeKey), mirrorUpsert, { jobs: [{ id: "jj-other", title: "Mine now" }] })
    expect((await db.select().from(s.jobberJob).where(eq(s.jobberJob.id, "jj-other")))[0]).toMatchObject({ organizationId: "org_other", title: "Theirs" })
  })
})

describe("visits.linkRequest", () => {
  it("records the Jobber request so the routine skips the visit next time", async () => {
    const before = await callApi(ctxFor(db, readKey), visitsList, { limit: 100 })
    expect(before.data.find((v) => v.id === "p1-turn-on")!.jobberRequestUrl).toBeNull()
    const out = await callApi(ctxFor(db, writeKey), visitsLinkRequest, { id: "p1-turn-on", url: "https://secure.getjobber.com/requests/55" })
    expect(out.jobberRequestUrl).toBe("https://secure.getjobber.com/requests/55")
    await expect(callApi(ctxFor(db, readKey), visitsLinkRequest, { id: "p1-turn-on", url: "https://x.test/r" })).rejects.toMatchObject({ code: "forbidden" })
  })
})
