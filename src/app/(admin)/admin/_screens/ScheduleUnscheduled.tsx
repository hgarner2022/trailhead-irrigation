"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { PlaceAllDialog, type PlaceAllRow } from "@/components/blocks/PlaceAllDialog"
import { TextingStrip } from "@/components/blocks/TextingStrip"
import { ToScheduleTray } from "@/components/blocks/ToScheduleTray"
import type { TrayItem } from "./schedule-model"

// The Unscheduled list under the Schedule's week (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): every job with no day, a pass's or a one-off's, with Place on each row and a quiet
// "Place all N" above them that opens a preview first. The counting strips for the texts that are waiting sit above the whole Schedule (`TextingStrips`), so
// an Undo is in sight whichever view is open. Pure layout over what `usePlacing` holds.

export interface UnscheduledProps {
  items: TrayItem[]
  readOnly: boolean
  problems: Record<string, string>
  noRoom: Record<string, string>
  onPlace: (item: TrayItem) => void
  onPlaceAll: () => void
  onAnotherDay: (item: TrayItem) => void
  preview: { open: boolean; rows: PlaceAllRow[]; onOpenChange: (open: boolean) => void; onConfirm: () => void }
}

export function ScheduleUnscheduled({ items, readOnly, problems, noRoom, onPlace, onPlaceAll, onAnotherDay, preview }: UnscheduledProps) {
  return (
    <Card data-slot="schedule-unscheduled" className="min-w-0">
      <CardHeader>
        <SectionHeading level={2}>{`Unscheduled${items.length ? ` (${items.length})` : ""}`}</SectionHeading>
      </CardHeader>
      <CardContent>
        <ToScheduleTray items={items} onPlace={onPlace} onPlaceAll={onPlaceAll} onAnotherDay={onAnotherDay} noRoom={noRoom} readOnly={readOnly} problems={problems} />
      </CardContent>
      {!readOnly && <PlaceAllDialog rows={preview.rows} open={preview.open} onOpenChange={preview.onOpenChange} onConfirm={preview.onConfirm} />}
    </Card>
  )
}

export function TextingStrips({ strips }: { strips: { id: number; names: string[]; secondsLeft: number; undo: () => void }[] }) {
  if (strips.length === 0) return null
  return (
    <div data-slot="texting-strips" className="space-y-2">
      {strips.map((s) => (
        <TextingStrip key={s.id} names={s.names} secondsLeft={s.secondsLeft} onUndo={s.undo} />
      ))}
    </div>
  )
}
