// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { areasCreate, areasDelete, areasList, areasUpdate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("areas", () => {
  it("lists the seeded groups", async () => {
    const out = await callApi(ctxFor(db, readKey), areasList, {})
    expect(out.data.map((a) => a.id).sort()).toEqual(["area-longmont", "area-north", "area-south"])
  })
  it("needs the admin scope", async () => {
    await expect(callApi(ctxFor(db, writeKey), areasCreate, { name: "X", towns: ["Erie"] })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), areasDelete, { id: "area-north" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("keeps a town in one group", async () => {
    await expect(callApi(ctxFor(db, adminKey), areasCreate, { name: "Dup", towns: ["Erie"] })).rejects.toMatchObject({ code: "conflict" })
    await expect(callApi(ctxFor(db, adminKey), areasUpdate, { id: "area-longmont", towns: ["Longmont", "Erie"] })).rejects.toMatchObject({ code: "conflict" })
    await expect(callApi(ctxFor(db, adminKey), areasUpdate, { id: "area-north", towns: ["Erie", "Firestone"], name: "North" })).resolves.toMatchObject({ name: "North" })
  })
  it("moves a town between groups, then deletes a group", async () => {
    await callApi(ctxFor(db, adminKey), areasUpdate, { id: "area-south", towns: ["Louisville", "Lafayette"] })
    const made = await callApi(ctxFor(db, adminKey), areasCreate, { name: "Broomfield", towns: ["Broomfield"], fallOrder: 3 })
    expect(made).toMatchObject({ towns: ["Broomfield"], fallOrder: 3, springOrder: 0 })
    expect(await callApi(ctxFor(db, adminKey), areasDelete, { id: made.id })).toEqual({ ok: true })
    await expect(callApi(ctxFor(db, adminKey), areasDelete, { id: made.id })).rejects.toMatchObject({ code: "not_found" })
  })
  it("rejects a bad town and an empty group", async () => {
    await expect(callApi(ctxFor(db, adminKey), areasCreate, { name: "X", towns: ["Denver"] })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), areasCreate, { name: "X", towns: [] })).rejects.toMatchObject({ code: "invalid" })
  })
  it("honours an Idempotency-Key", async () => {
    await callApi(ctxFor(db, adminKey), areasUpdate, { id: "area-south", towns: ["Louisville"] })
    const ctx = { ...ctxFor(db, adminKey), idempotencyKey: "area-1" }
    const a = await callApi(ctx, areasCreate, { name: "Lafayette", towns: ["Lafayette"] })
    expect((await callApi(ctx, areasCreate, { name: "Lafayette", towns: ["Lafayette"] })).id).toBe(a.id)
  })
})
