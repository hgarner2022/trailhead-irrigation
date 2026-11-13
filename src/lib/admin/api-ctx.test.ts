// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { passesCancel, passesList } from "@/api/v1/passes/handlers"
import { apiDb, ORG, owner, tech } from "@/api/test-helpers"
import { ctxForJob, ctxFromSession } from "./api-ctx"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

const deps = (principal: typeof owner | null) => ({ database: () => db, getSession: async () => principal })

describe("ctxFromSession", () => {
  it("builds the context from the signed-in person and their organization", async () => {
    const ctx = await ctxFromSession(deps(owner))
    expect(ctx).toMatchObject({ organizationId: ORG, principal: { kind: "person", email: owner.email } })
    const out = await callApi(ctx, passesList, { limit: 2 })
    expect(out.data).toHaveLength(2)
  })
  it("refuses when nobody is signed in", async () => {
    await expect(ctxFromSession(deps(null))).rejects.toMatchObject({ code: "unauthorized" })
  })
  it("carries the person's scopes: a tech reads but cannot cancel", async () => {
    const ctx = await ctxFromSession(deps(tech))
    await expect(callApi(ctx, passesList, {})).resolves.toBeDefined()
    await expect(callApi(ctx, passesCancel, { id: "p5" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("logs each call under the person", async () => {
    await callApi(await ctxFromSession(deps(owner)), passesList, {})
    const rows = await db.select().from(s.apiCall).where(eq(s.apiCall.principalId, owner.id))
    expect(rows.at(-1)).toMatchObject({ principalKind: "person", path: "/passes", status: 200 })
  })
})

describe("ctxForJob", () => {
  it("is a system principal with every scope, logged as system", async () => {
    const ctx = await ctxForJob(ORG, deps(null))
    expect(ctx.principal).toMatchObject({ kind: "api-key", id: "system", scopes: ["read", "write", "admin"] })
    await expect(callApi(ctx, passesCancel, { id: "p6" })).resolves.toMatchObject({ status: "cancelled" })
    const rows = await db.select().from(s.apiCall).where(eq(s.apiCall.principalId, "system"))
    expect(rows.at(-1)).toMatchObject({ path: "/passes/{id}/cancel", status: 200 })
  })
  it("is never rate limited", async () => {
    await db.insert(s.apiCall).values(Array.from({ length: 130 }, () => ({ organizationId: ORG, principalKind: "api-key" as const, principalId: "system", method: "GET", path: "/x", status: 200 })))
    await expect(callApi(await ctxForJob(ORG, deps(null)), passesList, {})).resolves.toBeDefined()
  })
})
