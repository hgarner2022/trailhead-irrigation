import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { JobLine } from "@/lib/admin/types"
import { JobLinesSection } from "./JobLinesSection"

const lines: JobLine[] = [{ id: "l1", name: "Repair", quantity: 1, unitPrice: 145, taxable: true }]

describe("JobLinesSection", () => {
  it("shows one Tax line above the total when there is sales tax", () => {
    render(<JobLinesSection jobId="j1" lines={lines} total={157} tax={12} data={{}} editable={false} />)
    expect(screen.getByText("Tax").closest("p")).toHaveTextContent("Tax$12")
    expect(screen.getAllByText("Tax")).toHaveLength(1)
    expect(screen.getByText("$157")).toBeInTheDocument()
    expect(screen.queryByText("Sales tax")).toBeNull()
  })

  it("shows no Tax line when the tax is zero or not given", () => {
    const { rerender } = render(<JobLinesSection jobId="j1" lines={lines} total={145} tax={0} data={{}} editable={false} />)
    expect(screen.queryByText("Tax")).toBeNull()
    rerender(<JobLinesSection jobId="j1" lines={lines} total={145} data={{}} editable={false} />)
    expect(screen.queryByText("Tax")).toBeNull()
    expect(screen.getByText("Total")).toBeInTheDocument()
  })

  it("shows a canceled job's canceled amount struck through, and Quote later only for lines nobody priced", () => {
    const gone = [{ ...lines[0]!, cancelledAt: "2026-11-18T10:00:00Z" }]
    const { unmount } = render(<JobLinesSection jobId="j1" lines={gone} total={0} data={{}} editable={false} />)
    const total = screen.getByText("Total").closest("p")!
    expect(total).toHaveTextContent("Total$145")
    expect(total.querySelector("del")).toHaveTextContent("$145")
    expect(total).not.toHaveTextContent("Quote later")
    unmount()
    render(<JobLinesSection jobId="j1" lines={[{ ...lines[0]!, unitPrice: 0 }]} total={0} data={{}} editable={false} />)
    expect(screen.getByText("Total").closest("p")).toHaveTextContent("Quote later")
  })
})
