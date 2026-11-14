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
  it("shows only the day lists and Needs action", () => {
    render(<HomeScreen data={data} today={TODAY} />)
    expect(screen.getByRole("heading", { name: /Today, Thursday 12/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /Tomorrow, Friday 13/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Needs action" })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="job-counts"]')).toBeNull()
    expect(document.querySelector('[data-slot="season-prompt"]')).toBeNull()
  })

  it("groups each day's stops by truck in order, with the time or Any time, each row opening the visit", () => {
    const visits = [
      stop({ id: "a", clientName: "Late Lee", startAt: "2026-11-12T18:00:00Z", startTime: "11:00", stopOrder: 2, truckId: "truck-1" }),
      stop({ id: "b", clientName: "First Fay", startAt: "2026-11-12T15:00:00Z", startTime: "08:00", stopOrder: 1, truckId: "truck-1" }),
      stop({ id: "c", clientName: "Any Amy", truckId: "truck-2" }),
      stop({ id: "d", clientName: "Tomorrow Tim", startAt: "2026-11-13T15:00:00Z", scheduledOn: "2026-11-13", truckId: "truck-1" }),
    ]
    render(<HomeScreen data={{ ...data, visits, attention: [] }} today={TODAY} />)
    const today = within(document.querySelector<HTMLElement>('[aria-labelledby="home-today"]')!)
    const names = today.getAllByRole("button").map((l) => l.textContent)
    expect(names[0]).toContain("First Fay")
    expect(names[1]).toContain("Late Lee")
    expect(names[2]).toContain("Any Amy")
    expect(today.getAllByText(/^Truck/)).toHaveLength(2)
    expect(today.getByText("Any time")).toBeInTheDocument()
    expect(today.getByRole("button", { name: /First Fay/ })).toBeInTheDocument()
    expect(within(document.querySelector<HTMLElement>('[aria-labelledby="home-tomorrow"]')!).getByText(/Tomorrow Tim/)).toBeInTheDocument()
  })

  it("gives every Needs action row its button and Dismiss, and Dismiss hides the row at once with Undo", async () => {
    const item: Attention = { kind: "not-closed", key: "v1", visitId: "v1", message: "Dana's repair on Nov 9 is not marked done", since: "2026-11-09T15:00:00Z" }
    const onDismiss = vi.fn().mockResolvedValue({ ok: true })
    const onAction = vi.fn().mockResolvedValue({ ok: true, message: "Marked done." })
    render(
      <UndoToastProvider>
        <HomeScreen data={{ ...data, attention: [item, { ...item, kind: "unplaced", key: "v2", visitId: "v2", message: "Sam's install needs a day" }] }} today={TODAY} onAttentionAction={onAction} onDismiss={onDismiss} />
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
    render(<HomeScreen data={{ ...data, attention: [{ kind: "unplaced", key: "v2", visitId: "v2", message: "Sam's install needs a day", since: "2026-11-09T15:00:00Z" }] }} today={TODAY} readOnly />)
    expect(screen.queryByRole("button", { name: /Dismiss/ })).toBeNull()
  })
})
