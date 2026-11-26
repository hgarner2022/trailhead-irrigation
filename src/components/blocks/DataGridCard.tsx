"use client"

import type { ReactNode } from "react"
import type { RowData } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { GridTable } from "./data-grid-table"

// The grid's phone form (docs/DESIGN.md, Tables): below `md` a screen that declares card slots shows each row as one card instead of a
// sideways table. The row's name is the title line, `state` is the one line that says where it stands (the status pill), `when` is the
// day or next, `money` is the money word at the right, and `line` is an optional quiet second line (the service, the street). The whole
// card is the row's open action: a link to the record when the grid's first column has an `href` (the same address the table's name link has), else a button
// calling the same `onOpen`, with the same cells rendered, so a card and a table row can never disagree. Search, filters, the count and the pager stay in DataGrid.

export interface GridCardSlots {
  /** column id shown as the title; the grid's first column when left out */
  title?: string
  /** quiet line under the title: one or more columns, joined with a middle dot */
  line?: string[]
  /** the status pill */
  state?: string
  /** the day or next: one or more columns */
  when?: string[]
  /** the money word, at the right of the card */
  money?: string
  /** a column drawn under the card as its quiet action line (links and buttons cannot sit inside the card's own button) */
  actions?: string
}

const CARD = "flex min-h-16 w-full cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-background p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

type Row<T extends RowData> = ReturnType<GridTable<T>["getRowModel"]>["rows"][number]

export interface DataGridCardsProps<T extends RowData> {
  table: GridTable<T>
  rows: Row<T>[]
  slots: GridCardSlots
  nameId: string
  loading: boolean
  empty: { hasData: boolean; emptyTitle: string; emptyLine: string; noMatchTitle: string }
  onOpen?: (row: T) => void
}

function Joined({ parts, className }: { parts: { id: string; node: ReactNode }[]; className?: string }) {
  if (parts.length === 0) return null
  return (
    <span className={className}>
      {parts.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span aria-hidden>{" · "}</span>}
          {p.node}
        </span>
      ))}
    </span>
  )
}

export function DataGridCards<T extends RowData>({ table, rows, slots, nameId, loading, empty, onOpen }: DataGridCardsProps<T>) {
  const { FlexRender } = table
  if (loading) {
    return (
      <ul data-slot="data-grid-cards" className="space-y-2" aria-busy>
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="rounded-lg border border-border bg-background p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-4 w-24" />
          </li>
        ))}
      </ul>
    )
  }
  if (rows.length === 0) {
    return (
      <div data-slot="data-grid-cards" className="rounded-lg border border-border bg-background py-12 text-center">
        {empty.hasData ? (
          <>
            <p className="font-display text-xl text-navy">{empty.noMatchTitle}</p>
            <Button size="touch" variant="outline" className="mt-4" onClick={() => table.setColumnFilters([])}>
              Clear filters
            </Button>
          </>
        ) : (
          <>
            <p className="font-display text-xl text-navy">{empty.emptyTitle}</p>
            <p className="mt-1 px-4 text-sm text-muted-foreground">{empty.emptyLine}</p>
          </>
        )}
      </div>
    )
  }
  return (
    <ul data-slot="data-grid-cards" className="space-y-2">
      {rows.map((row) => {
        const cell = (id: string | undefined): ReactNode => {
          const found = id ? row.getAllCells().find((c) => c.column.id === id) : undefined
          return found ? <FlexRender cell={found} /> : null
        }
        const parts = (ids: string[] | undefined) => (ids ?? []).map((id) => ({ id, node: cell(id) })).filter((p) => p.node !== null)
        const href = table.getColumn(nameId)?.columnDef.meta?.href?.(row.original as object)
        const body = (
          <>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block truncate font-medium text-primary-dark">{cell(slots.title ?? nameId)}</span>
              <Joined parts={parts(slots.line)} className="block text-sm text-foreground" />
              {slots.state && <span className="block">{cell(slots.state)}</span>}
              <Joined parts={parts(slots.when)} className="block text-sm text-muted-foreground" />
            </span>
            {slots.money && <span className="shrink-0 text-right text-sm tabular-nums">{cell(slots.money)}</span>}
          </>
        )
        return (
          <li key={row.id}>
            {href ? (
              <a href={href} data-slot="data-grid-card" className={CARD}>
                {body}
              </a>
            ) : (
              <button type="button" data-slot="data-grid-card" onClick={() => onOpen?.(row.original)} className={CARD}>
                {body}
              </button>
            )}
            {slots.actions && <div data-slot="data-grid-card-actions" className="px-4">{cell(slots.actions)}</div>}
          </li>
        )
      })}
    </ul>
  )
}
