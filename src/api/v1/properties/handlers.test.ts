// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
import { customersGet } from "../customers/handlers"
import { passesGet } from "../passes/handlers"
import { visitsGet } from "../visits/handlers"
import { propertiesUpdate } from "./handlers"

let db: TestDb
let id: string
beforeAll(async () => {
  db = await apiDb()
  id = (await db.select().from(s.property).where(eq(s.property.customerId, "c100")))[0]!.id
})
afterAll(() => db.close())

describe("properties.update", () => {
  it("changes any subset of the yard and answers with every field", async () => {
    const out = await callApi(ctxFor(db, writeKey), propertiesUpdate, { id, zones: 10, controller: " Rachio 3 ", backflowLocation: "Garage", gateCode: "1234", mustBeHome: true, accessNote: "Dog in the yard", contactName: "Jim Hart", contactPhone: "970-555-0100", notes: "Clay soil" })
    expect(out).toMatchObject({ id, customerId: "c100", zones: 10, controller: "Rachio 3", backflowLocation: "Garage", gateCode: "1234", mustBeHome: true, accessNote: "Dog in the yard", contactName: "Jim Hart", notes: "Clay soil" })
    const again = await callApi(ctxFor(db, writeKey), propertiesUpdate, { id, notes: "  " })
    expect(again).toMatchObject({ zones: 10, controller: "Rachio 3", notes: null })
  })
  it("cleans the contact phone like the customer's", async () => {
    const out = await callApi(ctxFor(db, writeKey), propertiesUpdate, { id, contactPhone: "(970) 555 0199" })
    expect(out.contactPhone).toBe("+19705550199")
    const [row] = await db.select().from(s.property).where(eq(s.property.id, id))
    expect(row!.contactPhone).toBe("+19705550199")
  })
  it("refuses zones outside 1 to 16", async () => {
    await expect(callApi(ctxFor(db, writeKey), propertiesUpdate, { id, zones: 0 })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), propertiesUpdate, { id, zones: 17 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("refuses an on-site phone that is not a phone number, and keeps the property as it was", async () => {
    await expect(callApi(ctxFor(db, writeKey), propertiesUpdate, { id, contactPhone: "call Jim" })).rejects.toMatchObject({ code: "invalid" })
    expect((await db.select().from(s.property).where(eq(s.property.id, id)))[0]!.contactPhone).toBe("+19705550199")
  })
  it("needs the write scope", async () => {
    await expect(callApi(ctxFor(db, readKey), propertiesUpdate, { id, zones: 6 })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("answers not found for a missing property and for another organization's", async () => {
    await expect(callApi(ctxFor(db, writeKey), propertiesUpdate, { id: "missing", zones: 6 })).rejects.toMatchObject({ code: "not_found" })
    const [org] = await db.select().from(s.organization).where(eq(s.organization.id, ORG))
    const [other] = await db.insert(s.organization).values({ name: "Other", settings: org!.settings, termsVersion: org!.termsVersion }).returning()
    const [c] = await db.insert(s.customer).values({ organizationId: other!.id, firstName: "Zed" }).returning()
    const [p] = await db.insert(s.property).values({ organizationId: other!.id, customerId: c!.id, address: "1 Far St", town: "Erie", zones: 4 }).returning()
    await expect(callApi(ctxFor(db, writeKey), propertiesUpdate, { id: p!.id, zones: 6 })).rejects.toMatchObject({ code: "not_found" })
    expect((await db.select().from(s.property).where(eq(s.property.id, p!.id)))[0]!.zones).toBe(4)
  })
  it("is served on customers.get, the gate code, access note and phone to a write key only", async () => {
    const write = await callApi(ctxFor(db, writeKey), customersGet, { id: "c100" })
    expect(write.properties.find((p) => p.id === id)).toMatchObject({ gateCode: "1234", contactPhone: "+19705550199", accessNote: "Dog in the yard" })
    const read = await callApi(ctxFor(db, readKey), customersGet, { id: "c100" })
    const p = read.properties.find((p) => p.id === id)!
    expect(p).toMatchObject({ zones: 10, mustBeHome: true })
    expect(p).not.toHaveProperty("gateCode")
    expect(p).not.toHaveProperty("contactPhone")
    expect(p).not.toHaveProperty("accessNote")
  })
  it("is read by the pass and the visit: zones, must be home and the access note come from the property", async () => {
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.customerId, "c100"))
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.passId, pass!.id))
    const out = await callApi(ctxFor(db, writeKey), passesGet, { id: pass!.id })
    expect(out).toMatchObject({ zones: 10, needsCustomerHome: true, accessNote: "Dog in the yard" })
    const v = await callApi(ctxFor(db, writeKey), visitsGet, { id: visit!.id })
    expect(v.property).toMatchObject({ zones: 10, controller: "Rachio 3", gateCode: "1234", mustBeHome: true, contactPhone: "+19705550199" })
    const r = await callApi(ctxFor(db, readKey), visitsGet, { id: visit!.id })
    expect(r.property).toMatchObject({ zones: 10, mustBeHome: true })
    expect(r.property).not.toHaveProperty("gateCode")
    expect(r.property).not.toHaveProperty("contactPhone")
  })
  it("reads cleared on the pass: after the access note is cleared, passes.get shows none", async () => {
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.customerId, "c100"))
    await callApi(ctxFor(db, writeKey), propertiesUpdate, { id, accessNote: "", mustBeHome: false })
    const out = await callApi(ctxFor(db, writeKey), passesGet, { id: pass!.id })
    expect(out.accessNote).toBeNull()
    expect(out.needsCustomerHome).toBe(false)
  })
})
