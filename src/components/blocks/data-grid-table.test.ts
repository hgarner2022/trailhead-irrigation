import { describe, it, expect } from "vitest"
import type { Pass } from "@/lib/admin/types"
import { columnId, withFilterFns, type GridColumnDef } from "./data-grid-table"

describe("columnId", () => {
  it("reads the id, else the accessor key, else the header text", () => {
    expect(columnId<Pass>({ id: "name", accessorKey: "firstName", header: "Name" })).toBe("name")
    expect(columnId<Pass>({ accessorKey: "firstName", header: "Name" })).toBe("firstName")
    expect(columnId<Pass>({ accessorFn: (p) => p.zones, header: "Zones" })).toBe("Zones")
  })

  it("throws when nothing can name the column", () => {
    const def = { accessorFn: (p: Pass) => p.zones, header: () => null } as unknown as GridColumnDef<Pass>
    expect(() => columnId(def)).toThrow(/id/)
  })
})

describe("withFilterFns", () => {
  it("gives the search column a text filter and the chip columns a one-of filter", () => {
    const columns: GridColumnDef<Pass>[] = [
      { id: "firstName", accessorKey: "firstName", header: "Name" },
      { id: "town", accessorKey: "town", header: "Town" },
      { id: "zones", accessorKey: "zones", header: "Zones" },
    ]
    const out = withFilterFns(columns, "firstName", ["town"])
    expect(out.map((c) => c.filterFn)).toEqual(["includesString", "oneOf", undefined])
  })
})
