"use client"

import { useId, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useMedia } from "./use-media"

// The table of like things that sits inside a card on a record page (docs/DESIGN.md, "The recipe"): a customer's jobs, invoices, payments and
// messages, an invoice's payments and reminders. `DataGrid` stays the grid of a whole screen (toolbar, Columns, filters, paging); this has
// none of that. No toolbar row at all (at most a quiet search once there are more than ten rows), a light header (small grey words over one
// hairline, no band), 56px rows, 20px gutters at both ends so every table lines up with the card's own padding, and the whole row opens its
// record while the chips inside still link to their own. Below `md` each row is a card drawn by `card`, 16px gutters, 44px or taller.
// Rows are given newest first (open ones on top) by the caller. Client component.

export interface DataTableColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  align?: "right"
  /** the header is read but not drawn: a column of buttons or links (Actions) */
  hideHeader?: boolean
  /** a width or wrapping class for the column */
  className?: string
}

export interface DataTableProps<T> {
  /** the table's accessible name: "Jobs" */
  label: string
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[]
  getKey: (row: T) => string
  /** the row as a whole opens its record */
  onOpen?: (row: T) => void
  /** a phone's card: the same facts, stacked; chips and pills stay links */
  card: (row: T) => ReactNode
  /** the words a quiet search matches against, used only when there are more than ten rows */
  searchText?: (row: T) => string
  className?: string
}

const SEARCH_AFTER = 10
const interactive = (target: EventTarget) => target instanceof Element && target.closest("a, button, input, select, textarea, [role=menuitem]") !== null

export function DataTable<T>({ label, columns, rows, getKey, onOpen, card, searchText, className }: DataTableProps<T>) {
  const wide = useMedia("(min-width: 768px)")
  const searchId = useId()
  const [query, setQuery] = useState("")
  const searchable = Boolean(searchText) && rows.length > SEARCH_AFTER
  const shown = searchable && query.trim() ? rows.filter((r) => searchText!(r).toLowerCase().includes(query.trim().toLowerCase())) : rows

  const open = (row: T) => (event: MouseEvent) => {
    if (!onOpen || event.defaultPrevented || interactive(event.target)) return
    onOpen(row)
  }
  const key = (row: T) => (event: KeyboardEvent) => {
    if (!onOpen || event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return
    event.preventDefault()
    onOpen(row)
  }
  const rowCls = cn("border-b border-border last:border-b-0", onOpen && "cursor-pointer hover:bg-row-hover focus-visible:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50")

  return (
    <div data-slot="data-table" className={className}>
      {searchable && (
        <div className="flex items-center gap-2 border-b border-border px-5 py-2">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <label htmlFor={searchId} className="sr-only">
            Search {label.toLowerCase()}
          </label>
          <Input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}`} className="h-9 border-0 px-0 shadow-none focus-visible:ring-0" />
        </div>
      )}
      {shown.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Nothing matches that.</p>
      ) : wide ? (
        <table aria-label={label} className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c.id} scope="col" className={cn("px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground first:pl-5 last:pr-5", c.align === "right" && "text-right", c.className)}>
                  {c.hideHeader ? <span className="sr-only">{c.header}</span> : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={getKey(row)} data-slot="data-table-row" tabIndex={onOpen ? 0 : undefined} onClick={open(row)} onKeyDown={key(row)} className={rowCls}>
                {columns.map((c) => (
                  <td key={c.id} className={cn("h-14 px-3 py-1 align-middle first:pl-5 last:pr-5", c.align === "right" && "text-right tabular-nums", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul aria-label={label}>
          {shown.map((row) => (
            <li key={getKey(row)} data-slot="data-table-card" tabIndex={onOpen ? 0 : undefined} onClick={open(row)} onKeyDown={key(row)} className={cn("min-h-16 px-4 py-3", rowCls)}>
              {card(row)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
