import { describe, expect, it, vi } from "vitest"
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

describe("HomeScreen", () => {
  it("opens on the four jobs in order: Today, the money line, the map and Needs action", () => {
    render(<HomeScreen data={data} today={TODAY} />)
    const order = ["Today", "Money", "Map", "Needs action"].map((name) => screen.getByRole("heading", { name }))
    order.slice(1).forEach((h, i) => expect(order[i]!.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy())
    expect(screen.getByText(/^Thu, Nov 12 · \d+ visits? in /)).toBeInTheDocument()
    expect(document.querySelector('[data-slot="job-counts"]')).toBeNull()
    expect(document.querySelector('[data-slot="season-prompt"]')).toBeNull()
  })

  it("groups the day's stops by truck in route order, with the time or Any time, each row opening the visit, and leaves out a truck with none", () => {
    const visits = [
      stop({ id: "a", clientName: "Late Lee", startAt: "2026-11-12T18:00:00Z", startTime: "11:00", stopOrder: 2, truckId: "truck-1" }),
      stop({ id: "b", clientName: "First Fay", startAt: "2026-11-12T15:00:00Z", startTime: "08:00", stopOrder: 1, truckId: "truck-1" }),
      stop({ id: "c", clientName: "Any Amy", truckId: "truck-2" }),
    ]
    render(<HomeScreen data={{ ...data, visits, attention: [] }} today={TODAY} />)
    const week = within(document.querySelector<HTMLElement>('[data-slot="home-week"]')!)
    const names = week.getAllByRole("button").map((l) => l.textContent)
    expect(names[0]).toContain("First Fay")
    expect(names[1]).toContain("Late Lee")
    expect(names[2]).toContain("Any Amy")
    expect(week.getAllByText(/^Truck/)).toHaveLength(2)
    expect(week.getByText("Any time")).toBeInTheDocument()
  })

  it("with nothing today shows the next day that has visits, once, with its count and towns", () => {
    const visits = [
      stop({ id: "n1", clientName: "Next Nia", startAt: "2027-04-27T15:00:00Z", scheduledOn: "2027-04-27", truckId: "truck-1" }),
      stop({ id: "n2", clientName: "Next Ned", town: "Longmont", startAt: "2027-04-27T17:00:00Z", scheduledOn: "2027-04-27", truckId: "truck-2" }),
      stop({ id: "n3", clientName: "Later Lou", startAt: "2027-05-04T15:00:00Z", scheduledOn: "2027-05-04", truckId: "truck-1" }),
    ]
    render(<HomeScreen data={{ ...data, visits, attention: [] }} today={TODAY} />)
    expect(screen.getByText("Tue, Apr 27 · 2 visits in Erie and Longmont")).toBeInTheDocument()
    expect(screen.queryByText("No visits scheduled.")).toBeNull()
    expect(screen.queryByText(/Later Lou/)).toBeNull()
    expect(screen.getByText(/Next Nia/)).toBeInTheDocument()
  })

  it("says the calendar is empty once when nothing is ahead", () => {
    render(<HomeScreen data={{ ...data, visits: [], attention: [] }} today={TODAY} />)
    expect(screen.getAllByText(/Nothing is on the calendar yet/)).toHaveLength(1)
    expect(screen.queryByText(/No visits scheduled/)).toBeNull()
  })

  it("puts four figures on the money line, each a link to Reports or the filtered Visits list", () => {
    render(<HomeScreen data={data} today={TODAY} />)
    const money = within(document.querySelector<HTMLElement>('[data-slot="home-money"]')!)
    const links = money.getAllByRole("link")
    expect(links).toHaveLength(4)
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin/reports", "/admin/visits?money=unpaid,bill-sent", "/admin/visits?money=failed", "/admin/reports"])
    expect(links[0]).toHaveAccessibleName(/^Charged this month: \$/)
    expect(links[3]).toHaveAccessibleName(/^Season total committed: \$/)
  })

  it("gives every Needs action row its button and Dismiss, and Dismiss hides the row at once with Undo", async () => {
    const item: Attention = { kind: "not-closed", key: "v1", visitId: "v1", message: "Dana's repair on Nov 9 is not marked done", since: "2026-11-09T15:00:00Z" }
    const onDismiss = vi.fn().mockResolvedValue({ ok: true })
    const onAction = vi.fn().mockResolvedValue({ ok: true, message: "Marked done." })
    render(
      <UndoToastProvider>
        <HomeScreen data={{ ...data, attention: [item, { ...item, kind: "unplaced", key: "v2", visitId: "v2", message: "Sam's install has no day yet" }] }} today={TODAY} onAttentionAction={onAction} onDismiss={onDismiss} />
      </UndoToastProvider>,
    )
    expect(screen.getAllByRole("button", { name: /^Dismiss:/ })).toHaveLength(2)
    expect(screen.getByRole("button", { name: /^Mark done:/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Place:/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /^Dismiss: Dana/ }))
    expect(onDismiss).toHaveBeenCalledWith(item, false)
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }))
    expect(onDismiss).toHaveBeenLastCalledWith(item, true)
  })

  it("hands a tech the lists with no buttons", () => {
    render(<HomeScreen data={{ ...data, attention: [{ kind: "unplaced", key: "v2", visitId: "v2", message: "Sam's install has no day yet", since: "2026-11-09T15:00:00Z" }] }} today={TODAY} readOnly />)
    expect(screen.queryByRole("button", { name: /Dismiss/ })).toBeNull()
  })
})
