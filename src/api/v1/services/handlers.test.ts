// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { servicesCreate, servicesDeactivate, servicesList, servicesUpdate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

const input = { key: "drip-check", name: "Drip check", kind: "other", slotMinutes: 60, price: 95 }

describe("services", () => {
  it("lists the seeded services with the site's prices and filters by bookable", async () => {
    const all = await callApi(ctxFor(db, readKey), servicesList, {})
    expect(all.data.find((s) => s.key === "turn-on-8")).toMatchObject({ price: 145, includedZones: 8, slotMinutes: 60 })
    expect(all.data.find((s) => s.key === "blowout")).toMatchObject({ price: 95, includedZones: 6 })
    const bookable = await callApi(ctxFor(db, readKey), servicesList, { bookable: "true" })
    expect(bookable.data.every((s) => s.bookable)).toBe(true)
    expect(bookable.data.length).toBeLessThan(all.data.length)
  })
  it("carries what the visit includes, with no price in it, and the office can change the text", async () => {
    const all = await callApi(ctxFor(db, readKey), servicesList, {})
    const turnOn = all.data.find((s) => s.key === "turn-on-8")!
    expect(turnOn.description).toContain("controller programming")
    expect(turnOn.description).not.toContain("$")
    expect(turnOn).toMatchObject({ taxable: false, active: true })
    expect(all.data.every((s) => typeof s.description === "string" && s.description.length > 0)).toBe(true)
    const changed = await callApi(ctxFor(db, adminKey), servicesUpdate, { id: turnOn.id, description: "A spring start." })
    expect(changed.description).toBe("A spring start.")
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: turnOn.id, description: turnOn.description! })
  })
  it("updates one field without resetting bookable and quoteOnly to their defaults", async () => {
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "quoted-only", bookable: false, quoteOnly: true })
    expect(made).toMatchObject({ bookable: false, quoteOnly: true })
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, description: "Quoted first." })).toMatchObject({ bookable: false, quoteOnly: true, description: "Quoted first." })
  })
  it("deactivating stops booking and listing as active; the default list keeps the service", async () => {
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "retired" })
    expect(await callApi(ctxFor(db, adminKey), servicesDeactivate, { id: made.id })).toMatchObject({ active: false, bookable: false })
    const active = await callApi(ctxFor(db, readKey), servicesList, { active: "true" })
    expect(active.data.some((s) => s.id === made.id)).toBe(false)
    expect(active.data.every((s) => s.active)).toBe(true)
    const all = await callApi(ctxFor(db, readKey), servicesList, {})
    expect(all.data.some((s) => s.id === made.id)).toBe(true)
    const inactive = await callApi(ctxFor(db, readKey), servicesList, { active: "false" })
    expect(inactive.data.map((s) => s.id)).toContain(made.id)
  })
  it("needs the admin scope to change anything", async () => {
    await expect(callApi(ctxFor(db, writeKey), servicesCreate, input)).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), servicesDeactivate, { id: "x" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("creates, refuses a repeated key, updates and deactivates", async () => {
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, input)
    expect(made).toMatchObject({ key: "drip-check", bookable: true, quoteOnly: false })
    await expect(callApi(ctxFor(db, adminKey), servicesCreate, input)).rejects.toMatchObject({ code: "conflict" })
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, price: 105, slotMinutes: 75 })).toMatchObject({ price: 105, slotMinutes: 75, key: "drip-check" })
    expect(await callApi(ctxFor(db, adminKey), servicesDeactivate, { id: made.id })).toMatchObject({ bookable: false })
  })
  it("rejects a bad key, price and slot length", async () => {
    await expect(callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "Bad Key" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "neg", price: -5 })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "odd", slotMinutes: 50 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("honours an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, adminKey), idempotencyKey: "svc-1" }
    const a = await callApi(ctx, servicesCreate, { ...input, key: "once-only" })
    expect((await callApi(ctx, servicesCreate, { ...input, key: "once-only" })).id).toBe(a.id)
  })
})
