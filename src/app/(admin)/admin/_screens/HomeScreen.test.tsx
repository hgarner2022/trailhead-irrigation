import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Attention, Visit } from "@/lib/admin/types"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import { HomeScreen } from "./HomeScreen"

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

const stop = (over: Partial<Visit>): Visit => ({
  id: "v", clientId: "c", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "",
  scheduledOn: "2026-11-12", startAt: "2026-11-12T15:00:00Z", ...over,
})

const GROUPS = ["Past its window", "Ahead today", "Done today"]
const dayVisits: Visit[] = [
  stop({ id: "past", clientName: "Pat Late", startAt: "2026-11-12T15:00:00Z", startTime: "08:00", stopOrder: 1, personId: "person_truck-1", price: 145 }),
  stop({ id: "later", clientName: "Lee Later", town: "Longmont", startAt: "2026-11-12T20:30:00Z", startTime: "13:30", stopOrder: 2, personId: "person_truck-1", price: 95 }),
  stop({ id: "finished", clientName: "Fay Finished", status: "completed", completedOn: "2026-11-12", startAt: "2026-11-12T16:00:00Z", startTime: "09:00", personId: "person_truck-2", price: 100, payments: [{ id: "pay", visitId: "finished", amount: 100, method: "venmo", status: "succeeded" }] }),
  stop({ id: "owes", clientName: "Owen Owes", status: "completed", completedOn: "2026-11-12", startAt: "2026-11-12T17:00:00Z", startTime: "10:00", personId: "person_truck-2", price: 145, payments: [] }),
]
const withDay = (visits: Visit[]): AdminData => ({ ...data, visits, attention: [], jobs: undefined })

describe("HomeScreen", () => {
  beforeEach(() => window.localStorage.clear())

  it("opens on Today over the date, the money strip, today's jobs, the map and Needs action in that order", () => {
    render(<HomeScreen data={withDay(dayVisits)} today={TODAY} />)
    const order = ["Today\u2019s money", "Today\u2019s jobs", "Map", "Needs action"].map((name) => screen.getByRole("heading", { name }))
    order.slice(1).forEach((h, i) => expect(order[i]!.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy())
    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument()
    expect(screen.getByText("Thursday, November 12")).toBeInTheDocument()
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull()
    expect(document.querySelector('[data-slot="home-money"]')).toBeNull()
  })

  it("shows the strip's four figures, from the visits' own lines, and a View schedule link to today", () => {
    render(<HomeScreen data={withDay(dayVisits)} today={TODAY} />)
    const strip = within(document.querySelector<HTMLElement>('[data-slot="today-money"]')!)
    const figure = (label: string) => strip.getByRole("group", { name: label }).querySelector('[data-slot="stat-value"]')!.textContent
    expect([figure("Today"), figure("Done"), figure("Ahead"), figure("Unpaid")]).toEqual(["$485", "$245", "$240", "$145"])
    expect(strip.getByRole("link", { name: "View schedule" })).toHaveAttribute("href", "/admin/schedule?day=2026-11-12")
  })

  it("lists today's jobs in the three groups, with counts in their headings, and nothing else", () => {
    render(<HomeScreen data={withDay(dayVisits)} today={TODAY} />)
    const headings = within(document.querySelector<HTMLElement>('[data-slot="today-visits"]')!).getAllByRole("heading").map((h) => h.textContent)
    expect(headings).toEqual(["1 past its window", "1 ahead today", "2 done today"])
    expect(GROUPS.length).toBe(3)
    expect(screen.queryByText(/Past due|Active|Remaining|Completed/)).toBeNull()
    const past = within(document.querySelector<HTMLElement>('[data-group="past"]')!)
    expect(past.getByRole("button", { name: /8 to 10 am.*Pat.*Erie.*Repair/ })).toBeInTheDocument()
  })

  it("strikes through a done visit's customer line and puts the money word at its right", () => {
    render(<HomeScreen data={withDay(dayVisits)} today={TODAY} />)
    const done = within(document.querySelector<HTMLElement>('[data-group="done"]')!)
    expect(done.getByText("Fay").closest("span.line-through")).not.toBeNull()
    expect(done.getByText("Paid, Venmo")).toBeInTheDocument()
    expect(done.getByText("$145 unpaid")).toBeInTheDocument()
  })

  it("says Nothing here in a group with no visit", () => {
    render(<HomeScreen data={withDay([dayVisits[1]!])} today={TODAY} />)
    expect(within(document.querySelector<HTMLElement>('[data-group="past"]')!).getByText("Nothing here")).toBeInTheDocument()
    expect(within(document.querySelector<HTMLElement>('[data-group="done"]')!).getByText("Nothing here")).toBeInTheDocument()
  })

  it("switches to By person: each person's day under their name in route order, kept for the next visit to the page", async () => {
    const { unmount } = render(<HomeScreen data={withDay(dayVisits)} today={TODAY} />)
    await userEvent.click(screen.getByRole("tab", { name: "By person" }))
    const people = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="today-person"]'))
    expect(people.map((p) => p.querySelector("h3")!.textContent)).toEqual(["Ryan Garner2 stops", "Tech Two2 stops"])
    expect(within(people[0]!).getAllByRole("button").map((b) => b.textContent)).toEqual([expect.stringContaining("Pat"), expect.stringContaining("Lee")])
    expect(Array.from(people[0]!.querySelectorAll('[data-slot="route-number"]')).map((n) => n.textContent)).toEqual(["Stop 1", "Stop 2"])
    expect(window.localStorage.getItem("trailhead.home.today-view")).toBe("person")
    unmount()
    render(<HomeScreen data={withDay(dayVisits)} today={TODAY} />)
    expect(await screen.findByRole("tab", { name: "By person", selected: true })).toBeInTheDocument()
  })

  it("still works when the browser will not store the choice", async () => {
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    render(<HomeScreen data={withDay(dayVisits)} today={TODAY} />)
    await userEvent.click(screen.getByRole("tab", { name: "By person" }))
    expect(screen.getByRole("tab", { name: "By person", selected: true })).toBeInTheDocument()
    set.mockRestore()
  })

  it("with nothing booked says so, points at the Schedule, and says when the next jobs are, once", () => {
    const visits = [stop({ id: "n1", clientName: "Next Nia", startAt: "2027-04-27T15:00:00Z", scheduledOn: "2027-04-27", personId: "person_truck-1" })]
    render(<HomeScreen data={withDay(visits)} today={TODAY} />)
    expect(screen.getByText("Nothing booked today.")).toBeInTheDocument()
    expect(screen.getByText("Jobs with no day wait on the Schedule.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Schedule" })).toHaveAttribute("href", "/admin/schedule")
    expect(screen.queryByRole("tab")).toBeNull()
    expect(screen.getByRole("link", { name: "Tue, Apr 27 · 1 stop in Erie" })).toHaveAttribute("href", "/admin/schedule?day=2027-04-27")
    expect(screen.queryByText(/Next Nia/)).toBeNull()
  })

  it("hands a tech the same day and the same rows", () => {
    render(<HomeScreen data={withDay(dayVisits)} today={TODAY} readOnly />)
    expect(screen.getByRole("button", { name: /Pat/ })).toBeInTheDocument()
  })

  it("gives every Needs action row its button and Dismiss, and Dismiss hides the row at once with Undo", async () => {
    const item: Attention = { kind: "not-closed", key: "v1", visitId: "v1", message: "Dana's repair on Nov 9 is not marked done", since: "2026-11-09T15:00:00Z" }
    const onDismiss = vi.fn().mockResolvedValue({ ok: true })
    const onAction = vi.fn().mockResolvedValue({ ok: true, message: "Marked done." })
    render(
      <UndoToastProvider>
        <HomeScreen data={{ ...data, attention: [item, { ...item, kind: "unplaced", key: "v2", visitId: "v2", message: "Sam's install is unscheduled" }] }} today={TODAY} onAttentionAction={onAction} onDismiss={onDismiss} />
      </UndoToastProvider>,
    )
    expect(screen.getAllByRole("button", { name: /^Dismiss:/ })).toHaveLength(2)
    expect(screen.getByRole("button", { name: /^Mark done:/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Schedule:/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /^Dismiss: Dana/ }))
    expect(onDismiss).toHaveBeenCalledWith(item, false)
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }))
    expect(onDismiss).toHaveBeenLastCalledWith(item, true)
  })

  it("hands a tech the lists with no buttons", () => {
    render(<HomeScreen data={{ ...data, attention: [{ kind: "unplaced", key: "v2", visitId: "v2", message: "Sam's install is unscheduled", since: "2026-11-09T15:00:00Z" }] }} today={TODAY} readOnly />)
    expect(screen.queryByRole("button", { name: /Dismiss/ })).toBeNull()
  })

  describe("Needs action opens its record in place", () => {
    beforeEach(() => {
      window.history.replaceState(null, "", "/admin")
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
      vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
    })
    const row = (item: Attention) => ({ ...data, attention: [item] })

    it("a row about one stop opens that stop's panel over Home, with the address updated, and goes nowhere", async () => {
      const visit = data.visits.find((v) => v.startAt)!
      const item: Attention = { kind: "not-closed", key: visit.id, visitId: visit.id, message: "Dana's repair on Nov 9 is not marked done", since: "2026-11-09T15:00:00Z" }
      render(<HomeScreen data={row(item)} today={TODAY} visitActions={{} as never} />)
      await userEvent.click(screen.getByRole("link", { name: /Dana's repair/ }))
      expect(await screen.findByRole("dialog")).toBeInTheDocument()
      expect(new URLSearchParams(window.location.search).get("visit")).toBe(visit.id)
      expect(window.location.pathname).toBe("/admin")
    })

    it("a row about a customer opens the customer's panel, and one about a job opens the job's", async () => {
      const customer = data.clients[0]!
      const item: Attention = { kind: "charge-failed", key: "c", customerId: customer.id, message: "The card failed", since: "2026-11-09T15:00:00Z" }
      const { unmount } = render(<HomeScreen data={row(item)} today={TODAY} visitActions={{} as never} />)
      await userEvent.click(screen.getByRole("link", { name: /The card failed/ }))
      await screen.findByRole("dialog")
      expect(new URLSearchParams(window.location.search).get("customer")).toBe(customer.id)
      unmount()
      window.history.replaceState(null, "", "/admin")
      const job: Attention = { kind: "overdue", key: "j", jobId: "job-1", message: "Invoice is past due", since: "2026-11-09T15:00:00Z" }
      render(<HomeScreen data={row(job)} today={TODAY} visitActions={{} as never} />)
      await userEvent.click(screen.getByRole("link", { name: /Invoice is past due/ }))
      expect(new URLSearchParams(window.location.search).get("job")).toBe("job-1")
    })

    it("says Nothing needs you with no rows", () => {
      render(<HomeScreen data={{ ...data, attention: [] }} today={TODAY} />)
      expect(screen.getByText("Nothing needs you.")).toBeInTheDocument()
    })
  })
})
