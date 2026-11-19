import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { DataTable, type DataTableColumn } from "./DataTable"

interface Row {
  id: string
  name: string
}

const COLUMNS: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => <a href={`/x/${r.id}`}>{r.name}</a> },
  { id: "id", header: "Id", cell: (r) => r.id },
]
const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Row ${i + 1}` }))

let wide = true
beforeAll(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: wide && query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

describe("DataTable", () => {
  it("has no toolbar and a light header", () => {
    render(<DataTable label="Jobs" columns={COLUMNS} rows={rows(3)} getKey={(r) => r.id} card={(r) => r.name} />)
    expect(screen.queryByRole("button", { name: "Columns" })).toBeNull()
    expect(screen.queryByRole("searchbox")).toBeNull()
    const head = screen.getAllByRole("columnheader")[0]!
    expect(head.className).toContain("text-muted-foreground")
    expect(head.className).not.toContain("bg-stone")
  })

  it("shows a quiet search only above ten rows", () => {
    const { unmount } = render(<DataTable label="Jobs" columns={COLUMNS} rows={rows(10)} getKey={(r) => r.id} card={(r) => r.name} searchText={(r) => r.name} />)
    expect(screen.queryByRole("searchbox")).toBeNull()
    unmount()
    render(<DataTable label="Jobs" columns={COLUMNS} rows={rows(11)} getKey={(r) => r.id} card={(r) => r.name} searchText={(r) => r.name} />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Row 11" } })
    expect(screen.getAllByRole("row")).toHaveLength(2)
  })

  it("opens the record when the row is pressed or Enter is hit, and leaves a link inside to itself", () => {
    const open = vi.fn()
    render(<DataTable label="Jobs" columns={COLUMNS} rows={rows(2)} getKey={(r) => r.id} card={(r) => r.name} onOpen={open} />)
    const row = screen.getAllByRole("row")[1]!
    fireEvent.click(within(row).getByText("1"))
    expect(open).toHaveBeenCalledTimes(1)
    fireEvent.click(within(row).getByRole("link"))
    expect(open).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(row, { key: "Enter" })
    expect(open).toHaveBeenCalledTimes(2)
  })

  it("draws cards below md", () => {
    wide = false
    render(<DataTable label="Jobs" columns={COLUMNS} rows={rows(2)} getKey={(r) => r.id} card={(r) => <span>{r.name}</span>} />)
    expect(screen.queryByRole("table")).toBeNull()
    expect(document.querySelectorAll("[data-slot=data-table-card]")).toHaveLength(2)
    wide = true
  })
})
