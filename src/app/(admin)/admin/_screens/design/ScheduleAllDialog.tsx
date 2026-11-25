"use client"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { SplitButton } from "@/components/blocks/SplitButton"
import { dayShort } from "@/components/blocks/find-a-time-model"
import { clockWords } from "@/components/blocks/time-grid-model"
import type { ScheduleAllRow } from "./schedule-all"

// Schedule all N, the preview before it happens (the live PlaceAllDialog's words, with the reviewed Schedule dialog's own notify choice as its confirm): who goes on which day, at which time, with
// which person, each row removable (the rest are planned again without it), a job nothing has room for stays on the list with its reason and is not counted. Pure render over planned rows.

export function ScheduleAllDialog({ rows, onRemove, onClose, onConfirm }: { rows: readonly ScheduleAllRow[]; onRemove: (jobId: string) => void; onClose: () => void; onConfirm: (notify: boolean) => void }) {
  const fits = rows.filter((r) => r.to).length
  return (
    <ConfirmDialog
      open
      size="md"
      slot="schedule-all-dialog"
      onOpenChange={(o) => !o && onClose()}
      title={`Schedule all ${rows.length}`}
      message="Each job goes on the next open day, with the first person who has room."
      onConfirm={async (variant) => (onConfirm(variant !== "quiet"), { ok: true })}
      renderConfirm={({ confirm, pending }) => (
        <SplitButton label="Schedule and notify the customer" onClick={() => confirm("text")} disabled={pending || fits === 0} menuLabel="More ways to schedule" menu={[{ label: "Schedule without notifying", disabled: fits === 0, onSelect: () => confirm("quiet") }]} />
      )}
    >
      <ul data-slot="schedule-all-rows" aria-label="Jobs to schedule" className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
        {rows.map((r) => (
          <li key={r.job.id} className="flex items-center gap-2 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-foreground">{`${r.job.customer} · ${r.job.service}`}</span>
              {r.to ? <span className="block text-muted-foreground">{`${dayShort(r.to.day)}, ${r.to.start === null ? "Any time" : clockWords(r.to.start)}, ${r.to.personName}`}</span> : <span className="block text-destructive">{r.problem}</span>}
            </span>
            <Button type="button" variant="ghost" size="sm" className="min-h-11 shrink-0" aria-label={`Remove ${r.job.customer}`} onClick={() => onRemove(r.job.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  )
}
