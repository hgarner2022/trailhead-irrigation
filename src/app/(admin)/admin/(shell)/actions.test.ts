// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, ORG, owner, tech } from "@/api/test-helpers"
import { callApi } from "@/api/core/call"
import { areasList } from "@/api/v1/areas/handlers"
import { settingsGet } from "@/api/v1/settings/handlers"
import { peopleList } from "@/api/v1/people/handlers"
import { servicesList } from "@/api/v1/services/handlers"
import { passesList } from "@/api/v1/passes/handlers"
import { invoicesSend } from "@/api/v1/invoices/handlers"
import { visitsCreate } from "@/api/v1/visits/office"
import { getLiveAdminData } from "@/lib/admin/live"
import type { OrganizationSettings } from "@/lib/admin/types"
import { DEFAULT_BILLING } from "@/lib/settings/defaults"

/** A service row as the screen holds it: the nulls the API sends left out. */
const liveService = (r: { id: string; key: string; name: string; description: string | null; kind: string; taxable: boolean; active: boolean; bookable: boolean; slotMinutes: number; quoteOnly: boolean; price: number | null; includedZones: number | null; extraZonePrice: number | null }) => ({
  id: r.id, key: r.key, name: r.name, description: r.description, kind: r.kind, taxable: r.taxable, active: r.active, bookable: r.bookable, slotMinutes: r.slotMinutes, quoteOnly: r.quoteOnly,
  ...(r.price !== null ? { price: r.price } : {}), ...(r.includedZones !== null ? { includedZones: r.includedZones } : {}), ...(r.extraZonePrice !== null ? { extraZonePrice: r.extraZonePrice } : {}),
})

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
// The real callApi, watched: the settings tests count the people.* calls a save makes.
vi.mock("@/api/core/call", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/api/core/call")>()
  return { ...real, callApi: vi.fn(real.callApi) }
})

import * as actions from "./actions"
import { addPerson, setPersonName, setPersonText } from "@/app/(admin)/admin/_screens/settings-people"
import { SAMPLE_KEYS } from "@/app/(admin)/admin/_screens/settings-model"

/** The handler names callApi was asked to run, in order, since the last `beforeEach`. */
const calls = (prefix: string) => vi.mocked(callApi).mock.calls.map(([, handler]) => (handler as { name: string }).name).filter((n) => n.startsWith(prefix))

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  state.db = db
})
afterAll(() => {
  vi.unstubAllEnvs()
  db.close()
})
beforeEach(() => {
  state.principal = owner
  state.revalidated = []
  vi.mocked(callApi).mockClear()
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

describe("notes", () => {
  it("adds a note through events.note, answers it as a line of the story and refreshes the admin pages", async () => {
    const out = await actions.addNote("visit", "p4-turn-on", "Gate was open, dog inside")
    expect(out).toMatchObject({ ok: true, data: { kind: "event", what: "Gate was open, dog inside", note: "Gate was open, dog inside" } })
    expect(calls("events.")).toEqual(["events.note"])
    expect(state.revalidated).toContainEqual(["/admin", "layout"])
    const [row] = await db.select().from(s.event).where(eq(s.event.kind, "note"))
    expect(row).toMatchObject({ about: "visit", aboutId: "p4-turn-on", who: owner.email, detail: { text: "Gate was open, dog inside" } })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p4-turn-on"))
    expect(visit!.notes).toBe("Gate was open, dog inside")
  })
  it("lets a tech add a note, the one action a tech may take", async () => {
    state.principal = tech
    const out = await actions.addNote("customer", "c100", "Prefers a call before noon")
    expect(out).toMatchObject({ ok: true, data: { what: "Prefers a call before noon" } })
    const rows = await db.select().from(s.event).where(eq(s.event.about, "customer"))
    expect(rows.find((r) => r.who === tech.email)).toMatchObject({ kind: "note", aboutId: "c100", customerId: "c100" })
  })
  it("answers the API's words when it refuses", async () => {
    const missing = await actions.addNote("visit", "no-such-visit", "Hello")
    expect(missing).toMatchObject({ ok: false })
    expect((missing as { message: string }).message).toMatch(/not found/i)
    const long = await actions.addNote("visit", "p4-turn-on", "x".repeat(2001))
    expect(long).toMatchObject({ ok: false })
    expect((long as { message: string }).message).toBeTruthy()
  })
})

describe("property", () => {
  it("writes the yard through properties.update and the live data reads it back", async () => {
    const [prop] = await db.select().from(s.property).where(eq(s.property.customerId, "c100"))
    const out = await actions.updateProperty(prop!.id, { zones: 10, controller: "Hunter in the garage", gateCode: "4471", mustBeHome: true, contactName: "Dana", contactPhone: "970-555-0123", notes: "" })
    expect(out).toEqual({ ok: true, data: undefined })
    expect(calls("properties.")).toEqual(["properties.update"])
    expect(state.revalidated).toContainEqual(["/admin", "layout"])
    const client = (await live()).clients.find((c) => c.id === "c100")!
    expect(client.properties?.[0]).toMatchObject({ id: prop!.id, zones: 10, controller: "Hunter in the garage", gateCode: "4471", mustBeHome: true, contactName: "Dana", contactPhone: "+19705550123" })
  })
  it("answers the API's words for a property that is not there, and sends a tech to sign in", async () => {
    expect(await actions.updateProperty("nope", { zones: 8 })).toMatchObject({ ok: false })
    state.principal = tech
    await expect(actions.updateProperty("nope", { zones: 8 })).rejects.toThrow("redirect:/admin/sign-in")
  })
})

describe("schedule", () => {
  it("moves a visit, and refuses a day the person does not work in the API's words", async () => {
    const ok = await actions.moveVisit("p4-turn-on", "person_truck-1", "2027-05-05")
    expect(ok.ok).toBe(true)
    const sunday = await actions.moveVisit("p4-turn-on", "person_truck-1", "2027-05-09")
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
  it("saves the billing settings through settings.update, and leaves them alone when the screen's data carries none", async () => {
    const before = await settingsOf()
    expect(before.billing).toEqual({ dueDays: 14, collectsSalesTax: false, salesTaxPercent: 0 })
    expect((await actions.saveSettings({ ...before, billing: { dueDays: 21, collectsSalesTax: true, salesTaxPercent: 8.8 } })).ok).toBe(true)
    expect((await settingsOf()).billing).toEqual({ dueDays: 21, collectsSalesTax: true, salesTaxPercent: 8.8 })
    const { billing: _billing, ...without } = await settingsOf()
    void _billing
    expect((await actions.saveSettings(without as OrganizationSettings)).ok).toBe(true)
    expect((await settingsOf()).billing.dueDays).toBe(21)
    expect((await actions.saveSettings({ ...before, billing: DEFAULT_BILLING })).ok).toBe(true)
  })

  it("saves the whole screen: a new person, a changed area, a section, and logs who", async () => {
    const before = await settingsOf()
    const after: OrganizationSettings = {
      ...before,
      people: [...before.people, { id: "person-new", name: "Third Tech", initials: "TT", role: "tech", truck: "Truck 3", email: "third@example.com", workingDays: ["mon", "tue"], capacityByKind: { "turn-on": 4, inspection: 4, blowout: 6, repair: 2, other: 0 }, seasonStart: "2027-04-01" }],
      bufferPercentEarly: before.bufferPercentEarly + 5,
      areas: [...before.areas, { id: "area-new", name: "Area 9", towns: [] }],
    }
    const refused = await actions.saveSettings(after)
    expect(refused).toMatchObject({ ok: false, message: "Pick at least one town for Area 9 before saving." })
    expect((await callApi(ctxFor(db, owner), peopleList, { active: "true" })).data).toHaveLength(before.people.length)

    const ok = await actions.saveSettings({ ...after, areas: before.areas })
    expect(ok.ok).toBe(true)
    const people = (await callApi(ctxFor(db, owner), peopleList, { active: "true" })).data
    expect(people.find((p) => p.name === "Third Tech")).toMatchObject({ role: "tech", truck: "Truck 3", email: "third@example.com", seasonStart: "2027-04-01", canSignIn: true })
    expect((await callApi(ctxFor(db, owner), settingsGet, {})).bufferPercentEarly).toBe(before.bufferPercentEarly + 5)
    const changes = await db.select().from(s.settingsChange).where(eq(s.settingsChange.organizationId, ORG))
    expect(changes.some((c) => c.field === "bufferPercentEarly" && c.byEmail === owner.email)).toBe(true)
  })
  it("changes a person's role and clears their email through the API, in one save", async () => {
    const now = await settingsOf()
    const third = now.people.find((p) => p.name === "Third Tech")!
    const { email: _email, ...noEmail } = third
    void _email
    expect((await actions.saveSettings({ ...now, people: now.people.map((p) => (p.id === third.id ? { ...noEmail, role: "admin" as const } : p)) })).ok).toBe(true)
    expect((await settingsOf()).people.find((p) => p.id === third.id)).toMatchObject({ role: "admin" })
    expect((await callApi(ctxFor(db, owner), peopleList, { active: "true" })).data.find((p) => p.id === third.id)).toMatchObject({ email: null, canSignIn: false })
  })
  it("takes a removed person out of service and leaves them out of the data, and keeps the last owner", async () => {
    const now = await settingsOf()
    const gone = now.people.find((p) => p.name === "Third Tech")!
    expect((await actions.saveSettings({ ...now, people: now.people.filter((p) => p.id !== gone.id) })).ok).toBe(true)
    expect((await settingsOf()).people.map((p) => p.id)).not.toContain(gone.id)
    const noOwner = await actions.saveSettings({ ...now, people: now.people.map((p) => ({ ...p, role: "tech" as const })) })
    expect(noOwner).toMatchObject({ ok: false, message: "Keep at least one owner." })
  })
  it("a rename alone is one people.update carrying the new initials, and no create", async () => {
    const now = await settingsOf()
    const ryan = now.people.find((p) => p.name === "Ryan Garner")!
    const actor = { who: "Hannah", at: "2026-11-16T19:00:00Z" }
    const renamed = setPersonName({ settings: now, changes: [], keys: SAMPLE_KEYS, services: [] }, ryan.id, "Ada Lovelace", actor).settings
    vi.mocked(callApi).mockClear()
    expect((await actions.saveSettings(renamed)).ok).toBe(true)
    expect(calls("people.")).toEqual(["people.list", "people.update"])
    expect((await callApi(ctxFor(db, owner), peopleList, { active: "true" })).data.find((p) => p.id === ryan.id)).toMatchObject({ name: "Ada Lovelace", initials: "AL" })
    expect((await actions.saveSettings(now)).ok).toBe(true)
  })
  it("renaming a person with no truck is one people.update, persists, and writes a change log row by the signed-in email", async () => {
    const now = await settingsOf()
    const admin = now.people.find((p) => !p.truck)!
    const renamed = { ...now, people: now.people.map((p) => (p.id === admin.id ? { ...p, name: "Hannah Garner", initials: "HG" } : p)) }
    vi.mocked(callApi).mockClear()
    expect(await actions.saveSettings(renamed)).toEqual({ ok: true, data: undefined })
    expect(calls("people.")).toEqual(["people.list", "people.update"])
    expect((await callApi(ctxFor(db, owner), peopleList, { active: "true" })).data.find((p) => p.id === admin.id)).toMatchObject({ name: "Hannah Garner", initials: "HG" })
    const log = (await live()).settingsChanges.filter((c) => c.field === `${admin.name} name`)
    expect(log).toEqual([expect.objectContaining({ who: owner.email, from: admin.name, to: "Hannah Garner" })])
    // saving the same screen again changes nothing and logs nothing more
    expect((await actions.saveSettings(renamed)).ok).toBe(true)
    expect((await live()).settingsChanges.filter((c) => c.field === `${admin.name} name`)).toHaveLength(1)
  })
  it("a refused person update says why and changes nothing, instead of Saved", async () => {
    const now = await settingsOf()
    const [a, b] = now.people
    const clash = { ...now, people: now.people.map((p) => (p.id === b!.id ? { ...p, name: "Renamed anyway", email: "owner@example.com" } : p)) }
    const out = await actions.saveSettings(clash)
    expect(out).toMatchObject({ ok: false, message: expect.stringMatching(/already belongs to/) })
    const after = (await callApi(ctxFor(db, owner), peopleList, { active: "true" })).data
    expect(after.find((p) => p.id === b!.id)!.name).toBe(b!.name)
    expect(after.find((p) => p.id === a!.id)!.name).toBe(a!.name)
  })
  it("promotes B to owner and demotes A in one save, in that order", async () => {
    const now = await settingsOf()
    const owners = now.people.filter((p) => p.role === "owner")
    expect(owners.length).toBeGreaterThanOrEqual(2)
    const [a, b] = owners
    // First one owner only: B steps down while A stays.
    expect((await actions.saveSettings({ ...now, people: now.people.map((p) => (p.id === b!.id ? { ...p, role: "admin" as const } : p)) })).ok).toBe(true)
    vi.mocked(callApi).mockClear()
    const swapped = await actions.saveSettings({ ...now, people: now.people.map((p) => (p.id === a!.id ? { ...p, role: "tech" as const } : p.id === b!.id ? { ...p, role: "owner" as const } : p)) })
    expect(swapped).toEqual({ ok: true, data: undefined })
    const updates = vi.mocked(callApi).mock.calls.filter(([, h]) => (h as { name: string }).name === "people.update").map(([, , input]) => (input as { id: string }).id)
    expect(updates).toEqual([b!.id, a!.id])
    expect((await settingsOf()).people.filter((p) => p.role === "owner").map((p) => p.id)).toEqual([b!.id])
    expect((await actions.saveSettings(now)).ok).toBe(true)
  })
  it("a brand-new owner and every old owner's demotion in one save: the new owner is created first", async () => {
    const now = await settingsOf()
    const owners = now.people.filter((p) => p.role === "owner").map((p) => p.id)
    expect(owners.length).toBeGreaterThanOrEqual(1)
    const fresh = { id: "person-fresh", name: "Fresh Owner", initials: "FO", role: "owner" as const, workingDays: ["mon" as const], capacityByKind: now.people[0]!.capacityByKind }
    vi.mocked(callApi).mockClear()
    const out = await actions.saveSettings({ ...now, people: [...now.people.map((p) => (p.role === "owner" ? { ...p, role: "tech" as const } : p)), fresh] })
    expect(out).toEqual({ ok: true, data: undefined })
    expect(calls("people.")).toEqual(["people.list", "people.create", ...owners.map(() => "people.update")])
    const after = await settingsOf()
    expect(after.people.filter((p) => p.role === "owner").map((p) => p.name)).toEqual(["Fresh Owner"])
    expect((await actions.saveSettings(now)).ok).toBe(true)
    expect((await settingsOf()).people.filter((p) => p.role === "owner").map((p) => p.id)).toEqual(owners)
  })
  it("writes nothing when a person's email is not shaped like one", async () => {
    const now = await settingsOf()
    const ryan = now.people.find((p) => p.name === "Ryan Garner")!
    const bad = { ...now, people: now.people.map((p) => (p.id === ryan.id ? { ...p, name: "Ryan G", email: "ryan@" } : p)) }
    vi.mocked(callApi).mockClear()
    expect(await actions.saveSettings(bad)).toMatchObject({ ok: false, message: "Ryan G's email doesn't look complete." })
    expect(calls("people.")).toEqual([])
    expect((await settingsOf()).people.find((p) => p.id === ryan.id)!.name).toBe("Ryan Garner")
    vi.mocked(callApi).mockClear()
    const noDays = { ...now, people: now.people.map((p) => (p.id === ryan.id ? { ...p, workingDays: [] } : p)) }
    expect(await actions.saveSettings(noDays)).toMatchObject({ ok: false, message: "Give Ryan Garner at least one working day." })
    const longTruck = { ...now, people: now.people.map((p) => (p.id === ryan.id ? { ...p, truck: "T".repeat(41) } : p)) }
    expect(await actions.saveSettings(longTruck)).toMatchObject({ ok: false, message: "Ryan Garner's truck is longer than 40 characters." })
    expect(calls("people.")).toEqual([])
  })
  it("a person added and edited before one Save is one people.create with the edited values", async () => {
    const now = await settingsOf()
    const actor = { who: "Hannah", at: "2026-11-16T19:00:00Z" }
    const added = addPerson({ settings: now, changes: [], keys: SAMPLE_KEYS, services: [] }, actor)
    const id = added.settings.people[added.settings.people.length - 1]!.id
    const edited = setPersonText(setPersonName(added, id, "Ada Lovelace", actor), id, "truck", "Truck 4", actor).settings
    vi.mocked(callApi).mockClear()
    expect((await actions.saveSettings(edited)).ok).toBe(true)
    expect(calls("people.")).toEqual(["people.list", "people.create"])
    const made = (await callApi(ctxFor(db, owner), peopleList, { active: "true" })).data.find((p) => p.name === "Ada Lovelace")
    expect(made).toMatchObject({ initials: "AL", truck: "Truck 4", role: "tech", workingDays: ["mon", "tue", "wed", "thu", "fri"] })
    expect(made!.id).not.toBe(id)
    expect((await actions.saveSettings(now)).ok).toBe(true)
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

describe("services", () => {
  it("saves a changed description and price through services.update, one call per changed service, and leaves the rest", async () => {
    const ctx = ctxFor(db, owner)
    const before = (await callApi(ctx, servicesList, {})).data
    const repair = before.find((r) => r.key === "repair")!
    const blowout = before.find((r) => r.key === "blowout")!
    const items = before.map((r) => ({ ...liveService(r) }))
    const edited = items.map((i) => (i.key === "repair" ? { ...i, description: "Find the fault and fix it.", price: 150 } : i))
    const ok = await actions.saveSettings(await settingsOf(), edited)
    expect(ok.ok).toBe(true)
    const after = (await callApi(ctx, servicesList, {})).data
    expect(after.find((r) => r.key === "repair")).toMatchObject({ description: "Find the fault and fix it.", price: 150, name: repair.name, slotMinutes: repair.slotMinutes })
    expect(after.find((r) => r.key === "blowout")).toEqual(blowout)
    const refused = await actions.saveSettings(await settingsOf(), edited.map((i) => (i.key === "repair" ? { ...i, description: "Only $50" } : i)))
    expect(refused).toMatchObject({ ok: false })
    expect((await callApi(ctx, servicesList, {})).data.find((r) => r.key === "repair")!.description).toBe("Find the fault and fix it.")
  })
  it("deactivates a service from the catalogue and the live data keeps it, inactive", async () => {
    const ctx = ctxFor(db, owner)
    const rows = (await callApi(ctx, servicesList, {})).data
    const items = rows.map((r) => ({ ...liveService(r), ...(r.key === "consult" ? { active: false } : {}) }))
    expect((await actions.saveSettings(await settingsOf(), items)).ok).toBe(true)
    const live = await getLiveAdminData(ctx)
    expect(live.services?.find((x) => x.key === "consult")).toMatchObject({ active: false })
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
    await expect(actions.attentionAction({ kind: "unplaced", visitId: "v1", message: "x", since: "2027-01-01T00:00:00Z" })).rejects.toThrow("redirect:/admin/visits?visit=v1")
    await expect(actions.attentionAction({ kind: "new-pass", passId: "p1", message: "x", since: "2027-01-01T00:00:00Z" })).rejects.toThrow("redirect:/admin/visits")
    await expect(actions.attentionAction({ kind: "new-pass", passId: "p1", jobId: "job_p1", message: "x", since: "2027-01-01T00:00:00Z" })).rejects.toThrow("redirect:/admin/visits?job=job_p1")
  })

  it("takes a job that is done and owed to its done visit, where the panel records the payment", async () => {
    await expect(actions.attentionAction({ kind: "owed", key: "job-1", jobId: "job-1", visitId: "v9", message: "Andrea's repair is done, $145 owed", since: "2027-01-01T00:00:00Z" })).rejects.toThrow("redirect:/admin/visits?visit=v9")
  })

  it("Remind on an overdue bill calls invoices.remind; two presses in a day still send one message; a tech cannot press it", async () => {
    await db.update(s.customer).set({ email: "dana@example.com" }).where(eq(s.customer.id, "c100"))
    const ctx = ctxFor(db, owner)
    const made = await callApi(ctx, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-28", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))
    const bill = await callApi(ctx, invoicesSend, { jobId: made.jobId })
    const row = { kind: "overdue" as const, key: `invoice-${bill.id}@${bill.dueOn}`, invoiceId: bill.id, jobId: made.jobId, customerId: "c100", message: "Dana's bill of $145 was due May 4", since: "2027-05-04T18:00:00Z" }
    vi.mocked(callApi).mockClear()

    expect(await actions.attentionAction(row)).toEqual({ ok: true, data: undefined, message: "Reminder sent." })
    expect(calls("invoices.")).toEqual(["invoices.remind"])
    expect(await actions.attentionAction(row)).toEqual({ ok: true, data: undefined, message: "Reminder sent." })
    const reminders = (await db.select().from(s.messageLog)).filter((m) => m.kind === "invoice-reminder" && m.key === `invoice-${bill.id}-2027-04-20`)
    expect(reminders).toHaveLength(1)

    state.principal = tech
    await expect(actions.attentionAction(row)).rejects.toThrow("redirect:/admin/sign-in")
    expect((await db.select().from(s.messageLog)).filter((m) => m.kind === "invoice-reminder" && m.key?.startsWith(`invoice-${bill.id}`))).toHaveLength(1)
  })

  it("answers the API's words when the bill is already paid, and Dismiss clears the row by its bill-and-due-day key", async () => {
    const ctx = ctxFor(db, owner)
    const made = await callApi(ctx, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-01", price: 60 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))
    const bill = await callApi(ctx, invoicesSend, { jobId: made.jobId })
    await db.update(s.invoice).set({ paidOn: "2027-04-20" }).where(eq(s.invoice.id, bill.id))
    const row = { kind: "overdue" as const, key: `invoice-${bill.id}@${bill.dueOn}`, invoiceId: bill.id, customerId: "c100", message: "x", since: "2027-05-04T18:00:00Z" }
    expect(await actions.attentionAction(row)).toMatchObject({ ok: false, message: "This bill is already paid" })
    expect(await actions.dismissAttention(row)).toEqual({ ok: true, data: undefined })
    const [gone] = await db.select().from(s.adminAlert).where(eq(s.adminAlert.key, row.key))
    expect(gone).toMatchObject({ kind: "overdue", message: "Dismissed" })
  })
})
