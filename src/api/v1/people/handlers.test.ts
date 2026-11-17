// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { trucksList } from "../trucks/handlers"
import { peopleCreate, peopleDeactivate, peopleList, peopleUpdate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

const capacity = { "turn-on": 6, inspection: 5, blowout: 10, repair: 4, other: 2 }

describe("people", () => {
  it("lists owners first, then by name: Ryan with his truck and working days, the seeded admin, the second truck", async () => {
    const out = await callApi(ctxFor(db, readKey), peopleList, {})
    // The test organization has two owners: the seeded sign-in (owner@example.com) and Ryan, merged from Truck 1.
    expect(out.data.map((p) => [p.name, p.role])).toEqual([["Owner", "owner"], ["Ryan Garner", "owner"], ["Tech Two", "tech"]])
    expect(out.data[1]).toMatchObject({ name: "Ryan Garner", initials: "RG", truck: "Truck 1", role: "owner", email: null, canSignIn: false, jobberUserId: "jobber-user-1", workingDays: ["mon", "tue", "wed", "thu", "fri"], hasCalendarFeed: false, active: true })
    expect(out.data[0]).toMatchObject({ email: "owner@example.com", canSignIn: true, truck: null })
    expect(out.data[2]!.workingDays).toContain("sat")
    expect(JSON.stringify(out.data)).not.toContain("legacyTruckId")
  })
  it("filters by active", async () => {
    const active = await callApi(ctxFor(db, readKey), peopleList, { active: "true" })
    expect(active.data.every((p) => p.active)).toBe(true)
    expect((await callApi(ctxFor(db, readKey), peopleList, { active: "false" })).data).toEqual([])
  })
  it("needs the admin scope to change anyone", async () => {
    const ryan = (await callApi(ctxFor(db, readKey), peopleList, {})).data.find((p) => p.name === "Ryan Garner")!
    await expect(callApi(ctxFor(db, writeKey), peopleCreate, { name: "Sam Tech" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), peopleUpdate, { id: ryan.id, name: "X" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), peopleDeactivate, { id: ryan.id })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("creates a tech with a sign-in email and no truck, and deactivates them", async () => {
    const made = await callApi(ctxFor(db, adminKey), peopleCreate, { name: "Sam Tech", email: "sam@example.com", role: "tech", workingDays: ["mon"], capacityByKind: capacity })
    expect(made).toMatchObject({ name: "Sam Tech", initials: "ST", email: "sam@example.com", role: "tech", truck: null, canSignIn: true, active: true, workingDays: ["mon"], capacityByKind: capacity, seasonStart: null, seasonEnd: null })
    const off = await callApi(ctxFor(db, adminKey), peopleDeactivate, { id: made.id })
    expect(off).toMatchObject({ active: false, canSignIn: false })
    expect((await callApi(ctxFor(db, readKey), peopleList, { active: "false" })).data.map((p) => p.id)).toEqual([made.id])
  })
  it("fills in the defaults: role tech, Monday to Friday, the schema's capacity, initials from a one-word name", async () => {
    const made = await callApi(ctxFor(db, adminKey), peopleCreate, { name: "Cher" })
    expect(made).toMatchObject({ role: "tech", initials: "CH", email: null, phone: null, canSignIn: false, workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: { "turn-on": 8, inspection: 8, blowout: 10, repair: 4, other: 2 } })
    const given = await callApi(ctxFor(db, adminKey), peopleCreate, { name: "Jo Ann Smith", initials: "JAS", seasonStart: "2027-04-01", seasonEnd: "2027-11-15" })
    expect(given).toMatchObject({ initials: "JAS", seasonStart: "2027-04-01", seasonEnd: "2027-11-15" })
  })
  it("stores an email lowercased and refuses a second person with the same email in any case", async () => {
    const made = await callApi(ctxFor(db, adminKey), peopleCreate, { name: "Pat Lee", email: "  Pat.Lee@Example.com " })
    expect(made.email).toBe("pat.lee@example.com")
    await expect(callApi(ctxFor(db, adminKey), peopleCreate, { name: "Other Pat", email: "PAT.LEE@example.com" })).rejects.toMatchObject({ code: "conflict", message: "That email already belongs to Pat Lee" })
    const other = await callApi(ctxFor(db, adminKey), peopleCreate, { name: "Other Pat" })
    await expect(callApi(ctxFor(db, adminKey), peopleUpdate, { id: other.id, email: "pat.lee@EXAMPLE.com" })).rejects.toMatchObject({ code: "conflict", message: "That email already belongs to Pat Lee" })
    // Keeping your own email, in another case, is not a conflict.
    expect((await callApi(ctxFor(db, adminKey), peopleUpdate, { id: made.id, email: "PAT.LEE@example.com", phone: "303-555-0101" })).email).toBe("pat.lee@example.com")
    // null clears the email, and with it the sign-in.
    expect(await callApi(ctxFor(db, adminKey), peopleUpdate, { id: made.id, email: null })).toMatchObject({ email: null, canSignIn: false, phone: "303-555-0101" })
  })
  it("updates a person and reports a calendar feed only as present", async () => {
    const ryan = (await callApi(ctxFor(db, readKey), peopleList, {})).data.find((p) => p.name === "Ryan Garner")!
    const fed = await callApi(ctxFor(db, adminKey), peopleUpdate, { id: ryan.id, calendarFeedUrl: "webcal://calendar.example.com/ryan.ics", truck: "Truck 1 (the white one)" })
    // A partial update changes only what it names: the role, days and capacity stay.
    expect(fed).toMatchObject({ hasCalendarFeed: true, truck: "Truck 1 (the white one)", role: "owner", workingDays: ryan.workingDays, capacityByKind: ryan.capacityByKind })
    expect(JSON.stringify(fed)).not.toContain("calendar.example.com")
    expect(await callApi(ctxFor(db, adminKey), peopleUpdate, { id: ryan.id, calendarFeedUrl: null, truck: "Truck 1" })).toMatchObject({ hasCalendarFeed: false, truck: "Truck 1" })
    await expect(callApi(ctxFor(db, adminKey), peopleUpdate, { id: "missing", name: "x" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("lets an owner step down while another owner stays, and refuses to demote the only one", async () => {
    const [first, second] = (await callApi(ctxFor(db, readKey), peopleList, { active: "true" })).data.filter((p) => p.role === "owner")
    expect((await callApi(ctxFor(db, adminKey), peopleUpdate, { id: second!.id, role: "admin" })).role).toBe("admin")
    await expect(callApi(ctxFor(db, adminKey), peopleUpdate, { id: first!.id, role: "tech" })).rejects.toMatchObject({ code: "unprocessable", message: "Keep at least one owner." })
    // Naming the role they already have is not a demotion; neither is a change that leaves the role alone.
    expect((await callApi(ctxFor(db, adminKey), peopleUpdate, { id: first!.id, role: "owner", phone: "303-555-0100" })).role).toBe("owner")
    expect((await callApi(ctxFor(db, adminKey), peopleUpdate, { id: first!.id, name: first!.name })).role).toBe("owner")
    expect((await callApi(ctxFor(db, adminKey), peopleUpdate, { id: second!.id, role: "owner" })).role).toBe("owner")
  })
  it("keeps at least one owner", async () => {
    const owners = (await callApi(ctxFor(db, readKey), peopleList, { active: "true" })).data.filter((p) => p.role === "owner")
    expect(owners).toHaveLength(2)
    expect((await callApi(ctxFor(db, adminKey), peopleDeactivate, { id: owners[0]!.id })).active).toBe(false)
    await expect(callApi(ctxFor(db, adminKey), peopleDeactivate, { id: owners[1]!.id })).rejects.toMatchObject({ code: "unprocessable", message: "Keep at least one owner." })
    await expect(callApi(ctxFor(db, adminKey), peopleDeactivate, { id: "missing" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("rejects bad input", async () => {
    await expect(callApi(ctxFor(db, adminKey), peopleCreate, { name: "" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), peopleCreate, { name: "T", role: "boss" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), peopleCreate, { name: "T", email: "not-an-email" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), peopleCreate, { name: "T", workingDays: [] })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), peopleCreate, { name: "T", seasonStart: "April 1" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("trucks.list still answers, with the same rows under the old names", async () => {
    const out = await callApi(ctxFor(db, readKey), trucksList, {})
    expect(out.data.map((t) => t.name)).toEqual(["Ryan Garner", "Tech Two"])
  })
})
