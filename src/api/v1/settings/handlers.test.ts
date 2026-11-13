// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, owner, readKey, writeKey } from "../../test-helpers"
import { settingsChangesList, settingsGet, settingsUpdate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("settings", () => {
  it("reads the settings with the terms version and no trucks or areas", async () => {
    const out = await callApi(ctxFor(db, readKey), settingsGet, {})
    expect(out.termsVersion).toBe("2026-11")
    expect(out.windows.map((w) => w.kind)).toEqual(["turn-on", "inspection", "blowout"])
    expect(out.windows.find((w) => w.kind === "blowout")!.leadWeeks).toBe(2)
    expect(out).not.toHaveProperty("trucks")
  })
  it("says the settings are not confirmed until one is saved, then logs one row per changed leaf", async () => {
    const fresh = await apiDb()
    expect((await callApi(ctxFor(fresh, readKey), settingsGet, {})).confirmed).toBe(false)
    const windows = (await callApi(ctxFor(fresh, readKey), settingsGet, {})).windows.map((w) => (w.kind === "turn-on" ? { ...w, opensOn: "2027-05-03", leadWeeks: 3 } : w))
    const out = await callApi(ctxFor(fresh, adminKey), settingsUpdate, { section: "windows", value: windows })
    expect(out.confirmed).toBe(true)
    const log = (await callApi(ctxFor(fresh, readKey), settingsChangesList, {})).data
    expect(log.map((c) => c.field).sort()).toEqual(["windows.turn-on.leadWeeks", "windows.turn-on.opensOn"])
    expect(log.find((c) => c.field === "windows.turn-on.leadWeeks")).toMatchObject({ to: "3 weeks ahead" })
    expect((await callApi(ctxFor(fresh, readKey), settingsGet, {})).confirmed).toBe(true)
    await fresh.close()
  })
  it("updates one section and writes who changed it, from and to", async () => {
    const out = await callApi(ctxFor(db, owner), settingsUpdate, { section: "bufferPercentEarly", value: 25 })
    expect(out.bufferPercentEarly).toBe(25)
    expect((await callApi(ctxFor(db, readKey), settingsGet, {})).bufferPercentEarly).toBe(25)
    const log = await callApi(ctxFor(db, readKey), settingsChangesList, {})
    expect(log.data[0]).toMatchObject({ who: "owner@example.com", field: "bufferPercentEarly", to: "25 percent" })
    expect(log.data[0]!.from).toMatch(/ percent$/)
  })
  it("logs a key's change under the key, and nothing for a no-op", async () => {
    await callApi(ctxFor(db, adminKey), settingsUpdate, { section: "springTownOrder", value: ["Longmont", "Erie"] })
    await callApi(ctxFor(db, adminKey), settingsUpdate, { section: "springTownOrder", value: ["Longmont", "Erie"] })
    const log = await callApi(ctxFor(db, readKey), settingsChangesList, {})
    expect(log.data.filter((c) => c.field === "springTownOrder")).toHaveLength(1)
    expect(log.data[0]).toMatchObject({ who: "api-key:k-read-write-admin", to: "Longmont, Erie" })
  })
  it("validates the value against the section", async () => {
    const error = await callApi(ctxFor(db, adminKey), settingsUpdate, { section: "bufferPercentLate", value: 140 }).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), settingsUpdate, { section: "springTownOrder", value: ["Denver"] })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), settingsUpdate, { section: "trucks", value: [] })).rejects.toMatchObject({ code: "invalid" })
  })
  it("needs the admin scope", async () => {
    await expect(callApi(ctxFor(db, writeKey), settingsUpdate, { section: "bufferPercentLate", value: 5 })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("honours an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, adminKey), idempotencyKey: "set-1" }
    await callApi(ctx, settingsUpdate, { section: "bufferPercentLate", value: 7 })
    await callApi(ctx, settingsUpdate, { section: "bufferPercentLate", value: 7 })
    expect((await callApi(ctxFor(db, readKey), settingsChangesList, {})).data.filter((c) => c.field === "bufferPercentLate")).toHaveLength(1)
  })
})
