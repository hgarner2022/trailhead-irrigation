"use client"

import { Button } from "@/components/ui/button"
import type { Attention } from "@/lib/admin/types"

// The one action on a Needs attention row (the review's rule: Home is an
// inbox, so every row must be clearable). The label is the kind's; the
// prototype only logs, and the wiring plan's server actions replace
// `onAction`. Client because of the click; the list itself stays a server
// component.

export const ACTION_LABELS: Record<Attention["kind"], string> = {
  "new-pass": "Open pass",
  "charge-failed": "Send card link",
  "jobs-failed": "Retry",
  "card-expiring": "Send card link",
  "not-closed": "Review visits",
  "pass-cancelled": "Open in Jobber",
}

export function AttentionAction({ item, onAction }: { item: Attention; onAction?: (item: Attention) => void }) {
  const label = ACTION_LABELS[item.kind]
  return (
    <Button
      size="sm"
      variant="outline"
      data-slot="attention-action"
      className="shrink-0"
      aria-label={`${label}: ${item.message}`}
      onClick={() => (onAction ? onAction(item) : console.info(label.toLowerCase(), [item.kind, item.passId]))}
    >
      {label}
    </Button>
  )
}
