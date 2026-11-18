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
})
