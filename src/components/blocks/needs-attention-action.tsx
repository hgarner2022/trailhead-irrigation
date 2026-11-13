"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import type { Attention } from "@/lib/admin/types"

// The one action on a Needs attention row (the review's rule: Home is an
// inbox, so every row must be clearable). The label is the kind's. `onAction`
// is a server action in the app (Home's page supplies it); without it the
// button only logs, as in the catalog. When the action is refused the API's
// words show under the button. Client because of the click; the list itself
// stays a server component.

export const ACTION_LABELS: Record<Attention["kind"], string> = {
  "new-pass": "Open pass",
  "charge-failed": "Send card link",
  "jobs-failed": "Retry",
  "card-expiring": "Send card link",
  "not-closed": "Review visits",
  "pass-cancelled": "Open in Jobber",
  scheduled: "Open Schedule",
  unplaced: "Place by hand",
}

/** What a server action answers: done, or the words to show. */
export type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

export function AttentionAction({ item, onAction }: { item: Attention; onAction?: (item: Attention) => Promise<ActionResult | void> }) {
  const label = ACTION_LABELS[item.kind]
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const run = () => {
    if (!onAction) return console.info(label.toLowerCase(), [item.kind, item.passId])
    start(async () => {
      const result = await onAction(item)
      setNote(result?.message ?? "")
    })
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button size="sm" variant="outline" data-slot="attention-action" className="shrink-0" aria-label={`${label}: ${item.message}`} disabled={pending} onClick={run}>
        {label}
      </Button>
      <p role="status" className="max-w-40 text-right text-xs text-muted-foreground empty:hidden">
        {note}
      </p>
    </div>
  )
}
