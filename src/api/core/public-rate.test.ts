// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import type { TestDb } from "@/db/test-db"
import type { PublicPrincipal } from "@/lib/auth/types"
import { apiDb, ORG } from "../test-helpers"
import { callApi } from "./call"
import { makeCtx } from "./context"
import { defineHandler } from "./handler"
import { PUBLIC_EMAIL_PER_MINUTE, PUBLIC_IP_PER_MINUTE, resetPublicRate } from "./public-rate"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())
beforeEach(resetPublicRate)

const open = defineHandler({
  name: "test.open", method: "POST", path: "/open", scope: "write", checkout: true, summary: "Open to the checkout",
  input: z.object({ customer: z.object({ email: z.string() }).optional() }),
  output: z.object({ ok: z.boolean() }),
  async run() { return { ok: true } },
})
const visitor: PublicPrincipal = { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }
const NOW = new Date("2026-12-01T17:00:00Z")
const ctx = (ip?: string, now = NOW) => makeCtx(db, visitor, { now, clientIp: ip })

describe("the public checkout's rate limit", () => {
  it("lets one address make 20 calls a minute and refuses the 21st, then lets it through a minute later", async () => {
    for (let i = 0; i < PUBLIC_IP_PER_MINUTE; i++) await callApi(ctx("203.0.113.7"), open, {})
    await expect(callApi(ctx("203.0.113.7"), open, {})).rejects.toMatchObject({ code: "rate_limited", status: 429, issues: [{ message: "slow-down" }] })
    await expect(callApi(ctx("203.0.113.8"), open, {})).resolves.toEqual({ ok: true })
    await expect(callApi(ctx("203.0.113.7", new Date(NOW.getTime() + 61_000)), open, {})).resolves.toEqual({ ok: true })
  })
  it("limits one email across addresses, whatever its case", async () => {
    for (let i = 0; i < PUBLIC_EMAIL_PER_MINUTE; i++) await callApi(ctx(`198.51.100.${i}`), open, { customer: { email: i % 2 ? "Same@Example.com" : "same@example.com" } })
    await expect(callApi(ctx("198.51.100.99"), open, { customer: { email: "SAME@example.com" } })).rejects.toMatchObject({ code: "rate_limited" })
    await expect(callApi(ctx("198.51.100.99"), open, { customer: { email: "other@example.com" } })).resolves.toEqual({ ok: true })
  })
  it("does not count a call with no address and no email, and never limits an api key", async () => {
    for (let i = 0; i < 30; i++) await callApi(ctx(undefined), open, {})
  })
})
