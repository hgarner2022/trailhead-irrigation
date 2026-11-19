"use client"

import { useState } from "react"
import Link from "next/link"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { Textarea } from "@/components/ui/textarea"
import { REMINDER_LINE_MAX, reminderBody, reminderCopy, type Reach } from "./confirm-copy"

// "Send a payment reminder" (Hannah, Nov 19 2026): the dialog names the channel from the customer's contact preference, shows exactly what goes
// out as a preview the office cannot edit, and allows one optional "Add a line" (140 characters) after it. The wording itself is edited in
// Settings, the quiet link under the preview. There is no "without notifying" caret: the reminder is the notification. Pure props.

export interface ReminderDialogProps {
  who: Reach
  invoice: { number: string; amount: string; service: string; dueOn: string; pastDue?: boolean }
  onClose: () => void
  onSend: (o: { line: string }) => void
}

export function ReminderDialog({ who, invoice, onClose, onSend }: ReminderDialogProps) {
  const [line, setLine] = useState("")
  const copy = reminderCopy(who, { number: invoice.number })
  const body = reminderBody(who, { amount: invoice.amount, service: invoice.service, dueOn: invoice.dueOn, pastDue: invoice.pastDue, line })
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title={copy.title} message={copy.message} confirmLabel={copy.confirmLabel} size="md" slot="reminder-dialog" onConfirm={async () => (onSend({ line: line.trim() }), { ok: true })}>
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <p className="mb-1 text-muted-foreground">What {who.first} will {who.channel === "text" ? "read" : "get"}</p>
          <p data-slot="reminder-preview" className="whitespace-pre-wrap rounded-lg bg-stone p-3">{body}</p>
          <Link href="/admin/settings?tab=messages" className="mt-1 inline-flex min-h-11 items-center rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            Edit the wording in Settings
          </Link>
        </div>
        <FormRow label="Add a line (optional)" hint={`${line.length} of ${REMINDER_LINE_MAX}`}>
          <Textarea value={line} maxLength={REMINDER_LINE_MAX} rows={2} onChange={(e) => setLine(e.target.value)} placeholder="The gate is open, a thank you" />
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}
