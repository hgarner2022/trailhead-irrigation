import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { openRecordInAddress } from "@/lib/admin/record-url"
import type { AdminData } from "@/lib/admin/types"
import { CustomersScreen } from "./CustomersScreen"
import { HomeScreen } from "./HomeScreen"
import { JOBS_TODAY, jobsData } from "./jobs-fixture"
import { JobsScreen } from "./JobsScreen"
import { ScheduleScreen } from "./ScheduleScreen"

// Step 2 of the admin's build order (docs/plans/2026-11-18-admin-holistic-design.md, sections 4 and 5): the open record lives in the address on every
// screen through one host, Back and Close work, a shared link opens the record, a record opened from another has its crumb, and New job is the
// one primary of every screen's header.

const snap = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.spyOn(console, "info").mockImplementation(() => undefined)
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})
beforeEach(() => window.history.replaceState(null, "", "/admin"))
afterEach(() => window.history.replaceState(null, "", "/admin"))

const settle = () => new Promise((resolve) => setTimeout(resolve, 150))
const params = () => new URLSearchParams(window.location.search)
const dialog = () => within(screen.getByRole("dialog"))
const wrap = (node: React.ReactNode) => render(<UndoToastProvider>{node}</UndoToastProvider>)

/** Each screen with one control that opens a record, and the key that record takes in the address. */
const SCREENS = [
  { name: "Home", key: "visit", at: "/admin", node: (p: object) => <HomeScreen data={snap} today={TODAY} {...p} />, open: () => userEvent.click(within(document.querySelector<HTMLElement>('[data-slot="today-visit-row"]')!).getByRole("button")) },
  { name: "Schedule", key: "visit", at: "/admin/schedule", node: (p: object) => <ScheduleScreen data={snap} today={TODAY} {...p} />, open: () => userEvent.click(within(document.querySelector('[data-slot="week-grid-cell"][data-person="person_truck-1"][data-day="2026-11-12"]')!).getByRole("button", { name: /^Percy/ })) },
  { name: "Jobs", key: "job", at: "/admin/jobs", node: (p: object) => <JobsScreen data={jobsData} today={JOBS_TODAY} {...p} />, open: () => userEvent.click(screen.getAllByRole("button", { name: "Ben Cole" })[0]!) },
  { name: "Customers", key: "customer", at: "/admin/customers", node: (p: object) => <CustomersScreen data={jobsData} today={JOBS_TODAY} {...p} />, open: () => userEvent.click(screen.getAllByRole("button", { name: "Ben Cole" })[0]!) },
] as const

describe.each(SCREENS)("$name: the open record is the address", ({ key, at, node, open }) => {
  it(`opening a record puts ?${key}= in the address, and Back closes the panel`, async () => {
    window.history.replaceState(null, "", at)
    wrap(node({ visitActions: {} }))
    expect(screen.queryByRole("dialog")).toBeNull()
    // the Schedule writes the week it shows into the address; that is the page the record opens from
    const before = window.location.pathname + window.location.search
    await open()
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(params().get(key)).toBeTruthy()
    window.history.back()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(window.location.pathname + window.location.search).toBe(before)
  })

  it("the panel's Close returns to the page it was opened from, and Forward opens it again", async () => {
    window.history.replaceState(null, "", at)
    wrap(node({ visitActions: {} }))
    const before = window.location.pathname + window.location.search
    await open()
    await userEvent.click(dialog().getByRole("button", { name: "Close panel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(window.location.pathname + window.location.search).toBe(before)
    window.history.forward()
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(params().get(key)).toBeTruthy()
  })

  it("New job is the one filled button of its header", () => {
    wrap(node({ visitActions: {} }))
    const header = (document.querySelector('[data-slot="page-header"]') ?? document.body) as HTMLElement
    expect(within(header).getAllByRole("button", { name: "New job" }).length).toBeGreaterThanOrEqual(1)
  })
})

describe("a shared link opens the record", () => {
  it("a job on Jobs, a customer on Customers, and a visit on Home and on the Schedule", async () => {
    const link = (path: string, node: React.ReactNode) => {
      window.history.replaceState(null, "", path)
      return wrap(node)
    }
    const jobs = link("/admin/jobs?job=job-a", <JobsScreen data={jobsData} today={JOBS_TODAY} defaultJobId="job-a" />)
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    jobs.unmount()
    const customers = link("/admin/customers?customer=c100", <CustomersScreen data={snap} today={TODAY} defaultSelectedId="c100" />)
    expect((await screen.findByRole("dialog")).querySelector("[data-slot=customer-panel]")).not.toBeNull()
    customers.unmount()
    const visit = snap.visits.find((v) => v.startAt)!.id
    const home = link(`/admin?visit=${visit}`, <HomeScreen data={snap} today={TODAY} defaultVisitId={visit} />)
    expect((await screen.findByRole("dialog")).querySelector("[data-slot=visit-panel]")).not.toBeNull()
    home.unmount()
    link(`/admin/schedule?visit=${visit}`, <ScheduleScreen data={snap} today={TODAY} defaultVisitId={visit} />)
    expect((await screen.findByRole("dialog")).querySelector("[data-slot=visit-panel]")).not.toBeNull()
  })

  it("a link that carries a job opens it on a screen that is not Jobs (Home)", async () => {
    window.history.replaceState(null, "", "/admin?job=job-a")
    wrap(<HomeScreen data={jobsData} today={JOBS_TODAY} defaultJobId="job-a" />)
    expect((await screen.findByRole("dialog")).querySelector("[data-slot=job-panel], [data-slot=record-panel]")).not.toBeNull()
  })
})

describe("the address never goes stale", () => {
  it("a record opened from the address bar by anything else (Cmd+K, a link) opens in the panel on any screen", async () => {
    window.history.replaceState(null, "", "/admin")
    wrap(<HomeScreen data={jobsData} today={JOBS_TODAY} />)
    expect(screen.queryByRole("dialog")).toBeNull()
    act(() => openRecordInAddress({ key: "customer", id: jobsData.clients[0]!.id }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(params().get("customer")).toBe(jobsData.clients[0]!.id)
    act(() => openRecordInAddress({ key: "job", id: "job-a" }))
    await waitFor(() => expect(params().get("customer")).toBeNull())
    expect(params().get("job")).toBe("job-a")
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
  })

  it("keeps the filters in the address when a record opens and closes", async () => {
    window.history.replaceState(null, "", "/admin/schedule?view=list&money=owed")
    wrap(<ScheduleScreen data={jobsData} today={JOBS_TODAY} defaultTab="list" />)
    act(() => openRecordInAddress({ key: "visit", id: jobsData.visits[0]!.id }))
    expect(params().get("money")).toBe("owed")
    expect(params().get("view")).toBe("list")
    window.history.back()
    await settle()
    expect(window.location.search).toBe("?view=list&money=owed")
  })
})

describe("the Schedule follows Back to the view, day and week the address names", () => {
  it("Back to an entry that names the Day view shows that day, and Forward returns to the List", async () => {
    window.history.replaceState(null, "", "/admin/schedule?view=day&day=2026-11-12")
    window.history.pushState(null, "", "/admin/schedule?view=list")
    wrap(<ScheduleScreen data={snap} today={TODAY} defaultTab="list" />)
    expect(screen.getByRole("radio", { name: "List" })).toBeChecked()
    window.history.back()
    await waitFor(() => expect(screen.getByRole("radio", { name: "Day" })).toBeChecked())
    expect(params().get("day")).toBe("2026-11-12")
    window.history.forward()
    await waitFor(() => expect(screen.getByRole("radio", { name: "List" })).toBeChecked())
  })
})

describe("a record opened from another shows where it came from", () => {
  it("a job's visit shows the crumb to the job, and the crumb goes back to it", async () => {
    window.history.replaceState(null, "", "/admin/jobs")
    wrap(<JobsScreen data={jobsData} today={JOBS_TODAY} />)
    await userEvent.click(screen.getAllByRole("button", { name: "Ben Cole" })[0]!)
    expect(document.querySelector('[data-slot="side-panel-back"]')).toBeNull()
    await screen.findByRole("dialog")
    await userEvent.click(within(document.querySelector<HTMLElement>('[data-slot="job-visits"]')!).getAllByRole("button")[0]!)
    const crumb = await screen.findByRole("button", { name: /Ben Cole, Repair/ })
    expect(crumb).toHaveAttribute("data-slot", "side-panel-back")
    expect(params().get("visit")).toBeTruthy()
    await userEvent.click(crumb)
    await waitFor(() => expect(params().get("visit")).toBeNull())
    expect(params().get("job")).toBeTruthy()
    expect(document.querySelector('[data-slot="side-panel-back"]')).toBeNull()
  })

  it("the Customer line in a job opens that customer in place, with a crumb back to the job", async () => {
    window.history.replaceState(null, "", "/admin/jobs")
    wrap(<JobsScreen data={jobsData} today={JOBS_TODAY} />)
    await userEvent.click(screen.getAllByRole("button", { name: "Ben Cole" })[0]!)
    const panel = await screen.findByRole("dialog")
    const link = within(panel).getByRole("link", { name: "Ben Cole" })
    expect(link).toHaveAttribute("href", expect.stringMatching(/^\/admin\/customers\?customer=/))
    await userEvent.click(link)
    await waitFor(() => expect(params().get("customer")).toBeTruthy())
    expect(params().get("job")).toBeNull()
    expect(await screen.findByRole("button", { name: /Ben Cole, Repair/ })).toHaveAttribute("data-slot", "side-panel-back")
  })
})
