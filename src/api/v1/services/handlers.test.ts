// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
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
  it("carries what the visit includes, with no price in it, and the office can change or clear the text", async () => {
    const all = await callApi(ctxFor(db, readKey), servicesList, {})
    const turnOn = all.data.find((s) => s.key === "turn-on-8")!
    expect(turnOn.description).toContain("controller programming")
    expect(turnOn.description).not.toContain("$")
    expect(turnOn).toMatchObject({ taxable: false, active: true })
    expect(all.data.every((s) => typeof s.description === "string" && s.description.length > 0)).toBe(true)
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "described", description: "A look at the drip line." })
    expect(made.description).toBe("A look at the drip line.")
    expect((await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, description: "  Every emitter checked.  " })).description).toBe("Every emitter checked.")
    expect((await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, description: null })).description).toBeNull()
    await expect(callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, description: "$145 visit" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, description: "   " })).rejects.toMatchObject({ code: "invalid" })
  })
  it("sets taxable and active, and a PATCH with nothing in it leaves the row alone", async () => {
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "taxed" })
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, taxable: true, active: false })).toMatchObject({ taxable: true, active: false })
    const row = () => db.select({ taxable: s.service.taxable, active: s.service.active, updatedAt: s.service.updatedAt }).from(s.service).where(eq(s.service.id, made.id))
    const before = await row()
    expect(before[0]).toMatchObject({ taxable: true, active: false })
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id })).toMatchObject({ taxable: true, active: false })
    expect(await row()).toEqual(before)
  })
  it("setting active false also closes online booking; reactivating leaves bookable as it is", async () => {
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "went-off" })
    expect(made.bookable).toBe(true)
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, active: false })).toMatchObject({ active: false, bookable: false })
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, active: true })).toMatchObject({ active: true, bookable: false })
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
  it("takes the dates a service may be booked in, as month and day, clears them with null, and refuses a day that does not exist", async () => {
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "dated" })
    expect(made).toMatchObject({ bookableFrom: null, bookableTo: null })
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, bookableFrom: "04-15", bookableTo: "06-15" })).toMatchObject({ bookableFrom: "04-15", bookableTo: "06-15" })
    // a field left out keeps its value; null clears it
    expect(await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, bookableTo: null })).toMatchObject({ bookableFrom: "04-15", bookableTo: null })
    for (const bad of ["04-31", "13-01", "April 15", "2027-04-15"]) await expect(callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, bookableFrom: bad })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), servicesUpdate, { id: made.id, bookableFrom: "05-01" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("writes a change log row per changed field, in the screen's words, by the caller", async () => {
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "logged", name: "Logged check" })
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, price: 105, bookableFrom: "09-28", quoteOnly: true, bookable: false })
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, price: 105 })
    const rows = await db.select().from(s.settingsChange).where(eq(s.settingsChange.organizationId, ORG))
    const mine = rows.filter((r) => r.field.startsWith("Logged check ")).map((r) => [r.field, r.fromValue, r.toValue])
    expect(mine).toEqual(expect.arrayContaining([["Logged check price", "$95", "$105"], ["Logged check bookable from", "All year", "09-28"], ["Logged check online", "Book a day", "We quote"]]))
    expect(mine.filter(([f]) => f === "Logged check price")).toHaveLength(1)
  })
  it("mirrors a seasonal service's dates into settings.windows for its kind, keeps the window's year and logs only the service's lines", async () => {
    const windows = async () => (await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ORG)))[0]!.settings.windows
    const was = (await windows()).find((w) => w.kind === "blowout")!
    const year = Number(was.opensOn.slice(0, 4))
    const others = (await windows()).filter((w) => w.kind !== "blowout")
    const blowout = (await callApi(ctxFor(db, adminKey), servicesList, {})).data.find((x) => x.key === "blowout")!
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: blowout.id, bookableFrom: "10-05", bookableTo: "11-20" })
    const now = (await windows()).find((w) => w.kind === "blowout")!
    expect(now).toEqual({ ...was, opensOn: `${year}-10-05`, closesOn: `${year}-11-20` })
    expect((await windows()).filter((w) => w.kind !== "blowout")).toEqual(others)
    // a span that wraps New Year closes the next year; a missing end is open to December 31
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: blowout.id, bookableFrom: "11-01", bookableTo: "03-15" })
    expect((await windows()).find((w) => w.kind === "blowout")).toMatchObject({ opensOn: `${year}-11-01`, closesOn: `${year + 1}-03-15` })
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: blowout.id, bookableFrom: "10-01", bookableTo: null })
    expect((await windows()).find((w) => w.kind === "blowout")).toMatchObject({ opensOn: `${year}-10-01`, closesOn: `${year}-12-31` })
    // an edit that leaves the dates out does not touch the window
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: blowout.id, price: 95 })
    expect((await windows()).find((w) => w.kind === "blowout")).toMatchObject({ opensOn: `${year}-10-01`, closesOn: `${year}-12-31` })
    const rows = await db.select().from(s.settingsChange).where(eq(s.settingsChange.organizationId, ORG))
    expect(rows.some((r) => r.field.startsWith("windows."))).toBe(false)
    expect(rows.filter((r) => r.field === `${blowout.name} bookable from`).length).toBeGreaterThan(0)
  })
  it("leaves the windows alone for a service that is not seasonal", async () => {
    const before = (await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ORG)))[0]!.settings.windows
    const made = await callApi(ctxFor(db, adminKey), servicesCreate, { ...input, key: "no-window" })
    await callApi(ctxFor(db, adminKey), servicesUpdate, { id: made.id, bookableFrom: "02-01", bookableTo: "02-20" })
    expect((await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ORG)))[0]!.settings.windows).toEqual(before)
  })
  it("honours an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, adminKey), idempotencyKey: "svc-1" }
    const a = await callApi(ctx, servicesCreate, { ...input, key: "once-only" })
    expect((await callApi(ctx, servicesCreate, { ...input, key: "once-only" })).id).toBe(a.id)
  })
})
