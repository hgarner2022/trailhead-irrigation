"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import type { Attention } from "@/lib/admin/types"
import { useUndoToast } from "./UndoToast"

// The two buttons on a Needs action row: the kind's one action, and Dismiss (docs/UX_PATTERNS.md: Home is an
// inbox, so every row is clearable). `onAction` and `onDismiss` are server actions in the app (Home's page
// supplies them); without them the buttons only log, as in the catalog. Dismiss acts at once, hides the row and
// offers Undo for ten seconds; Undo runs the same handler with `undo`. A refusal puts the row back and shows
// the API's words under the buttons. Client because of the clicks; the list itself stays a server component.

export const ACTION_LABELS: Record<Attention["kind"], string> = {
  "new-pass": "Open",
  "pending-pass": "Open",
  unpaid: "Paid by",
  "charge-failed": "Send card link",
  "jobs-failed": "Retry",
  "card-expiring": "Send card link",
  "not-closed": "Mark done",
  "pass-cancelled": "Open",
  scheduled: "Open Schedule",
  unplaced: "Place",
}

/** What a server action answers: done, or the words to show. */
export type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

export interface AttentionActionProps {
  item: Attention
  onAction?: (item: Attention) => Promise<ActionResult | void>
  /** dismiss, or with `undo` bring it back */
  onDismiss?: (item: Attention, undo: boolean) => Promise<ActionResult | void>
}

export function AttentionAction({ item, onAction, onDismiss }: AttentionActionProps) {
  const label = ACTION_LABELS[item.kind]
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const [gone, setGone] = useState(false)
  const toast = useUndoToast()
  const run = () => {
    if (!onAction) return console.info(label.toLowerCase(), [item.kind, item.passId])
    start(async () => {
      const result = await onAction(item)
      setNote(result?.message ?? "")
    })
  }
  const dismiss = async () => {
    if (!onDismiss) return console.info("dismiss", [item.kind, item.key])
    setGone(true)
    const result = await onDismiss(item, false)
    if (result && !result.ok) {
      setGone(false)
      setNote(result.message)
      return
    }
    toast("Dismissed.", async () => {
      await onDismiss(item, true)
      setGone(false)
    })
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {gone && <span data-dismissed hidden />}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" data-slot="attention-action" className="min-h-11 shrink-0" aria-label={`${label}: ${item.message}`} disabled={pending} onClick={run}>
          {label}
        </Button>
        <Button size="sm" variant="ghost" data-slot="attention-dismiss" className="min-h-11 shrink-0 text-muted-foreground" aria-label={`Dismiss: ${item.message}`} onClick={() => void dismiss()}>
          Dismiss
        </Button>
      </div>
      <p role="status" className="max-w-48 text-right text-xs text-muted-foreground empty:hidden">
        {note}
      </p>
    </div>
  )
}
