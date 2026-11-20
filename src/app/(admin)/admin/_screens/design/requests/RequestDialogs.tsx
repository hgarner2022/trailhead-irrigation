"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { ARCHIVE_REASONS, fullName, type ArchiveReason, type Match, type RequestData } from "./request-model"

// The two questions a request asks (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.4). Both are staff decisions and neither sends the person
// anything, so neither has a "without notifying" caret. The dialog states the exact effect before the button does it.

const SELECT = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"

/** The two ways out of a request: a job (ready to schedule when its service is priced, else it reads Needs a quote) or a quote to price and send. */
export type CreateMode = "job" | "quote"

/** How Create job and Send a quote are worded: a new customer, or a job under the customer the request matches. Both state the exact effect and say nothing is sent. */
export function createWords(r: Pick<RequestData, "first" | "last">, match: Match | null, asNew: boolean, mode: CreateMode, quoteFirst = false): string {
  const name = fullName(r)
  const known = match && !asNew ? match.customer.name : null
  if (mode === "quote") {
    return known
      ? `Open a quote to price and send for ${known}, who is already a customer. Nothing is sent to ${r.first} yet.`
      : `Add ${name} as a customer and open a quote to price and send. Nothing is sent to ${r.first} yet.`
  }
  const tail = quoteFirst ? " It reads Needs a quote until its line has a price." : ""
  return known ? `Create a job for ${known}, who is already a customer. Nothing is sent to ${r.first}.${tail}` : `Add ${name} as a customer and create a job. Nothing is sent to ${r.first}.${tail}`
}

export interface CreateJobDialogProps {
  request: RequestData
  match: Match | null
  mode: CreateMode
  /** the service is quoted first (its catalogue price is not set) */
  quoteFirst: boolean
  onClose: () => void
  /** `asNew`: Ryan chose to add a new customer although one matches */
  onCreate: (o: { asNew: boolean; mode: CreateMode }) => void
}

export function CreateJobDialog({ request, match, mode, quoteFirst, onClose, onCreate }: CreateJobDialogProps) {
  const [asNew, setAsNew] = useState(false)
  const label = mode === "quote" ? "Send a quote" : "Create job"
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title={label} message={createWords(request, match, asNew, mode, quoteFirst)} confirmLabel={label} slot="create-job-dialog" onConfirm={async () => (onCreate({ asNew, mode }), { ok: true })}>
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
