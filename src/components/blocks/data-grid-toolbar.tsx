"use client"

import type { RowData } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronDown, Download, Search, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { downloadCsv, rowsToCsv } from "./data-grid-csv"
import { SELECT_COLUMN, headerText, type GridTable } from "./data-grid-table"

// The row of controls above a DataGrid (search, filter chips, the Columns menu,
// Export CSV) and the bulk bar that mounts under it while rows are selected.
// Every menu is non-modal so the rest of the grid stays usable while one is open.

export interface GridSearch {
  column: string
  placeholder: string
}

export interface GridFilter {
  column: string
  label: string
  options: { value: string; label: string }[]
}

export interface GridBulkAction<T> {
  label: string
  onClick: (rows: T[]) => void
}

interface ToolbarProps<T extends RowData> {
  table: GridTable<T>
  search?: GridSearch
  filters: GridFilter[]
  exportName?: string
  disabled?: boolean
}

// Radix closes the menu after a select; these menus stay open so several
// columns can be changed in one visit.
const keepOpen = (event: Event, then?: () => void) => {
  event.preventDefault()
  then?.()
}

function SearchBox<T extends RowData>({ table, search, disabled }: Pick<ToolbarProps<T>, "table" | "search" | "disabled">) {
  const column = search ? table.getColumn(search.column) : undefined
  if (!search || !column) return null
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        aria-label={search.placeholder}
        placeholder={search.placeholder}
        disabled={disabled}
        value={String(column.getFilterValue() ?? "")}
        onChange={(event) => column.setFilterValue(event.target.value || undefined)}
        className="h-8 w-56 max-w-full pl-9"
      />
    </div>
  )
}

function FilterChip<T extends RowData>({ table, filter, disabled }: { table: GridTable<T>; filter: GridFilter; disabled?: boolean }) {
  const column = table.getColumn(filter.column)
  const chosen = (column?.getFilterValue() as string[] | undefined) ?? []
  const active = chosen.length > 0
  const summary = filter.options.filter((o) => chosen.includes(o.value)).map((o) => o.label).join(", ")
  return (
    <span
      data-slot="data-grid-chip"
      className={cn(
        "inline-flex h-8 items-center rounded-lg border text-xs font-medium",
        active ? "border-primary/40 bg-primary/10 text-primary-dark" : "border-border bg-background text-foreground",
      )}
    >
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-active={active}
            disabled={disabled}
            className="inline-flex h-full cursor-pointer items-center gap-1 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {active ? `${filter.label}: ${summary}` : filter.label}
            <ChevronDown className="size-3.5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {filter.options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={chosen.includes(option.value)}
              onSelect={keepOpen}
              onCheckedChange={(checked) =>
                column?.setFilterValue(checked ? [...chosen, option.value] : chosen.filter((v) => v !== option.value))
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {active && (
        <button
          type="button"
          aria-label={`Clear ${filter.label} filter`}
          disabled={disabled}
          onClick={() => column?.setFilterValue(undefined)}
          className="flex h-full cursor-pointer items-center pr-2 pl-1 hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  )
}

function ColumnsMenu<T extends RowData>({ table, disabled }: Pick<ToolbarProps<T>, "table" | "disabled">) {
  const columns = table.getAllLeafColumns().filter((c) => c.id !== SELECT_COLUMN)
  const visible = columns.filter((c) => c.getIsVisible())
  const label = (c: (typeof columns)[number]) => headerText(c.columnDef, c.id)
  // Moves past hidden columns, so a move always changes what is on screen.
  const move = (id: string, step: -1 | 1) => {
    const order = columns.map((c) => c.id)
    const from = order.indexOf(id)
    let to = from + step
    while (to >= 0 && to < order.length && !columns[to].getIsVisible()) to += step
    if (to < 0 || to >= order.length) return
    order.splice(from, 1)
    order.splice(to, 0, id)
    table.setColumnOrder([SELECT_COLUMN, ...order])
  }
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {columns.map((column) => {
          const name = label(column)
          const at = visible.indexOf(column)
          return (
            <div key={column.id} role="group" aria-label={name} className="flex items-center">
              <DropdownMenuCheckboxItem
                className="flex-1"
                checked={column.getIsVisible()}
                disabled={!column.getCanHide()}
                onSelect={keepOpen}
                onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
              >
                {name}
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem disabled={at <= 0} onSelect={(event) => keepOpen(event, () => move(column.id, -1))} className="px-1.5">
                <ArrowUp aria-hidden />
                <span className="sr-only">Move {name} up</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={at < 0 || at === visible.length - 1} onSelect={(event) => keepOpen(event, () => move(column.id, 1))} className="px-1.5">
                <ArrowDown aria-hidden />
                <span className="sr-only">Move {name} down</span>
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ExportButton<T extends RowData>({ table, exportName, disabled }: Pick<ToolbarProps<T>, "table" | "exportName" | "disabled">) {
  if (!exportName) return null
  const save = () => {
    const columns = table.getVisibleLeafColumns().filter((c) => c.id !== SELECT_COLUMN).map((c) => ({ id: c.id, header: headerText(c.columnDef, c.id) }))
    const rows = table.getPrePaginatedRowModel().rows.map((row) => Object.fromEntries(columns.map((c) => [c.id, row.getValue(c.id)])))
    downloadCsv(exportName, rowsToCsv(columns, rows))
  }
  return (
    <Button variant="outline" size="sm" disabled={disabled} onClick={save}>
      <Download className="size-3.5" aria-hidden />
      Export CSV
    </Button>
  )
}

export function DataGridToolbar<T extends RowData>({ table, search, filters, exportName, disabled }: ToolbarProps<T>) {
  const chipIds = filters.map((f) => f.column)
  const anyActive = table.state.columnFilters.some((f) => chipIds.includes(f.id))
  const clear = () => table.setColumnFilters((current) => current.filter((f) => !chipIds.includes(f.id)))
  return (
    <div data-slot="data-grid-toolbar" className="flex flex-wrap items-center gap-2">
      <SearchBox table={table} search={search} disabled={disabled} />
      {filters.map((filter) => (
        <FilterChip key={filter.column} table={table} filter={filter} disabled={disabled} />
      ))}
      {anyActive && (
        <Button variant="ghost" size="sm" onClick={clear} disabled={disabled}>
          Clear filters
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <ColumnsMenu table={table} disabled={disabled} />
        <ExportButton table={table} exportName={exportName} disabled={disabled} />
      </div>
    </div>
  )
}

export function DataGridBulkBar<T extends RowData>({ table, actions }: { table: GridTable<T>; actions: GridBulkAction<T>[] }) {
  const rows = table.getSelectedRowModel().rows
  if (rows.length === 0) return null
  return (
    <div data-slot="data-grid-bulk" className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-stone px-4 py-2 text-sm">
      <span className="font-medium">{rows.length} selected</span>
      {actions.map((action) => (
        <Button key={action.label} size="sm" variant="outline" onClick={() => action.onClick(rows.map((r) => r.original))}>
          {action.label}
        </Button>
      ))}
      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => table.resetRowSelection(true)}>
        Clear
      </Button>
    </div>
  )
}
