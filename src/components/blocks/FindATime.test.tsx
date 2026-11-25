import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FindATime, type FindATimeProps } from "./FindATime"
import { FORCED, OPENINGS } from "./scheduler-panels-fixtures"

const base: FindATimeProps = { state: "results", openings: OPENINGS, forced: FORCED, sort: "recommended", onSort: () => {}, onPick: () => {} }
const rows = () => screen.getAllByRole("radio").filter((r) => r.getAttribute("data-slot") === "opening")

describe("FindATime", () => {
  it("before an address, says what to add and turns the button off", () => {
    render(<FindATime {...base} state="no-address" />)
    expect(screen.getByText("Add an address to find a time")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Find a time" })).toBeDisabled()
  })
  it("while searching, shows skeleton rows and says it is busy", () => {
    render(<FindATime {...base} state="searching" />)
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
    expect(screen.queryAllByRole("radio")).toHaveLength(0)
  })
  it("lists the openings with the day, the range, the person and the added minutes, one marked Recommended", () => {
    render(<FindATime {...base} />)
    expect(rows()).toHaveLength(5)
    expect(rows()[0]).toHaveTextContent("Wed, Dec 2")
    expect(rows()[0]).toHaveTextContent("1:00 to 2:00 pm")
    expect(rows()[0]).toHaveTextContent("adds 3 min")
    expect(rows()[0]).toHaveTextContent("Next to a Longmont visit")
    expect(screen.getAllByText("Recommended").filter((el) => el.tagName === "SPAN" && el.className.includes("rounded-full"))).toHaveLength(1)
  })
  it("sorts by the control, and tells the screen", async () => {
    const onSort = vi.fn()
    const { rerender } = render(<FindATime {...base} onSort={onSort} />)
    await userEvent.click(screen.getByRole("radio", { name: "Least driving" }))
    expect(onSort).toHaveBeenCalledWith("least-driving")
    rerender(<FindATime {...base} sort="soonest" />)
    expect(rows()[0]).toHaveTextContent("Mon, Nov 30")
    // the recommended row is the same one whatever the sort
    expect(rows().find((r) => r.hasAttribute("data-recommended"))).toHaveTextContent("Wed, Dec 2")
  })
  it("picks a row and marks it checked", async () => {
    const onPick = vi.fn()
    const { rerender } = render(<FindATime {...base} onPick={onPick} />)
    await userEvent.click(rows()[1]!)
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "o-2" }))
    rerender(<FindATime {...base} selectedId="o-2" />)
    expect(rows()[1]).toHaveAttribute("aria-checked", "true")
  })
  it("keeps the forced rows behind Show all times, greyed with their conflict, and asks for a tick on one", async () => {
    const onTick = vi.fn()
    const { rerender } = render(<FindATime {...base} onForcedTicked={onTick} />)
    expect(screen.queryByText("Ryan has Dry Creek Rd at 3:00 pm.")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Show all times (3 more)" }))
    expect(screen.getByText("Ryan has Dry Creek Rd at 3:00 pm.")).toBeInTheDocument()
    expect(rows()).toHaveLength(8)
    expect(rows()[5]).toHaveAttribute("data-forced")
    expect(screen.queryByRole("checkbox", { name: "Book it anyway" })).toBeNull()
    rerender(<FindATime {...base} selectedId="f-1" onForcedTicked={onTick} />)
    await userEvent.click(screen.getByRole("checkbox", { name: "Book it anyway" }))
    expect(onTick).toHaveBeenCalledWith(true)
  })
  it("shows the grey note only for estimated drive times", () => {
    const { rerender } = render(<FindATime {...base} estimated />)
    expect(screen.getByText("Estimated drive times")).toBeInTheDocument()
    rerender(<FindATime {...base} estimated={false} />)
    expect(screen.queryByText("Estimated drive times")).toBeNull()
  })
  it("says when nothing is open and when the address is outside the six towns", () => {
    const { rerender } = render(<FindATime {...base} state="none" noneBefore="Nov 30" />)
    expect(screen.getByText("No open day before Nov 30.")).toBeInTheDocument()
    rerender(<FindATime {...base} state="outside" />)
    expect(screen.getByText("Outside the six towns.")).toBeInTheDocument()
  })
  it("moves the pick with the arrow keys", async () => {
    const onPick = vi.fn()
    render(<FindATime {...base} selectedId="o-3" onPick={onPick} />)
    rows()[0]!.focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(onPick).toHaveBeenCalledOnce()
  })
})
