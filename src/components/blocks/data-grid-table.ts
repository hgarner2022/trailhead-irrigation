// The TanStack Table v9 setup every DataGrid shares: one feature registry
// (sort, filter, hide, reorder, select, paginate), the column types that go
// with it, and the hook that tells the grid when there is more table to the
// right. Nothing here renders; DataGrid.tsx and data-grid-toolbar.tsx do.
import { useEffect, useState, type RefObject } from "react"
import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  constructFilterFn,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type ReactTable,
  type RowData,
} from "@tanstack/react-table"

/**
 * Per-column hints the grid reads: `align: "right"` for numbers, `href` to
 * render the record name as a real link, `csv` for the written form of a
 * column whose value is only there to sort by.
 */
export interface GridColumnMeta {
  align?: "right"
  href?(row: object): string
  csv?(row: object): string
}

/** A chip filter: the row passes when its value is one of the chosen values. */
const filterFn_oneOf = constructFilterFn({
  filter: (dataValue, filterValue: string[]) => filterValue.includes(String(dataValue)),
  autoRemove: (filterValue) => !Array.isArray(filterValue) || filterValue.length === 0,
})

export const gridFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString, oneOf: filterFn_oneOf },
  columnVisibilityFeature,
  columnOrderingFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: metaHelper<GridColumnMeta>(),
})

export type GridFeatures = typeof gridFeatures
export type GridColumnDef<T extends RowData> = ColumnDef<GridFeatures, T, unknown>
export type GridTable<T extends RowData> = ReactTable<GridFeatures, T>

export const SELECT_COLUMN = "select"

/** The id TanStack gives a column def: its `id`, else its `accessorKey`, else its header text. Throws in development when none of those is there. */
export function columnId<T extends RowData>(def: GridColumnDef<T>): string {
  if (def.id) return def.id
  if ("accessorKey" in def && def.accessorKey) return String(def.accessorKey).replace(".", "_")
  if (typeof def.header === "string") return def.header
  if (process.env.NODE_ENV !== "production") throw new Error("DataGrid column needs an id, an accessorKey or a string header")
  return ""
}

/** The header as plain text for menus and the CSV. */
export function headerText(def: { id?: string; header?: unknown }, fallback: string): string {
  return typeof def.header === "string" ? def.header : fallback
}

/** Gives the search column and the chip columns the filter functions they need. */
export function withFilterFns<T extends RowData>(columns: GridColumnDef<T>[], searchColumn: string | undefined, chipColumns: string[]): GridColumnDef<T>[] {
  return columns.map((def) => {
    const id = columnId(def)
    if (id === searchColumn) return { ...def, filterFn: "includesString" as const }
    if (chipColumns.includes(id)) return { ...def, filterFn: "oneOf" as const }
    return def
  })
}

export interface ScrollCue {
  /** the table is wider than its box */
  scrollable: boolean
  /** and there is still table to the right of what is on screen */
  more: boolean
}

/**
 * Whether the table scrolls sideways at all, and whether it can still scroll
 * further right. The grid shows its right-edge fade only while `more`, so the
 * last column is never dimmed when it fits, and the frozen name column draws
 * its divider only while `scrollable`. `ref` is the grid wrapper; the scroller
 * is the Table primitive's own container.
 */
export function useScrollCue(ref: RefObject<HTMLElement | null>): ScrollCue {
  const [cue, setCue] = useState<ScrollCue>({ scrollable: false, more: false })
  useEffect(() => {
    const scroller = ref.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    if (!scroller) return
    const read = () => {
      const scrollable = scroller.scrollWidth - scroller.clientWidth > 1
      const more = scrollable && scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 1
      setCue((c) => (c.scrollable === scrollable && c.more === more ? c : { scrollable, more }))
    }
    read()
    scroller.addEventListener("scroll", read, { passive: true })
    const observer = new ResizeObserver(read)
    observer.observe(scroller)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)
    return () => {
      scroller.removeEventListener("scroll", read)
      observer.disconnect()
    }
  }, [ref])
  return cue
}
