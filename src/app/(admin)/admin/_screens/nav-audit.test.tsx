import { beforeAll, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { ADMIN_ROUTES } from "@/lib/admin/links"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import { HomeScreen } from "./HomeScreen"
import { ScheduleScreen } from "./ScheduleScreen"
import { VisitsScreen } from "./VisitsScreen"
import { CustomersScreen } from "./CustomersScreen"
import { ReportsScreen } from "./ReportsScreen"
import { SettingsScreen } from "./SettingsScreen"
import { VISITS_TODAY, noCardVisitId, passVisitId, visitsData } from "./visits-fixture"

// The navigation audit (Hannah, Nov 17 2026: "When I say Open pass, it leads to the open pass"): every link on every admin
// screen, with its panel open where it has one, goes to a page that is in the left column or off the site (tel, mailto,
// Stripe's hosted pages), never to a page that is not in the rail, and a link that names a record carries it.

const TODAY = "2026-11-12T19:56:30Z"
const snap = snapshot as AdminData

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

/** Every href in the document, panels and portals included. */
const hrefs = () => [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((a) => a.getAttribute("href")!)

const external = (href: string) => /^(https?:|tel:|mailto:|#)/.test(href)
const pathOf = (href: string) => href.split("?")[0]!.split("#")[0]!.replace(/\/$/, "") || "/"

function assertRoutes(found: string[]) {
  const bad = found.filter((h) => !external(h) && !(ADMIN_ROUTES as readonly string[]).includes(pathOf(h)))
  expect(bad, `links outside the left column: ${bad.join(", ")}`).toEqual([])
}

const wrap = (node: React.ReactNode) => render(<UndoToastProvider>{node}</UndoToastProvider>)

describe("every link on an admin screen goes to a page in the left column", () => {
  it("Home", () => {
    wrap(<HomeScreen data={snap} today={TODAY} />)
    const found = hrefs()
    expect(found.length).toBeGreaterThan(0)
    assertRoutes(found)
  })

  it("Schedule, the week and the day, with a visit panel open", () => {
    const stop = snap.visits.find((v) => v.startAt && v.status === "scheduled")!.id
    wrap(<ScheduleScreen data={snap} today={TODAY} defaultVisitId={stop} defaultSelectedId={stop} />)
    assertRoutes(hrefs())
  })

  it("Visits, with a pass visit's panel open, and filtered to a job", () => {
    wrap(<VisitsScreen data={visitsData} today={VISITS_TODAY} defaultVisitId={passVisitId} />)
    const found = hrefs()
    // the panel's job link opens that job's visits, and the Job column does the same for every row
    expect(found).toContain("/admin/visits?job=job_" + visitsData.passes.find((p) => visitsData.visits.find((v) => v.id === passVisitId)?.passId === p.id)!.id)
    assertRoutes(found)
  })

  it("Visits filtered to one job", () => {
    wrap(<VisitsScreen data={visitsData} today={VISITS_TODAY} defaultVisitId={noCardVisitId} jobId="job_p-office" />)
    assertRoutes(hrefs())
  })

  it("Customers, with a pass holder's panel open: the Job row and Open job's visits both go to that job's visits", () => {
    // visitsData carries the jobs the live data does; the snapshot keeps visits on its passes.
    const pass = visitsData.passes.find((p) => p.status === "active" && visitsData.visits.some((v) => v.passId === p.id && v.jobId))!
    const holder = visitsData.clients.find((c) => c.id === pass.clientId)!
    wrap(<CustomersScreen data={visitsData} today={VISITS_TODAY} defaultSelectedId={holder.id} />)
    const found = hrefs()
    // the Job row and the footer button: two links, the same place
    expect(found.filter((h) => h.startsWith("/admin/visits?job="))).toHaveLength(2)
    expect(found.some((h) => h.includes(pass.id) && h.includes("/admin/passes"))).toBe(false)
    assertRoutes(found)
  })

  it("Reports", () => {
    wrap(<ReportsScreen data={snap} today={TODAY} />)
    assertRoutes(hrefs())
  })

  it("Settings", () => {
    wrap(<SettingsScreen data={snap} today={TODAY} />)
    assertRoutes(hrefs())
  })

  it("nothing links to the Passes page", () => {
    wrap(<HomeScreen data={snap} today={TODAY} />)
    expect(hrefs().filter((h) => h.startsWith("/admin/passes"))).toEqual([])
  })
})
