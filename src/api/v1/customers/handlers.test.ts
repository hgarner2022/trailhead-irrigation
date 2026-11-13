// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, owner, readKey, writeKey } from "../../test-helpers"
import { consentsList, consentsRecord, customersCreate, customersGet, customersList, customersUpdate } from "./handlers"

let db: TestDb
let id: string
beforeAll(async () => {
  db = await apiDb()
  const created = await callApi(ctxFor(db, writeKey), customersCreate, {
    firstName: "Maya", lastName: "Ortiz", email: "maya@example.com", phone: "303-555-0142", property: { address: "12 Elm St", town: "Erie" },
  })
  id = created.id
})
afterAll(() => db.close())

describe("customers", () => {
  it("creates with a property and shows the contact to a writer", async () => {
    const got = await callApi(ctxFor(db, writeKey), customersGet, { id })
    expect(got).toMatchObject({ firstName: "Maya", email: "maya@example.com", properties: [{ town: "Erie", address: "12 Elm St" }], consent: null })
  })
  it("rejects a bad email, a missing name and a bad town", async () => {
    await expect(callApi(ctxFor(db, writeKey), customersCreate, { firstName: "A", email: "nope" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), customersCreate, { email: "a@b.co" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), customersCreate, { firstName: "A", property: { address: "1 Main St", town: "Denver" } })).rejects.toMatchObject({ code: "invalid" })
  })
  it("refuses a read key the write calls", async () => {
    await expect(callApi(ctxFor(db, readKey), customersCreate, { firstName: "X" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, readKey), customersUpdate, { id, firstName: "X" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("leaks no email, phone or address to a read key, on the list or the detail", async () => {
    const list = await callApi(ctxFor(db, readKey), customersList, { limit: 100 })
    const text = JSON.stringify(list)
    expect(text).not.toContain("maya@example.com")
    expect(text).not.toContain("303-555-0142")
    expect(text).not.toContain("email")
    const detail = JSON.stringify(await callApi(ctxFor(db, readKey), customersGet, { id }))
    expect(detail).not.toContain("12 Elm St")
    expect(detail).not.toContain("maya@example.com")
    expect(JSON.stringify(await callApi(ctxFor(db, owner), customersList, { limit: 100 }))).toContain("maya@example.com")
  })
  it("searches names for everyone and emails only for a writer", async () => {
    expect((await callApi(ctxFor(db, readKey), customersList, { q: "ortiz" })).data.map((c) => c.id)).toEqual([id])
    expect((await callApi(ctxFor(db, readKey), customersList, { q: "maya@example" })).data).toEqual([])
    expect((await callApi(ctxFor(db, writeKey), customersList, { q: "maya@example" })).data.map((c) => c.id)).toEqual([id])
  })
  it("pages with a cursor", async () => {
    const first = await callApi(ctxFor(db, readKey), customersList, { limit: 5 })
    expect(first.data).toHaveLength(5)
    expect(first.next_cursor).toBeTruthy()
    const second = await callApi(ctxFor(db, readKey), customersList, { limit: 5, cursor: first.next_cursor! })
    expect(second.data.map((c) => c.id)).not.toContain(first.data[0]!.id)
  })
  it("says what is next: scheduled, to schedule, or none", async () => {
    const list = await callApi(ctxFor(db, readKey), customersList, { limit: 100 })
    const andrea = list.data.find((c) => c.id === "c100")!
    expect(andrea.hasPass).toBe(true)
    expect(andrea.next.state).toBe("to-schedule")
    expect(list.data.find((c) => c.id === id)!.next).toEqual({ state: "none" })
  })
  it("updates one field and keeps the rest", async () => {
    const out = await callApi(ctxFor(db, writeKey), customersUpdate, { id, phone: "720-555-0100" })
    // stored in one standard form, whatever was typed
    expect(out).toMatchObject({ firstName: "Maya", phone: "+17205550100" })
    await expect(callApi(ctxFor(db, writeKey), customersUpdate, { id: "nope", phone: "720-555-0100" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("honours an Idempotency-Key on create", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "cust-1" }
    const a = await callApi(ctx, customersCreate, { firstName: "Once" })
    const b = await callApi(ctx, customersCreate, { firstName: "Once" })
    expect(b.id).toBe(a.id)
  })
})

describe("consents", () => {
  it("appends, and the newest record is the current state", async () => {
    await callApi(ctxFor(db, writeKey), consentsRecord, { id, termsAccepted: true, marketingOptIn: false, source: "checkout" })
    await callApi(ctxFor(db, writeKey, "2027-04-21T15:00:00Z"), consentsRecord, { id, marketingOptIn: true, marketingChannels: ["email"], source: "admin", note: "asked on the phone" })
    const history = await callApi(ctxFor(db, readKey), consentsList, { id })
    expect(history.data).toHaveLength(2)
    expect(history.data[0]).toMatchObject({ marketingOptIn: true, marketingChannels: ["email"], termsAcceptedAt: null })
    expect(history.data[1]).toMatchObject({ termsVersion: "2026-11", marketingOptIn: false })
    expect((await callApi(ctxFor(db, readKey), customersGet, { id })).consent).toMatchObject({ marketingOptIn: true })
  })
  it("needs the write scope and a known source", async () => {
    await expect(callApi(ctxFor(db, readKey), consentsRecord, { id, source: "admin" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, adminKey), consentsRecord, { id, source: "carrier-pigeon" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("keeps customers out of the customer list calls", async () => {
    await expect(callApi(ctxFor(db, customerPerson(id)), customersList, {})).rejects.toMatchObject({ code: "forbidden" })
  })
})
