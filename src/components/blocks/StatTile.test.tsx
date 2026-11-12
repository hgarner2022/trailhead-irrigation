import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatTile } from "./StatTile"

const tile = () => document.querySelector<HTMLElement>('[data-slot="stat-tile"]') as HTMLElement
const deltaLine = () => tile().querySelector<HTMLElement>('[data-slot="stat-delta"]')
const polylines = () => Array.from(tile().querySelectorAll("polyline"))

describe("StatTile", () => {
  it("renders the label, the value and the delta against its named baseline", () => {
    render(<StatTile label="October revenue" value="$18,365" delta={{ value: 12, baseline: "October 2025", goodWhen: "up" }} />)
    expect(screen.getByText("October revenue")).toBeInTheDocument()
    expect(screen.getByText("$18,365")).toBeInTheDocument()
    expect(screen.getByText("+12% vs October 2025")).toBeInTheDocument()
  })

  it("colours a rise that is good for the business positive", () => {
    render(<StatTile label="Revenue" value="$1" delta={{ value: 12, baseline: "last month", goodWhen: "up" }} />)
    expect(deltaLine()).toHaveClass("text-positive")
  })

  it("colours a fall that is good for the business positive", () => {
    render(<StatTile label="Invoices past due" value="3" delta={{ value: -8, baseline: "last month", goodWhen: "down" }} />)
    expect(deltaLine()).toHaveClass("text-positive")
    expect(deltaLine()).toHaveTextContent("-8% vs last month")
  })

  it("colours a fall that is bad for the business warning", () => {
    render(<StatTile label="Revenue" value="$1" delta={{ value: -8, baseline: "last month", goodWhen: "up" }} />)
    expect(deltaLine()).toHaveClass("text-warning")
  })

  it("colours a rise that is bad for the business warning", () => {
    render(<StatTile label="Invoices past due" value="5" delta={{ value: 20, baseline: "last month", goodWhen: "down" }} />)
    expect(deltaLine()).toHaveClass("text-warning")
  })

  it("keeps a zero delta muted", () => {
    render(<StatTile label="Revenue" value="$1" delta={{ value: 0, baseline: "last month", goodWhen: "up" }} />)
    expect(deltaLine()).toHaveClass("text-muted-foreground")
    expect(deltaLine()).toHaveTextContent("0% vs last month")
  })

  it("says there is no comparison yet when the baseline has no number", () => {
    render(<StatTile label="October revenue" value="$18,365" delta={{ value: null, baseline: "October 2025", goodWhen: "up" }} />)
    expect(deltaLine()).toHaveTextContent("No comparison yet")
    expect(deltaLine()).toHaveClass("text-muted-foreground")
  })

  it("renders no delta line without a delta", () => {
    render(<StatTile label="Passes sold" value="12" />)
    expect(deltaLine()).toBeNull()
  })

  it("draws two sparkline polylines when there is a previous series and one when there is not", () => {
    const { unmount } = render(<StatTile label="Revenue" value="$1" sparkline={{ current: [1, 2, 3], previous: [1, 1, 2] }} />)
    expect(polylines()).toHaveLength(2)
    expect(polylines()[0]).toHaveAttribute("stroke-dasharray")
    expect(polylines()[1]).not.toHaveAttribute("stroke-dasharray")
    unmount()
    render(<StatTile label="Revenue" value="$1" sparkline={{ current: [1, 2, 3] }} />)
    expect(polylines()).toHaveLength(1)
  })

  it("becomes one link with the whole sentence as its name", () => {
    render(<StatTile label="October revenue" value="$18,365" href="/admin/revenue" delta={{ value: 12, baseline: "October 2025", goodWhen: "up" }} />)
    const link = screen.getByRole("link", { name: "October revenue: $18,365, +12% vs October 2025" })
    expect(link).toHaveAttribute("href", "/admin/revenue")
    expect(link).toHaveAttribute("data-slot", "stat-tile")
  })

  it("names a plain tile the same way", () => {
    render(<StatTile label="Passes sold" value="12" />)
    expect(screen.getByRole("group", { name: "Passes sold: 12" })).toBeInTheDocument()
  })
})
