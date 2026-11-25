import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { UnscheduledPanel } from "./UnscheduledPanel"
import { sortJobs } from "./unscheduled-model"
import { NOT_TOLD, UNSCHEDULED } from "./scheduler-panels-fixtures"

const XL = "(min-width: 1280px)"
function stub(wide: boolean) {
  vi.stubGlobal("matchMedia", vi.fn((q: string) => ({ matches: wide && (q === XL || q === "(min-width: 1024px)"), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
}
afterEach(() => vi.unstubAllGlobals())

const names = (ids: string[]) => ids.map((id) => UNSCHEDULED.find((j) => j.id === id)!.customer)

describe("sortJobs", () => {
  it("sorts oldest, newest and by name without changing its input", () => {
    expect(sortJobs(UNSCHEDULED, "oldest").map((j) => j.id)).toEqual(["u-1", "u-2", "u-3", "u-4"])
    expect(sortJobs(UNSCHEDULED, "newest").map((j) => j.id)).toEqual(["u-4", "u-3", "u-2", "u-1"])
    expect(sortJobs(UNSCHEDULED, "name").map((j) => j.id)).toEqual(["u-1", "u-2", "u-3", "u-4"])
    expect(names(["u-1"])).toEqual(["Andrea Reyes"])
    expect(UNSCHEDULED[0]!.id).toBe("u-1")
  })
})

describe("UnscheduledPanel docked", () => {
  it("is a non-modal aside with the count in its heading and a row per job", () => {
    stub(true)
    render(<UnscheduledPanel open onOpenChange={() => {}} jobs={UNSCHEDULED} notTold={NOT_TOLD} onFindATime={() => {}} />)
    const aside = screen.getByRole("complementary", { name: "Unscheduled (4)" })
    expect(aside).toHaveAttribute("data-mode", "docked")
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(within(aside).getAllByRole("listitem")).toHaveLength(4)
  })
  it("sorts by the control and reports Find a time", async () => {
    stub(true)
    const onFind = vi.fn()
    render(<UnscheduledPanel open onOpenChange={() => {}} jobs={UNSCHEDULED} onFindATime={onFind} />)
    await userEvent.click(screen.getByRole("radio", { name: "Newest" }))
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Dev Patel")
    await userEvent.click(screen.getByRole("button", { name: "Find a time for Dev Patel" }))
    expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ id: "u-4" }))
  })
  it("reports hover and focus on a row, and marks a row draggable only when given drag props", async () => {
    stub(true)
    const onHover = vi.fn()
    const { rerender } = render(<UnscheduledPanel open onOpenChange={() => {}} jobs={UNSCHEDULED} onFindATime={() => {}} onHover={onHover} />)
    const row = document.querySelector('[data-job="u-2"]')!
    expect(row).not.toHaveAttribute("data-draggable")
    await userEvent.hover(row)
    expect(onHover).toHaveBeenLastCalledWith("u-2")
    await userEvent.unhover(row)
    expect(onHover).toHaveBeenLastCalledWith(null)
    rerender(<UnscheduledPanel open onOpenChange={() => {}} jobs={UNSCHEDULED} onFindATime={() => {}} dragProps={(id) => ({ id: `drag-${id}` })} />)
    expect(document.querySelector('[data-job="u-2"]')).toHaveAttribute("data-draggable", "true")
    expect(document.getElementById("drag-u-2")).not.toBeNull()
  })
  it("says so when every job has a day", () => {
    stub(true)
    render(<UnscheduledPanel open onOpenChange={() => {}} jobs={[]} onFindATime={() => {}} />)
    expect(screen.getByText("Every job has a day.")).toBeInTheDocument()
  })
  it("lists the visits not told with Notify, Don't tell and Notify all", async () => {
    stub(true)
    const onNotify = vi.fn()
    const onDontTell = vi.fn()
    const onAll = vi.fn()
    render(<UnscheduledPanel open onOpenChange={() => {}} jobs={UNSCHEDULED} notTold={NOT_TOLD} defaultTab="not-told" onFindATime={() => {}} onNotify={onNotify} onDontTell={onDontTell} onNotifyAll={onAll} />)
    expect(screen.getByRole("tab", { name: "Not told 3" })).toHaveAttribute("aria-selected", "true")
    await userEvent.click(screen.getByRole("button", { name: "Notify Dana Reed" }))
    expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({ id: "n-2" }))
    await userEvent.click(screen.getByRole("button", { name: "Don't tell Percy Lund" }))
    expect(onDontTell).toHaveBeenCalledWith(expect.objectContaining({ id: "n-3" }))
    await userEvent.click(screen.getByRole("button", { name: "Notify all" }))
    expect(onAll).toHaveBeenCalledOnce()
  })
  it("has no Notify all with nothing to tell", () => {
    stub(true)
    render(<UnscheduledPanel open onOpenChange={() => {}} jobs={UNSCHEDULED} notTold={[]} defaultTab="not-told" onFindATime={() => {}} onNotifyAll={() => {}} />)
    expect(screen.queryByRole("button", { name: "Notify all" })).toBeNull()
    expect(screen.getByText("Everyone has been told.")).toBeInTheDocument()
  })
})

describe("UnscheduledPanel on a phone", () => {
  it("is a bottom sheet dialog", () => {
    stub(false)
    render(<UnscheduledPanel open onOpenChange={() => {}} jobs={UNSCHEDULED} onFindATime={() => {}} />)
    expect(screen.getByRole("dialog", { name: "Unscheduled (4)" })).toHaveAttribute("data-mode", "sheet")
  })
})
