"use client"

import Link from "next/link"
import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { REMINDER_LINE_MAX, reminderText, type ConfirmFacts } from "./confirm-copy"

/**
 * Send a payment reminder (Hannah, Nov 19 2026): the words are a fixed preview the office cannot rewrite here; the one thing they may do
 * is add a line after them (140 characters, shown live in the preview) and, if the wording itself is wrong, go and change it in Settings.
 * One confirm, no "without notifying": the reminder is the notification.
 */
export function ReminderDialog({ facts, onClose, onSend }: { facts: ConfirmFacts; onClose: () => void; onSend: (line: string) => void }) {
  const [line, setLine] = useState("")
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title="Send a payment reminder"
      message={`Send this text to ${facts.first} at ${facts.phone}.`}
      confirmLabel="Send the reminder"
      slot="reminder-dialog"
      onConfirm={async () => (onSend(line.trim()), { ok: true })}
    >
      <div className="flex flex-col gap-3 text-sm">
        <p data-slot="reminder-preview" className="whitespace-pre-wrap rounded-lg bg-stone p-3">{reminderText(facts, line)}</p>
        <Link href="/admin/settings?tab=messages" className="min-h-11 self-start rounded-sm py-3 text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          Edit the wording in Settings
        </Link>
        <FormRow label="Add a line (optional)" hint={`${line.length} of ${REMINDER_LINE_MAX}`}>
          <Input value={line} maxLength={REMINDER_LINE_MAX} onChange={(e) => setLine(e.target.value)} className="min-h-11" />
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}
