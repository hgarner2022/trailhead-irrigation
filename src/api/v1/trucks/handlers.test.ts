// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { trucksCreate, trucksDeactivate, trucksList, trucksUpdate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

const capacity = { "turn-on": 6, inspection: 5, blowout: 10, repair: 4, other: 2 }

describe("trucks", () => {
  it("lists the seeded trucks for a read key", async () => {
    const out = await callApi(ctxFor(db, readKey), trucksList, {})
    expect(out.data.map((t) => t.name)).toEqual(["Truck 1", "Truck 2"])
    expect(out.data[1]!.workingDays).toContain("sat")
  })
  it("needs the admin scope to change anything", async () => {
    await expect(callApi(ctxFor(db, writeKey), trucksCreate, { name: "T3", workingDays: ["mon"], capacityByKind: capacity })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), trucksUpdate, { id: "truck-1", name: "X" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), trucksDeactivate, { id: "truck-1" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("creates, updates and deactivates", async () => {
    const made = await callApi(ctxFor(db, adminKey), trucksCreate, { name: "Truck 3", workingDays: ["mon", "tue"], capacityByKind: capacity })
    expect(made).toMatchObject({ name: "Truck 3", active: true, jobberUserId: null })
    expect(await callApi(ctxFor(db, adminKey), trucksUpdate, { id: made.id, workingDays: ["wed"] })).toMatchObject({ name: "Truck 3", workingDays: ["wed"] })
    expect(await callApi(ctxFor(db, adminKey), trucksDeactivate, { id: made.id })).toMatchObject({ active: false })
    await expect(callApi(ctxFor(db, adminKey), trucksUpdate, { id: "missing", name: "x" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("rejects bad input", async () => {
    await expect(callApi(ctxFor(db, adminKey), trucksCreate, { name: "", workingDays: ["mon"], capacityByKind: capacity })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), trucksCreate, { name: "T", workingDays: ["funday"], capacityByKind: capacity })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), trucksCreate, { name: "T", workingDays: [], capacityByKind: capacity })).rejects.toMatchObject({ code: "invalid" })
  })
  it("honours an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, adminKey), idempotencyKey: "truck-1" }
    const a = await callApi(ctx, trucksCreate, { name: "Once", workingDays: ["fri"], capacityByKind: capacity })
    expect((await callApi(ctx, trucksCreate, { name: "Once", workingDays: ["fri"], capacityByKind: capacity })).id).toBe(a.id)
  })
})
