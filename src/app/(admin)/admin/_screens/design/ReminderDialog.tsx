"use client"

import { useState } from "react"
import Link from "next/link"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { Textarea } from "@/components/ui/textarea"
import { REMINDER_LINE_MAX, reminderBody, reminderSubject, type Reach } from "./confirm-copy"

// "Send a payment reminder" (Hannah, Nov 19 2026): a channel choice under the heading (Text, Email or Both, preselected from the customer's
// contact preference; a customer with no mobile or no email has that choice greyed with the reason), the sentence that follows it, a preview
// the office cannot edit that follows it too (the text bubble, the email's subject over its first lines, or both), one optional "Add a line"
// (140 characters, in both) and a quiet link to Settings where the wording lives. There is no "without notifying" caret: the reminder is
// the notification. Pure props.

export type ReminderChannel = "text" | "email" | "both"

export interface ReminderDialogProps {
  who: Reach
  invoice: { number: string; amount: string; service: string; dueOn: string; pastDue?: boolean }
  onClose: () => void
  onSend: (o: { line: string; channel: ReminderChannel }) => void
}

const FIRST_LINES = 3

export function ReminderDialog({ who, invoice, onClose, onSend }: ReminderDialogProps) {
  const hasText = Boolean(who.phone)
  const hasEmail = Boolean(who.email)
  const start: ReminderChannel = who.channel === "email" && hasEmail ? "email" : hasText ? "text" : "email"
  const [channel, setChannel] = useState<ReminderChannel>(start)
  const [line, setLine] = useState("")
  const facts = { amount: invoice.amount, service: invoice.service, dueOn: invoice.dueOn, pastDue: invoice.pastDue, line, number: invoice.number }
  const text = reminderBody({ ...who, channel: "text" }, facts)
  const email = reminderBody({ ...who, channel: "email" }, facts)
  const sentence = `Send a reminder for invoice ${invoice.number} to ${who.first} ${channel === "text" ? `by text at ${who.phone}` : channel === "email" ? `by email at ${who.email}` : "by text and email"}. Nothing else changes.`
  const showText = channel !== "email"
  const showEmail = channel !== "text"
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title="Send a payment reminder" message={sentence} confirmLabel="Send the reminder" size="md" slot="reminder-dialog" onConfirm={async () => (onSend({ line: line.trim(), channel }), { ok: true })}>
      <div className="flex flex-col gap-3 text-sm">
        <SegmentedControl
          label="Send by"
          value={channel}
          onChange={(v) => setChannel(v as ReminderChannel)}
          options={[
            { value: "text", label: "Text", disabled: !hasText, reason: "No mobile number on file" },
            { value: "email", label: "Email", disabled: !hasEmail, reason: "No email on file" },
            { value: "both", label: "Both", disabled: !hasText || !hasEmail, reason: hasText ? "No email on file" : "No mobile number on file" },
          ]}
        />
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">What {who.first} will {channel === "text" ? "read" : channel === "email" ? "get" : "read and get"}</p>
          {showText && (
            <p data-slot="reminder-preview" data-channel="text" className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-stone px-3 py-2">
              {text}
            </p>
          )}
          {showEmail && (
            <div data-slot="reminder-preview" data-channel="email" className="rounded-lg border border-border bg-stone p-3">
              <p className="font-semibold">{reminderSubject(invoice)}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{email.split("\n").slice(0, FIRST_LINES).join("\n")}</p>
            </div>
          )}
          <Link href="/admin/settings?tab=messages" className="inline-flex min-h-11 items-center self-start rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            Edit the wording in Settings
          </Link>
        </div>
        <FormRow label="Add a line (optional)" hint={`${line.length} of ${REMINDER_LINE_MAX}`}>
          <Textarea value={line} maxLength={REMINDER_LINE_MAX} rows={2} onChange={(e) => setLine(e.target.value)} placeholder="A line after the words, if you want one" />
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}
