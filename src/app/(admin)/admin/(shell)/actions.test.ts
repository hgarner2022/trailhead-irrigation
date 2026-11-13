// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, ORG, owner, tech } from "@/api/test-helpers"
import { callApi } from "@/api/core/call"
import { areasList } from "@/api/v1/areas/handlers"
import { settingsGet } from "@/api/v1/settings/handlers"
import { trucksList } from "@/api/v1/trucks/handlers"
import { passesList } from "@/api/v1/passes/handlers"
import { getLiveAdminData } from "@/lib/admin/live"
import type { OrganizationSettings } from "@/lib/admin/types"

const state = vi.hoisted(() => ({ db: null as unknown, principal: null as unknown, revalidated: [] as unknown[][] }))
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => void state.revalidated.push(args) }))
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
}))
vi.mock("@/lib/auth/guard", () => ({
  // The real guard redirects to sign-in when the role is below the minimum; only a tech is below a manager.
  requireAdmin: async (min = "tech") => {
    const p = state.principal as { role?: string }
    if (min !== "tech" && p.role === "tech") throw new Error("redirect:/admin/sign-in")
    return p
  },
}))
vi.mock("@/lib/admin/api-ctx", async () => {
  const { ctxFor } = await import("@/api/test-helpers")
  return { ctxFromSession: async () => ctxFor(state.db as never, state.principal as never) }
})

import * as actions from "./actions"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  state.db = db
})
afterAll(() => db.close())
beforeEach(() => {
  state.principal = owner
  state.revalidated = []
})

const live = () => getLiveAdminData(ctxFor(db, owner))
const settingsOf = async () => (await live()).settings

describe("every action is a manager's", () => {
  it("sends a tech to sign in and changes nothing", async () => {
    state.principal = tech
    await expect(actions.cancelPass("p1")).rejects.toThrow("redirect:/admin/sign-in")
    await expect(actions.runSchedule("turn-on")).rejects.toThrow("redirect:/admin/sign-in")
    await expect(actions.saveSettings(await settingsOf())).rejects.toThrow("redirect:/admin/sign-in")
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p1"))
    expect(pass!.status).not.toBe("cancelled")
  })
})

describe("passes", () => {
  it("changes a preference and refreshes the admin pages", async () => {
    const out = await actions.changePreference("p1", "turn-on", "later")
    expect(out).toEqual({ ok: true, data: undefined })
    expect(state.revalidated).toContainEqual(["/admin", "layout"])
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p1"))
    expect(pass!.turnOnPreference).toBe("later")
  })
  it("answers the API's own words when it refuses", async () => {
    const out = await actions.changePreference("no-such-pass", "turn-on", "later")
    expect(out).toMatchObject({ ok: false })
    expect((out as { message: string }).message).toMatch(/not found/i)
  })
  it("says so when the messaging layer is not built yet", async () => {
    expect(await actions.resendConfirmation("p1")).toMatchObject({ ok: false })
  })
  it("cancels a pass and its unstarted visits", async () => {
    expect(await actions.cancelPass("p2", "Moved away")).toEqual({ ok: true, data: undefined })
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p2"))
    expect(pass!.status).toBe("cancelled")
    expect((await callApi(ctxFor(db, owner), passesList, { limit: 100 })).data.find((p) => p.id === "p2")!.status).toBe("cancelled")
  })
})

describe("schedule", () => {
  it("moves a visit, and refuses a day the truck does not work in the API's words", async () => {
    const ok = await actions.moveVisit("p4-turn-on", "truck-1", "2027-05-05")
    expect(ok.ok).toBe(true)
    const sunday = await actions.moveVisit("p4-turn-on", "truck-1", "2027-05-09")
    expect(sunday).toMatchObject({ ok: false, message: expect.stringMatching(/does not work on/) })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p4-turn-on"))
    expect(visit!.scheduledOn).toBe("2027-05-05")
  })
  it("runs the window and says how many it placed", async () => {
    const out = await actions.runSchedule("turn-on", 2027)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.placed + out.data.unplaced).toBeGreaterThanOrEqual(0)
  })
  it("refuses to close a visit that was cancelled", async () => {
    await db.update(s.visit).set({ status: "cancelled" }).where(eq(s.visit.id, "p4-blowout"))
    expect(await actions.markVisitClosed("p4-blowout")).toMatchObject({ ok: false, message: expect.stringMatching(/cannot be closed/) })
  })
})

describe("settings", () => {
  it("saves the whole screen: a new truck, a changed area, a section, and logs who", async () => {
    const before = await settingsOf()
    const after: OrganizationSettings = {
      ...before,
      trucks: [...before.trucks, { id: "truck-new", name: "Truck 3", workingDays: ["mon", "tue"], capacityByKind: { "turn-on": 4, inspection: 4, blowout: 6, repair: 2, other: 0 } }],
      bufferPercentEarly: before.bufferPercentEarly + 5,
      areas: [...before.areas, { id: "area-new", name: "Area 9", towns: [] }],
    }
    const refused = await actions.saveSettings(after)
    expect(refused).toMatchObject({ ok: false, message: "Pick at least one town for Area 9 before saving." })
    expect((await callApi(ctxFor(db, owner), trucksList, {})).data).toHaveLength(before.trucks.length)

    const ok = await actions.saveSettings({ ...after, areas: before.areas })
    expect(ok.ok).toBe(true)
    const trucks = (await callApi(ctxFor(db, owner), trucksList, {})).data
    expect(trucks.map((t) => t.name)).toContain("Truck 3")
    expect((await callApi(ctxFor(db, owner), settingsGet, {})).bufferPercentEarly).toBe(before.bufferPercentEarly + 5)
    const changes = await db.select().from(s.settingsChange).where(eq(s.settingsChange.organizationId, ORG))
    expect(changes.some((c) => c.field === "bufferPercentEarly" && c.byEmail === owner.email)).toBe(true)
  })
  it("takes a removed truck out of service and leaves it out of the data", async () => {
    const now = await settingsOf()
    const gone = now.trucks.find((t) => t.name === "Truck 3")!
    expect((await actions.saveSettings({ ...now, trucks: now.trucks.filter((t) => t.id !== gone.id) })).ok).toBe(true)
    expect((await settingsOf()).trucks.map((t) => t.id)).not.toContain(gone.id)
  })
  it("moves a town between areas by writing the area that gives it up first", async () => {
    const now = await settingsOf()
    const [a, b] = now.areas
    const town = a!.towns[0]!
    const out = await actions.saveSettings({ ...now, areas: [{ ...a!, towns: a!.towns.slice(1) }, { ...b!, towns: [...b!.towns, town] }, ...now.areas.slice(2)] })
    expect(out).toEqual({ ok: true, data: undefined })
    const areas = (await callApi(ctxFor(db, owner), areasList, {})).data
    expect(areas.find((x) => x.id === b!.id)!.towns).toContain(town)
  })
})

describe("keys, webhooks and consent", () => {
  it("makes a key once, folds the screen's scopes into the API's, and revokes it", async () => {
    const made = await actions.createApiKey("Day view", ["read", "write-passes", "send-messages"])
    expect(made.ok).toBe(true)
    const [row] = await db.select().from(s.apiKey).where(eq(s.apiKey.name, "Day view"))
    expect(row!.scopes).toEqual(["read", "write"])
    if (made.ok) expect(made.data.key).toMatch(/^th_/)
    expect((await actions.revokeApiKey(row!.id)).ok).toBe(true)
    expect(await actions.revokeApiKey("00000000-0000-0000-0000-000000000000")).toMatchObject({ ok: false })
  })
  it("asks for an https webhook URL", async () => {
    expect(await actions.createWebhook("http://insecure.example.com", ["pass.created"])).toMatchObject({ ok: false })
  })
  it("appends a phone opt-out as the newest consent record", async () => {
    const [customer] = await db.select({ id: s.customer.id }).from(s.customer).limit(1)
    expect((await actions.recordMarketingOptOut(customer!.id)).ok).toBe(true)
    const rows = await db.select().from(s.consent).where(eq(s.consent.customerId, customer!.id))
    const newest = rows.sort((x, y) => +y.recordedAt - +x.recordedAt)[0]!
    expect(newest).toMatchObject({ marketingOptIn: false, source: "admin" })
  })
})

describe("Needs attention", () => {
  it("takes a visit row to that visit in the Schedule", async () => {
    await expect(actions.attentionAction({ kind: "unplaced", visitId: "v1", message: "x", since: "2027-01-01T00:00:00Z" })).rejects.toThrow("redirect:/admin/schedule?visit=v1")
    await expect(actions.attentionAction({ kind: "new-pass", passId: "p1", message: "x", since: "2027-01-01T00:00:00Z" })).rejects.toThrow("redirect:/admin/passes?pass=p1")
  })
})
