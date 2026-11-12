import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MonthBars, TrendLine } from "./Chart"

const y2026 = [
  { year: 2026, month: 4, revenue: 3331, visits: 14 },
  { year: 2026, month: 10, revenue: 18365, visits: 162 },
]
const y2025 = [{ year: 2025, month: 10, revenue: 14200, visits: 120 }]

describe("MonthBars", () => {
  it("is one image named by the years and the months", () => {
    render(<MonthBars series={[{ year: 2026, data: y2026 }, { year: 2025, data: y2025 }]} />)
    const img = screen.getByRole("img", { name: "Revenue by month, 2026 against 2025, April to November" })
    expect(img).toHaveAttribute("data-slot", "month-bars")
    expect(img).toHaveStyle({ height: "240px" })
  })

  it("draws a legend entry per series", () => {
    const { container } = render(<MonthBars series={[{ year: 2026, data: y2026 }, { year: 2025, data: y2025 }]} />)
    const legend = container.querySelector('[data-slot="chart-legend-content"]')
    expect(legend).toHaveTextContent("2026")
    expect(legend).toHaveTextContent("2025")
  })

  it("keeps the numbers in a hidden table, one row per month, that describes the image", () => {
    const { container } = render(<MonthBars series={[{ year: 2026, data: y2026 }, { year: 2025, data: y2025 }]} />)
    const table = container.querySelector<HTMLTableElement>('[data-slot="chart-table"]')
    expect(table).toHaveClass("sr-only")
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(8)
    expect(screen.getByRole("img")).toHaveAttribute("aria-describedby", table?.id)
    const october = screen.getByRole("row", { name: /Oct/ })
    expect(october).toHaveTextContent("$18,365")
    expect(october).toHaveTextContent("$14,200")
    expect(screen.getByRole("row", { name: /Apr/ })).toHaveTextContent("$0")
  })

  it("does not hand focus to the chart svg", () => {
    const { container } = render(<MonthBars series={[{ year: 2026, data: y2026 }]} />)
    expect(container.querySelector("svg[tabindex]")).toBeNull()
    expect(container.querySelector('[role="application"]')).toBeNull()
  })

  it("takes a height in pixels", () => {
    render(<MonthBars series={[{ year: 2026, data: y2026 }]} height={200} />)
    expect(screen.getByRole("img")).toHaveStyle({ height: "200px" })
  })
})

describe("TrendLine", () => {
  it("is one image with the given name", () => {
    render(<TrendLine data={[{ label: "Sep 1", value: 4 }, { label: "Sep 8", value: 7 }]} label="Committed revenue by week" />)
    const img = screen.getByRole("img", { name: "Committed revenue by week" })
    expect(img).toHaveAttribute("data-slot", "trend-line")
    expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(2)
  })
})
