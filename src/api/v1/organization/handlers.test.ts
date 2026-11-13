// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG, readKey } from "../../test-helpers"
import { organizationGet } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("organization.get", () => {
  it("summarises the organization and says the Jobber mirror is not connected yet", async () => {
    const out = await callApi(ctxFor(db, readKey), organizationGet, {})
    expect(out).toMatchObject({ id: ORG, termsVersion: "2026-11", settings: { trucks: 2, areas: 3 }, jobber: { connected: false, lastSyncAt: null, lastSyncStatus: null } })
    expect(out.settings.windows).toHaveLength(3)
  })
  it("reports a stored token and the last sync", async () => {
    await db.insert(s.jobberToken).values({ organizationId: ORG, accessToken: "secret-access", refreshToken: "secret-refresh", expiresAt: new Date() })
    await db.insert(s.syncRun).values({ organizationId: ORG, kind: "mirror", status: "ok", finishedAt: new Date("2027-04-20T10:00:00Z") })
    const out = await callApi(ctxFor(db, readKey), organizationGet, {})
    expect(out.jobber).toEqual({ connected: true, lastSyncAt: "2027-04-20T10:00:00.000Z", lastSyncStatus: "ok" })
    expect(JSON.stringify(out)).not.toContain("secret")
  })
})
