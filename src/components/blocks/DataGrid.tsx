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
import { SELECT_COLUMN, columnId, gridFeatures, useScrollCue, withFilterFns, type GridColumnDef } from "./data-grid-table"

// The one table of the app (docs/DESIGN.md, Tables): shadcn's TanStack data
// table recipe on TanStack Table v9, with filter chips, a Columns menu that
// hides and reorders, selection with a bulk bar, and CSV export. The first
// column is the record's name and the only thing on the row that opens it; it
// cannot be hidden or moved. The checkbox selects; nothing else on the row is
// a target. The header is sticky inside the grid's own scroller, the checkbox
// and name columns stay frozen on the left, and the right edge fades while
// there is more table to the right. On a phone it is the same table, never a
// stack of cards.

export type { GridColumnDef } from "./data-grid-table"

export interface DataGridProps<T extends RowData> {
  /** TanStack column defs; the first one is the record name and renders as the link that opens it. Must be referentially stable (a module constant or memoised), or the table rebuilds its models every render. */
  columns: GridColumnDef<T>[]
  /** Must be referentially stable, like `columns`. */
  data: T[]
  getRowId: (row: T) => string
  /** Text filter on one column */
  search?: GridSearch
  /** Chips, one per column, each a menu of checkable options */
  filters?: GridFilter[]
  /** Fired from the link in the first column, never from a row click */
  onOpen?: (row: T) => void
  /** Actions on the selected rows; the checkbox column is only there when this is non-empty */
  bulkActions?: GridBulkAction<T>[]
  /** Enables export as `<exportName>.csv` of every row that matches the current search and filters, in the current sort, with the visible columns */
  exportName?: string
  /** Rows per page; default 25 */
  pageSize?: number
  emptyTitle?: string
  emptyLine?: string
  /** Skeleton rows under the real header; the toolbar is disabled */
  loading?: boolean
  /** Row ids selected on first render; read once, later changes are ignored */
  defaultSelectedIds?: string[]
  className?: string
}

const SKELETON_ROWS = 8
const SELECT_WIDTH = "w-10 min-w-10 max-w-10"
// The checkbox and name columns stay put while the rest scrolls. The checkbox
// column is a fixed 40px, so the name sits 40px in when it is there and at the
// edge when it is not. The divider after the name shows only while the table
// can scroll sideways.
function frozen(id: string, nameId: string, hasSelect: boolean): string | undefined {
  if (id === SELECT_COLUMN) return cn("sticky left-0 z-10 bg-inherit", SELECT_WIDTH)
  if (id === nameId) return cn("sticky z-10 bg-inherit group-data-[scrollable=true]:border-r group-data-[scrollable=true]:border-border", hasSelect ? "left-10" : "left-0")
  return undefined
}

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
  defaultSelectedIds,
  className,
}: DataGridProps<T>) {
  const searchColumn = search?.column
  const chipKey = filters.map((f) => f.column).join(",")
  const hasSelect = bulkActions.length > 0
  const nameId = columns.length ? columnId(columns[0]) : ""
  const allColumns = useMemo(() => {
    const prepared = withFilterFns(columns, searchColumn, chipKey ? chipKey.split(",") : []).map((def) =>
      columnId(def) === nameId ? { ...def, enableHiding: false } : def,
    )
    return hasSelect ? [selectColumn<T>(), ...prepared] : prepared
  }, [columns, searchColumn, chipKey, hasSelect, nameId])
  const [initialState] = useMemo(
    () => [{ pagination: { pageIndex: 0, pageSize }, rowSelection: Object.fromEntries((defaultSelectedIds ?? []).map((id) => [id, true as const])) }],
    // Read once: TanStack resolves initial state at construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const table = useTable({ features: gridFeatures, columns: allColumns, data, getRowId, initialState })

  const wrap = useRef<HTMLDivElement>(null)
  const { scrollable, more } = useScrollCue(wrap)
  const rows = table.getRowModel().rows
  const visibleCount = table.getVisibleLeafColumns().length
  const total = table.getRowCount()
  const { pageIndex, pageSize: size } = table.state.pagination
  const from = total === 0 ? 0 : pageIndex * size + 1
  const to = Math.min(total, (pageIndex + 1) * size)
  const freeze = (id: string) => frozen(id, nameId, hasSelect)

  return (
    <div data-slot="data-grid" className={cn("flex flex-col gap-3", className)}>
      <DataGridToolbar table={table} nameId={nameId} search={search} filters={filters} exportName={exportName} disabled={loading} />
      {!loading && hasSelect && <DataGridBulkBar table={table} actions={bulkActions} />}
      <div
        ref={wrap}
        tabIndex={-1}
        data-slot="data-grid-table"
        data-scrollable={scrollable}
        data-more={more}
        className={cn(
          "group relative overflow-hidden rounded-lg border border-border bg-background outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-30 after:w-10 after:bg-linear-to-r after:from-transparent after:to-background after:opacity-0 after:transition-opacity after:content-[''] data-[more=true]:after:opacity-100",
          "[&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-auto",
        )}
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-background">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="bg-background hover:bg-background">
                {group.headers.map((header) => {
                  const column = header.column
                  const sorted = column.getIsSorted()
                  const right = column.columnDef.meta?.align === "right"
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={column.getCanSort() ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
                      className={cn(freeze(column.id), right && "text-right")}
                    >
                      {header.isPlaceholder ? null : column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={column.getToggleSortingHandler()}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <table.FlexRender header={header} />
                          {sorted && <span className="sr-only">, sorted {sorted === "asc" ? "ascending" : "descending"}</span>}
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
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id} className={freeze(column.id)}>
                      <Skeleton className={column.id === SELECT_COLUMN ? "size-4" : "h-4 w-24"} />
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
                  {row.getVisibleCells().map((cell) => {
                    const { column } = cell
                    const right = column.columnDef.meta?.align === "right"
                    const href = column.id === nameId ? column.columnDef.meta?.href?.(row.original as object) : undefined
                    return (
                      <TableCell key={cell.id} className={cn(freeze(column.id), right && "text-right tabular-nums")}>
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
