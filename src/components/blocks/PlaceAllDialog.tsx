"use client"

import { ConfirmDialog } from "./ConfirmDialog"

// Schedule all, the preview before it happens (docs/plans/2026-11-18-admin-holistic-design.md, 5.2, "like Order the day"): who goes on which day with which person,
// then one button. A job nothing has room for stays on the list with its reason and is not counted in the button. The customers are texted a minute after
// the button, under the strip, so the dialog says so. It is the one ConfirmDialog, so Cancel, the API's words and the Enter key behave as everywhere else.
// Pure render over rows the screen planned (`placeAllPlan`); the confirm is the screen's.

export interface PlaceAllRow {
  id: string
  /** "Andrea Reyes, Erie" */
  who: string
  /** "Repair" */
  what: string
  /** "Tue Nov 24, Ryan Garner"; absent when nothing has room */
  where?: string
  /** why nothing has room: "No open day before May 31. Pick a day yourself." */
  problem?: string
}

export interface PlaceAllDialogProps {
  rows: PlaceAllRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function PlaceAllDialog({ rows, open, onOpenChange, onConfirm }: PlaceAllDialogProps) {
  const fits = rows.filter((r) => r.where).length
  const label = fits === rows.length ? `Schedule all ${fits}` : `Schedule ${fits}`
  return (
    <ConfirmDialog
      slot="place-all-dialog"
      size="md"
      title={`Schedule all ${rows.length}`}
      message="Each job goes on the next open day, with the first person who has room. The customers are texted a minute after you confirm, and Undo inside the minute sends nothing."
      confirmLabel={label}
      confirmDisabled={fits === 0}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={async () => (onConfirm(), { ok: true })}
    >
      <ul data-slot="place-all-rows" tabIndex={0} aria-label="Jobs to schedule" className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {rows.map((row) => (
          <li key={row.id} className="px-3 py-2">
            <span className="block truncate text-foreground">{`${row.who} · ${row.what}`}</span>
            {row.where ? (
              <>
                <span className="block text-muted-foreground">{`${row.where} · Any time`}</span>
                <span data-slot="schedule-all-text" className="block text-xs text-muted-foreground">Texted in 60 s, with Undo</span>
              </>
            ) : (
              <span className="block text-destructive">{row.problem}</span>
            )}
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  )
}
