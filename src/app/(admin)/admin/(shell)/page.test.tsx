// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { ReactElement } from "react"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { apiKeysCreate } from "@/api/v1/apikeys/handlers"
import { apiDb, ctxFor, owner, tech } from "@/api/test-helpers"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"

// Every admin page, rendered against the seeded in-memory database as the signed-in person: the guard and the
// session's context are the only things stood in for. The seed carries the fixture passes, so each page shows data.
const state = vi.hoisted(() => ({ db: null as unknown, principal: null as unknown }))
vi.mock("@/lib/auth/guard", () => ({ requireAdmin: async () => state.principal }))
vi.mock("@/lib/admin/api-ctx", async () => {
  const { ctxFor } = await import("@/api/test-helpers")
  return { ctxFromSession: async () => ctxFor(state.db as never, state.principal as never) }
})

import HomePage from "./page"
import SchedulePage from "./schedule/page"
import PassesPage from "./passes/page"
import ReportsPage from "./reports/page"
import VisitsPage from "./visits/page"
import RevenuePage from "./revenue/page"
import CustomersPage from "./customers/page"
import SettingsPage from "./settings/page"
import { loadKeys } from "./settings-keys"

const fixture = snapshot as AdminData
let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  state.db = db
  state.principal = owner
})
afterAll(() => db.close())

const html = (page: ReactElement) => renderToStaticMarkup(page)
const search = <T,>(params: T) => ({ searchParams: Promise.resolve(params) })

describe("the admin pages", () => {
  it("Home greets and lists today's work", async () => {
    const out = html(await HomePage())
    expect(out).toContain('data-slot="home-screen"')
    expect(out).toContain("Needs action")
  })

  it("Schedule shows the week and takes ?week=, ?day= and ?visit=", async () => {
    const out = html(await SchedulePage(search({})))
    expect(out).toContain('data-slot="schedule-screen"')
    const first = fixture.visits.find((v) => v.startAt)!
    const onDay = html(await SchedulePage(search({ day: first.startAt!.slice(0, 10) })))
    expect(onDay).toContain('data-slot="schedule-screen"')
    const one = html(await SchedulePage(search({ week: "2027-05-03", visit: "p4-turn-on", day: "not a day" })))
    expect(one).toContain('data-slot="schedule-screen"')
  })

  it("Passes lists the seeded passes and opens the one in ?pass=", async () => {
    const out = html(await PassesPage(search({})))
    expect(out).toContain('data-slot="passes-screen"')
    expect(out).toContain(fixture.passes[0]!.firstName)
    expect(out).toContain("1 cancelled")
    expect(html(await PassesPage(search({ pass: "p1" })))).toContain('data-slot="passes-screen"')
  })

  it("Reports holds Home's old numbers and Revenue's content, and /admin/revenue redirects to it", async () => {
    const out = html(await ReportsPage())
    expect(out).toContain('data-slot="reports-screen"')
    expect(out).toContain('data-slot="revenue-screen"')
    expect(out).toContain("Revenue this month")
    expect(() => RevenuePage()).toThrow(/NEXT_REDIRECT/)
  })

  it("Visits lists the seeded passes' visits and opens the one in ?visit=", async () => {
    const out = html(await VisitsPage(search({})))
    expect(out).toContain('data-slot="visits-screen"')
    expect(out).toContain("New visit")
    expect(html(await VisitsPage(search({ visit: "p3-turn-on" })))).toContain('data-slot="visits-screen"')
  })

  it("Customers and Settings render with data", async () => {
    const customers = html(await CustomersPage(search({})))
    expect(customers).toContain('data-slot="customers-screen"')
    const settings = html(await SettingsPage())
    expect(settings).toContain('data-slot="settings-screen"')
    expect(settings).toContain("Truck 1")
  })

  it("lists the live API keys on Settings in the tab's words", async () => {
    await callApi(ctxFor(db, owner), apiKeysCreate, { name: "Day view on the phones", scopes: ["read", "write"] })
    // The keys tab is not drawn until it is opened, so read what the page hands the screen.
    const keys = await loadKeys(owner)
    expect(keys).toEqual([expect.objectContaining({ name: "Day view on the phones", scopes: ["read", "write-passes", "write-schedule", "send-messages"] })])
    expect(await loadKeys(tech)).toEqual([])
  })

  it("renders for a tech too, who reads the same data and sees no buttons", async () => {
    state.principal = tech
    try {
      expect(html(await PassesPage(search({})))).toContain('data-slot="passes-screen"')
      const settings = html(await SettingsPage())
      expect(settings).toContain("You can read the settings. A manager changes them.")
      expect(settings).not.toContain(">Save<")
      expect(html(await HomePage())).not.toContain('data-slot="attention-action"')
      expect(html(await SchedulePage(search({})))).not.toContain("Schedule 1 visit")
    } finally {
      state.principal = owner
    }
  })
})
