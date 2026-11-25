"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CALENDAR_KEYS } from "./use-calendar-keys"

// The "?" list of the calendar's shortcuts (`useCalendarKeys`). A plain dialog with one definition list; Escape closes it. Pure props.

export interface CalendarKeysHelpProps { open: boolean; onOpenChange: (open: boolean) => void }

export function CalendarKeysHelp({ open, onOpenChange }: CalendarKeysHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>On the Schedule. Tab to a visit, press Space to pick it up, move it with the arrows and press Enter to drop it.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {CALENDAR_KEYS.map((k) => (
            <div key={k.keys} className="contents">
              <dt><kbd className="rounded border border-border bg-stone px-1.5 py-0.5 font-mono text-xs text-navy">{k.keys}</kbd></dt>
              <dd className="text-foreground">{k.does}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
