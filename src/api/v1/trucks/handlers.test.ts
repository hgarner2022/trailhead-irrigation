// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { peopleList } from "../people/handlers"
import { trucksCreate, trucksDeactivate, trucksList, trucksUpdate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

const capacity = { "turn-on": 6, inspection: 5, blowout: 10, repair: 4, other: 2 }
const seeded = async () => (await callApi(ctxFor(db, readKey), trucksList, {})).data

describe("trucks (an alias of people with a truck, kept for one season)", () => {
  it("lists the people who have a truck for a read key, by name, under the person ids visits carry", async () => {
    const out = await seeded()
    expect(out.map((t) => t.name)).toEqual(["Ryan Garner", "Second truck"])
    expect(out.map((t) => t.id)).toEqual(["person_truck-1", "person_truck-2"])
    expect(out[0]).toMatchObject({ jobberUserId: "jobber-user-1", hasCalendarFeed: false, active: true, workingDays: ["mon", "tue", "wed", "thu", "fri"] })
    expect(out[1]!.workingDays).toContain("sat")
    expect(Object.keys(out[0]!).sort()).toEqual(["active", "capacityByKind", "hasCalendarFeed", "id", "jobberUserId", "name", "workingDays"])
  })
  it("needs the admin scope to change anything", async () => {
    const [first] = await seeded()
    await expect(callApi(ctxFor(db, writeKey), trucksCreate, { name: "T3", workingDays: ["mon"], capacityByKind: capacity })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), trucksUpdate, { id: first!.id, name: "X" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), trucksDeactivate, { id: first!.id })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("creates, updates and deactivates the same rows people.* sees", async () => {
    const made = await callApi(ctxFor(db, adminKey), trucksCreate, { name: "Truck 3", workingDays: ["mon", "tue"], capacityByKind: capacity })
    expect(made).toMatchObject({ name: "Truck 3", active: true, jobberUserId: null })
    const person = (await callApi(ctxFor(db, readKey), peopleList, {})).data.find((p) => p.id === made.id)
    expect(person).toMatchObject({ name: "Truck 3", truck: "Truck 3", role: "tech", initials: "T3", canSignIn: false, workingDays: ["mon", "tue"] })
    expect(await callApi(ctxFor(db, adminKey), trucksUpdate, { id: made.id, workingDays: ["wed"] })).toMatchObject({ name: "Truck 3", workingDays: ["wed"] })
    expect(await callApi(ctxFor(db, adminKey), trucksDeactivate, { id: made.id })).toMatchObject({ active: false })
    expect((await callApi(ctxFor(db, readKey), peopleList, { active: "false" })).data.map((p) => p.id)).toEqual([made.id])
    await expect(callApi(ctxFor(db, adminKey), trucksUpdate, { id: "missing", name: "x" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("takes a seeded truck by its old id or by the person's id, answering under the person's", async () => {
    const ryan = (await callApi(ctxFor(db, readKey), peopleList, {})).data.find((p) => p.name === "Ryan Garner")!
    expect(await callApi(ctxFor(db, adminKey), trucksUpdate, { id: "truck-1", jobberUserId: "jobber-user-1b" })).toMatchObject({ id: "person_truck-1", jobberUserId: "jobber-user-1b" })
    expect(await callApi(ctxFor(db, adminKey), trucksUpdate, { id: ryan.id, jobberUserId: "jobber-user-1" })).toMatchObject({ id: "person_truck-1", jobberUserId: "jobber-user-1" })
  })
  it("rejects bad input", async () => {
    await expect(callApi(ctxFor(db, adminKey), trucksCreate, { name: "", workingDays: ["mon"], capacityByKind: capacity })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), trucksCreate, { name: "T", workingDays: ["funday"], capacityByKind: capacity })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), trucksCreate, { name: "T", workingDays: [], capacityByKind: capacity })).rejects.toMatchObject({ code: "invalid" })
  })
  it("honours an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, adminKey), idempotencyKey: "truck-once" }
    const a = await callApi(ctx, trucksCreate, { name: "Once", workingDays: ["fri"], capacityByKind: capacity })
    expect((await callApi(ctx, trucksCreate, { name: "Once", workingDays: ["fri"], capacityByKind: capacity })).id).toBe(a.id)
  })
})

describe("calendar feed", () => {
  it("takes a feed URL from an admin and reports only that there is one", async () => {
    const [, second] = await seeded()
    const made = await callApi(ctxFor(db, adminKey), trucksUpdate, { id: second!.id, calendarFeedUrl: "webcal://calendar.example.com/t2.ics" })
    expect(made.hasCalendarFeed).toBe(true)
    expect(JSON.stringify(made)).not.toContain("calendar.example.com")
    expect((await callApi(ctxFor(db, adminKey), trucksUpdate, { id: second!.id, calendarFeedUrl: null })).hasCalendarFeed).toBe(false)
  })
})
