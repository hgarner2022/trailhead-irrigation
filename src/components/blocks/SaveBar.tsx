"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The one save strip of the Settings screen (docs/plans/2026-11-18-admin-holistic-design.md, section 8): nothing saves while typing; the
// first change shows this bar, "3 unsaved changes" with Discard and Save, stuck to the bottom of the screen. Problems (what would stop
// the save) show under the count and turn Save off; the API's own refusal comes back as `message`. After a save the bar says "Saved
// just now" until the next edit. Leaving the page with changes waiting asks first. Presentational: the screen owns the changes, and
// draws no bar at all for a reader who may not change anything.

export interface SaveBarProps {
  /** how many fields changed since the last save */
  count: number
  /** what would stop a save, in words; Save is off while there are any */
  problems?: string[]
  pending?: boolean
  /** the last save's outcome: "Saved just now" or the API's refusal */
  message?: string
  /** the message is a refusal, drawn in the destructive colour */
  failed?: boolean
  onSave: () => void
  onDiscard: () => void
  className?: string
}

export function SaveBar({ count, problems = [], pending = false, message, failed = false, onSave, onDiscard, className }: SaveBarProps) {
  useEffect(() => {
    if (count === 0) return
    const ask = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", ask)
    return () => window.removeEventListener("beforeunload", ask)
  }, [count])
  if (count === 0 && !message) return null
  return (
    <div data-slot="save-bar" className={cn("sticky bottom-[4.5rem] z-30 rounded-lg border border-border bg-background px-4 py-3 shadow-md md:bottom-4", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p role="status" className={cn("min-w-0 flex-1 text-sm", failed ? "text-destructive" : "text-foreground")}>
          {count > 0 ? <span className="font-medium">{`${count} unsaved ${count === 1 ? "change" : "changes"}`}</span> : null}
          {count > 0 && message ? " " : null}
          {message}
        </p>
        {count > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onDiscard} disabled={pending} className="min-h-11 md:min-h-9">
              Discard
            </Button>
            <Button onClick={onSave} disabled={pending || problems.length > 0} className="min-h-11 md:min-h-9">
              Save
            </Button>
          </div>
        )}
      </div>
      {problems.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
