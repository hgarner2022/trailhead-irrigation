"use client"

import { useMemo, useRef, useState } from "react"
import { useTable, type RowData } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataGridBulkBar, DataGridToolbar, type GridBulkAction, type GridFilter, type GridSearch } from "./data-grid-toolbar"
import { DataGridCards, type GridCardSlots } from "./DataGridCard"
import { useMedia } from "./use-media"
import { SELECT_COLUMN, columnId, gridFeatures, pressName, useScrollCue, withFilterFns, type GridColumnDef } from "./data-grid-table"
import { TextLink } from "./TextLink"

// The one table of the app (docs/DESIGN.md, Tables): shadcn's TanStack data
// table recipe on TanStack Table v9, with filter chips, a Columns menu that
// hides and reorders, selection with a bulk bar, and CSV export. The first
// column is the record's name and the ONE link on the row (Hannah, Nov 25 2026:
// "too many links"); it cannot be hidden or moved. Every other record a row
// names is plain text. With `rowOpens` a click anywhere on the row that is not
// on a control opens the same record: the row's click presses the name link, so
// the two can never go to different places, and the link stays the keyboard's
// and the screen reader's way in. The checkbox selects. The header is sticky inside the grid's own scroller, the checkbox
// and name columns stay frozen on the left, and the right edge fades while
// there is more table to the right. Below `md` a screen that declares `card` slots
// shows each row as one card instead (DataGridCard.tsx); search, filters, count and empty states are the same.

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
  /** Fired from the link in the first column (and, with `rowOpens`, from a click on the row, which presses that link) */
  onOpen?: (row: T) => void
  /** A click anywhere on a row opens its record, as the name link does. A click on a control in the row (a button, a link, a checkbox, a menu) or one that ends a text selection does nothing. */
  rowOpens?: boolean
  /** How the first column's link is drawn: "link" (the default) is the orange name; "plain" is for a row that is not a record with a page (a message), whose first cell is a date or a word: body colour, underlined on hover and focus */
  nameTone?: "link" | "plain"
  /** Actions on the selected rows; the checkbox column is only there when this is non-empty */
  bulkActions?: GridBulkAction<T>[]
  /** Enables export as `<exportName>.csv` of every row that matches the current search and filters, in the current sort, with the visible columns */
  exportName?: string
  /** Rows per page; default 25 */
  pageSize?: number
  emptyTitle?: string
  emptyLine?: string
  /** What the grid says when rows exist but the search and filters hide every one: "No jobs match." with Clear filters (docs/plans/2026-11-18-admin-holistic-design.md, section 10) */
  noMatchTitle?: string
  /** Skeleton rows under the real header; the toolbar is disabled */
  loading?: boolean
  /** Row ids selected on first render; read once, later changes are ignored */
  defaultSelectedIds?: string[]
  /** Column ids left out of the view on first render; the Columns menu brings them back (read once) */
  hiddenColumns?: string[]
  /** Filter chips already set on first render (a link from Home); read once, like `defaultSelectedIds` */
  defaultFilters?: { column: string; values: string[] }[]
  /** Which columns go on the row's card below `md`; without it the table scrolls sideways there */
  card?: GridCardSlots
  /** false: no toolbar (search, filters, Columns, export) above the table; a small table inside a card, like a job's Payments and Invoices, has nothing to search. Default true */
  toolbar?: boolean
  /** the table sits inside a `SectionCard`'s padding (Billing's Payments, an invoice's Reminders, Messages): no border, radius or shadow of its own, a light header (small grey words over one hairline), the first cell's text on the card's left edge and the last on its right so the hairlines end where the card's headings do, one 56px row height, and no sort arrows under six rows. Use with `toolbar={false}` */
  inCard?: boolean
  className?: string
}

const SKELETON_ROWS = 8
/** inside a card, a table of fewer rows than this has nothing to sort */
const SORT_FROM = 6
/** the cells of an embedded table: 8px between columns, none at the card's own edges */
const CARD_CELL = "px-2 first:pl-0 last:pr-0"
/** the first cell of a row that is not a record with a page: it still opens the row (a button for the keyboard), in the body colour */
const PLAIN_NAME = "text-left font-normal text-foreground"
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


export function DataGrid<T extends RowData>({
  columns,
  data,
  getRowId,
  search,
  filters = [],
  onOpen,
  rowOpens = false,
  nameTone = "link",
  bulkActions = [],
  exportName,
  pageSize = 25,
  emptyTitle = "Nothing here yet",
  emptyLine = "Rows appear as data arrives.",
  noMatchTitle = "Nothing matches.",
  loading = false,
  defaultSelectedIds,
  defaultFilters,
  hiddenColumns,
  card,
  toolbar = true,
  inCard = false,
  className,
}: DataGridProps<T>) {
  const phone = useMedia("(max-width: 767px)")
  const asCards = Boolean(card) && phone
  const searchColumn = search?.column
  const chipKey = filters.map((f) => f.column).join(",")
  const hasSelect = bulkActions.length > 0
  const nameId = columns.length ? columnId(columns[0]) : ""
  const allColumns = useMemo(() => {
    const fewRows = inCard && data.length < SORT_FROM
    const prepared = withFilterFns(columns, searchColumn, chipKey ? chipKey.split(",") : []).map((def) => {
      const named = columnId(def) === nameId ? { ...def, enableHiding: false } : def
      return fewRows ? { ...named, enableSorting: false } : named
    })
    return hasSelect ? [selectColumn<T>(), ...prepared] : prepared
  }, [columns, searchColumn, chipKey, hasSelect, nameId, inCard, data.length])
  // Read once: TanStack resolves initial state at construction.
  const [initialState] = useState(() => ({
    pagination: { pageIndex: 0, pageSize },
    rowSelection: Object.fromEntries((defaultSelectedIds ?? []).map((id) => [id, true as const])),
    columnFilters: (defaultFilters ?? []).map((f) => ({ id: f.column, value: f.values })),
    columnVisibility: Object.fromEntries((hiddenColumns ?? []).map((id) => [id, false as const])),
  }))
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
      {toolbar && <DataGridToolbar table={table} nameId={nameId} search={search} filters={filters} exportName={exportName} disabled={loading} />}
      {!loading && hasSelect && <DataGridBulkBar table={table} actions={bulkActions} />}
      {asCards && card ? (
        <DataGridCards table={table} rows={rows} slots={card} nameId={nameId} loading={loading} empty={{ hasData: data.length > 0, emptyTitle, emptyLine, noMatchTitle }} onOpen={onOpen} />
      ) : (
      <div
        ref={wrap}
        tabIndex={-1}
        data-slot="data-grid-table"
        data-scrollable={scrollable}
        data-more={more}
        className={cn(
          "group relative overflow-hidden bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring",
          inCard ? "bg-transparent" : "rounded-lg border border-border shadow-sm",
          "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-30 after:w-10 after:bg-linear-to-r after:from-transparent after:to-background after:opacity-0 after:transition-opacity after:content-[''] data-[more=true]:after:opacity-100",
          "[&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-auto",
        )}
      >
        <Table>
          <TableHeader className={cn("sticky top-0 z-20", inCard ? "bg-card" : "bg-stone")}>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className={inCard ? "bg-card hover:bg-card" : "bg-stone hover:bg-stone"}>
                {group.headers.map((header) => {
                  const column = header.column
                  const sorted = column.getIsSorted()
                  const right = column.columnDef.meta?.align === "right"
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={column.getCanSort() ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
                      className={cn(inCard ? "type-admin-meta h-9 text-muted-foreground" : "type-admin-label", freeze(column.id), right && "text-right", column.columnDef.meta?.width, inCard && CARD_CELL)}
                    >
                      {header.isPlaceholder ? null : column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={column.getToggleSortingHandler()}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <TableRow key={r} className={cn("bg-background", inCard ? "h-14" : "h-11")}>
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id} className={cn(freeze(column.id), inCard && CARD_CELL)}>
                      <Skeleton className={column.id === SELECT_COLUMN ? "size-4" : "h-4 w-24"} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="bg-background hover:bg-background">
                <TableCell colSpan={visibleCount} className="py-12 text-center whitespace-normal">
                  {data.length > 0 ? (
                    <>
                      <p className="type-admin-card text-navy">{noMatchTitle}</p>
                      <Button size="touch" variant="outline" className="mt-4" onClick={() => table.setColumnFilters([])}>
                        Clear filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="type-admin-card text-navy">{emptyTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{emptyLine}</p>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined} data-row-opens={rowOpens || undefined} onClick={rowOpens ? pressName : undefined} className={cn("bg-background", inCard ? "h-14" : "h-11", rowOpens && "cursor-pointer")}>
                  {row.getVisibleCells().map((cell) => {
                    const { column } = cell
                    const right = column.columnDef.meta?.align === "right"
                    const href = column.id === nameId ? column.columnDef.meta?.href?.(row.original as object) : undefined
                    return (
                      <TableCell key={cell.id} className={cn(freeze(column.id), right && "text-right tabular-nums", column.columnDef.meta?.width, inCard && CARD_CELL)}>
                        {column.id !== nameId || column.columnDef.meta?.bare ? (
                          <table.FlexRender cell={cell} />
                        ) : href ? (
                          <TextLink href={href} native touch="inline" underline="hover" weight="medium" data-grid-name="" className={nameTone === "plain" ? PLAIN_NAME : undefined}>
                            <table.FlexRender cell={cell} />
                          </TextLink>
                        ) : (
                          <TextLink touch="inline" underline="hover" weight="medium" data-grid-name="" className={nameTone === "plain" ? PLAIN_NAME : "text-left"} onClick={() => onOpen?.(row.original)}>
                            <table.FlexRender cell={cell} />
                          </TextLink>
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
      )}
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
