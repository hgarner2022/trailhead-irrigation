"use client"

import { useMemo, useRef } from "react"
import { useTable, type RowData } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataGridBulkBar, DataGridToolbar, type GridBulkAction, type GridFilter, type GridSearch } from "./data-grid-toolbar"
import { SELECT_COLUMN, gridFeatures, useScrollCue, withFilterFns, type GridColumnDef } from "./data-grid-table"

// The one table of the app (docs/DESIGN.md, Tables): shadcn's TanStack data
// table recipe on TanStack Table v9, with filter chips, a Columns menu that
// hides and reorders, selection with a bulk bar, and CSV export. The first
// column is the record's name and the only thing on the row that opens it; the
// checkbox selects; nothing else on the row is a target. The header is sticky
// inside the grid's own scroller, the checkbox and name columns stay frozen on
// the left, and the right edge fades while there is more table to the right.
// On a phone it is the same table, never a stack of cards.

export type { GridColumnDef } from "./data-grid-table"

export interface DataGridProps<T extends RowData> {
  /** TanStack column defs; the first one is the record name and renders as the link that opens it */
  columns: GridColumnDef<T>[]
  data: T[]
  getRowId: (row: T) => string
  /** Text filter on one column */
  search?: GridSearch
  /** Chips, one per column, each a menu of checkable options */
  filters?: GridFilter[]
  /** Fired from the link in the first column, never from a row click */
  onOpen?: (row: T) => void
  bulkActions?: GridBulkAction<T>[]
  /** Enables Export CSV of the visible rows and columns as `<exportName>.csv` */
  exportName?: string
  /** Rows per page; default 25 */
  pageSize?: number
  emptyTitle?: string
  emptyLine?: string
  /** Skeleton rows under the real header; the toolbar is disabled */
  loading?: boolean
  /** Row ids selected on first render */
  initialSelected?: string[]
  className?: string
}

const SKELETON_ROWS = 8
// The checkbox and name columns stay put while the rest scrolls. The name
// column's offset is the checkbox column's min-content width (8px of padding
// and the 16px box), which is what that column collapses to whenever the
// table overflows, the only time sticky bites. The divider after the name
// shows only while the table can scroll sideways.
const FROZEN = ["sticky left-0 z-10 bg-inherit", "sticky left-6 z-10 bg-inherit group-data-[scrollable=true]:border-r group-data-[scrollable=true]:border-border"]
const frozen = (index: number) => FROZEN[index]

function selectColumn<T extends RowData>(): GridColumnDef<T> {
  return {
    id: SELECT_COLUMN,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
      />
    ),
    cell: ({ row }) => <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(!!checked)} />,
  }
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
  return <Icon className={cn("size-3.5 shrink-0", sorted ? "text-primary-dark" : "text-muted-foreground")} aria-hidden />
}

const LINK = "cursor-pointer font-medium text-primary-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-primary/50"

export function DataGrid<T extends RowData>({
  columns,
  data,
  getRowId,
  search,
  filters = [],
  onOpen,
  bulkActions = [],
  exportName,
  pageSize = 25,
  emptyTitle = "Nothing here yet",
  emptyLine = "Rows appear as data arrives.",
  loading = false,
  initialSelected,
  className,
}: DataGridProps<T>) {
  const searchColumn = search?.column
  const chipKey = filters.map((f) => f.column).join(",")
  const allColumns = useMemo(
    () => [selectColumn<T>(), ...withFilterFns(columns, searchColumn, chipKey ? chipKey.split(",") : [])],
    [columns, searchColumn, chipKey],
  )
  const [initialState] = useMemo(
    () => [{ pagination: { pageIndex: 0, pageSize }, rowSelection: Object.fromEntries((initialSelected ?? []).map((id) => [id, true as const])) }],
    // Read once: TanStack resolves initial state at construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const table = useTable({ features: gridFeatures, columns: allColumns, data, getRowId, initialState })

  const wrap = useRef<HTMLDivElement>(null)
  const { scrollable, more } = useScrollCue(wrap)
  const nameId = columns.length ? (allColumns[1].id ?? "") : ""
  const rows = table.getRowModel().rows
  const visibleCount = table.getVisibleLeafColumns().length
  const total = table.getRowCount()
  const { pageIndex, pageSize: size } = table.state.pagination
  const from = total === 0 ? 0 : pageIndex * size + 1
  const to = Math.min(total, (pageIndex + 1) * size)

  return (
    <div data-slot="data-grid" className={cn("flex flex-col gap-3", className)}>
      <DataGridToolbar table={table} search={search} filters={filters} exportName={exportName} disabled={loading} />
      {!loading && <DataGridBulkBar table={table} actions={bulkActions} />}
      <div
        ref={wrap}
        data-slot="data-grid-table"
        data-scrollable={scrollable}
        data-more={more}
        className={cn(
          "group relative overflow-hidden rounded-lg border border-border bg-background",
          "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-30 after:w-10 after:bg-linear-to-r after:from-transparent after:to-background after:opacity-0 after:transition-opacity after:content-[''] data-[more=true]:after:opacity-100",
          "[&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-auto",
        )}
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-background">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="bg-background hover:bg-background">
                {group.headers.map((header, i) => {
                  const column = header.column
                  const sorted = column.getIsSorted()
                  const right = column.columnDef.meta?.align === "right"
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={column.getCanSort() ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
                      className={cn(frozen(i), right && "text-right")}
                    >
                      {header.isPlaceholder ? null : column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={column.getToggleSortingHandler()}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <table.FlexRender header={header} />
                          <SortIcon sorted={sorted} />
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: SKELETON_ROWS }, (_, r) => (
                <TableRow key={r} className="bg-background">
                  {table.getVisibleLeafColumns().map((column, i) => (
                    <TableCell key={column.id} className={frozen(i)}>
                      <Skeleton className={i === 0 ? "size-4" : "h-4 w-24"} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="bg-background hover:bg-background">
                <TableCell colSpan={visibleCount} className="py-12 text-center whitespace-normal">
                  <p className="font-display text-xl text-navy">{emptyTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{emptyLine}</p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined} className="bg-background">
                  {row.getVisibleCells().map((cell, i) => {
                    const { column } = cell
                    const right = column.columnDef.meta?.align === "right"
                    const href = column.id === nameId ? column.columnDef.meta?.href?.(row.original as object) : undefined
                    return (
                      <TableCell key={cell.id} className={cn(frozen(i), right && "text-right tabular-nums")}>
                        {column.id !== nameId ? (
                          <table.FlexRender cell={cell} />
                        ) : href ? (
                          <a href={href} className={LINK}>
                            <table.FlexRender cell={cell} />
                          </a>
                        ) : (
                          <button type="button" onClick={() => onOpen?.(row.original)} className={LINK}>
                            <table.FlexRender cell={cell} />
                          </button>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && table.getPageCount() > 1 && (
        <div data-slot="data-grid-pager" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>{`Showing ${from} to ${to} of ${total}`}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
