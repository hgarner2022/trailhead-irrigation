"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { ARCHIVE_REASONS, fullName, type ArchiveReason, type Match, type RequestData } from "./request-model"

// The two questions a request asks (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.4). Both are staff decisions and neither sends the person
// anything, so neither has a "without notifying" caret. The dialog states the exact effect before the button does it.

const SELECT = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"

/** How an Accept is worded: a new customer, or a job under the customer the request matches. */
export function acceptWords(r: Pick<RequestData, "first" | "last">, match: Match | null, asNew: boolean): string {
  const name = fullName(r)
  return match && !asNew ? `Create a job that needs a quote for ${match.customer.name}, who is already a customer. Nothing is sent to ${r.first}.` : `Add ${name} as a customer and create a job that needs a quote. Nothing is sent to ${r.first}.`
}

export interface AcceptDialogProps {
  request: RequestData
  match: Match | null
  onClose: () => void
  /** `asNew`: Ryan chose to add a new customer although one matches */
  onAccept: (o: { asNew: boolean }) => void
}

export function AcceptDialog({ request, match, onClose, onAccept }: AcceptDialogProps) {
  const [asNew, setAsNew] = useState(false)
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title="Accept this request?" message={acceptWords(request, match, asNew)} confirmLabel="Accept" slot="accept-request-dialog" onConfirm={async () => (onAccept({ asNew }), { ok: true })}>
      {match && (
        <FormRow label="Customer">
          <select value={asNew ? "new" : "match"} onChange={(e) => setAsNew(e.target.value === "new")} className={SELECT}>
            <option value="match">{`Add to ${match.customer.name} (same ${match.by.join(" and ")})`}</option>
            <option value="new">Add as a new customer instead</option>
          </select>
        </FormRow>
      )}
    </ConfirmDialog>
  )
}

export interface ArchiveDialogProps {
  request: RequestData
  onClose: () => void
  onArchive: (reason: ArchiveReason) => void
}

export function ArchiveDialog({ request, onClose, onArchive }: ArchiveDialogProps) {
  const [reason, setReason] = useState<ArchiveReason>("Spam")
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Archive this request?"
      message={`Archive ${fullName(request)}'s request as ${reason}. No customer is added and nothing is sent.`}
      confirmLabel="Archive request"
      slot="archive-request-dialog"
      onConfirm={async () => (onArchive(reason), { ok: true })}
    >
      <FormRow label="Reason">
        <select value={reason} onChange={(e) => setReason(e.target.value as ArchiveReason)} className={SELECT}>
          {ARCHIVE_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </FormRow>
    </ConfirmDialog>
  )
}
