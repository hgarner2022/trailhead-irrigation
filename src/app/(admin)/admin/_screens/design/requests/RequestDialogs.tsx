"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { pickMissing, pickOf, pickedService, type ServicePick } from "./request-catalogue"
import { ServicePicker } from "./ServicePicker"
import { ARCHIVE_REASONS, fullName, type ArchiveReason, type Match, type RequestData } from "./request-model"

// The two questions a request asks (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.4). Both are staff decisions and neither sends the person
// anything, so neither has a "without notifying" caret. The dialog states the exact effect before the button does it.

const SELECT = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"

/** The two ways out of a request: a job (ready to schedule when its service is priced, else it reads Needs a quote) or a quote to price and send. */
export type CreateMode = "job" | "quote"

/** How Create job and Send a quote are worded: a new customer, or a job under the customer the request matches, and the service Ryan chose once he has. Both state the exact effect and say nothing is sent. */
export function createWords(r: Pick<RequestData, "first" | "last">, match: Match | null, asNew: boolean, mode: CreateMode, service?: string): string {
  const name = fullName(r)
  const known = match && !asNew ? match.customer.name : null
  if (mode === "quote") {
    const quote = service ? `a ${service} quote` : "a quote"
    return known ? `Open ${quote} to price and send for ${known}, who is already a customer. Nothing is sent to ${r.first} yet.` : `Add ${name} as a customer and open ${quote} to price and send. Nothing is sent to ${r.first} yet.`
  }
  const job = service ? `a ${service} job` : "a job"
  return known ? `Create ${job} for ${known}, who is already a customer. Nothing is sent to ${r.first}.` : `Add ${name} as a customer and create ${job}. Nothing is sent to ${r.first}.`
}

/** The service Ryan chose in the sheet: a catalogue service with its price, or "Something else" with the name he typed and no price. */
export interface ChosenService {
  name: string
  price?: number
}

export interface CreateJobDialogProps {
  request: RequestData
  match: Match | null
  mode: CreateMode
  onClose: () => void
  /** `asNew`: Ryan chose to add a new customer although one matches; `service`: what the job is for */
  onCreate: (o: { asNew: boolean; mode: CreateMode; service: ChosenService }) => void
  /** where the picker starts: the request's own service when the catalogue has it, empty when it did not (a story shows a changed one) */
  initialPick?: ServicePick
}

/** The convert sheet (docs/plans/2026-11-21-request-conversion-research.md): the customer, the required "What is this for?" and the exact effect. The button stays off until a service is chosen, and one quiet line says what is missing. */
export function CreateJobDialog({ request, match, mode, onClose, onCreate, initialPick }: CreateJobDialogProps) {
  const [asNew, setAsNew] = useState(false)
  const [pick, setPick] = useState<ServicePick>(initialPick ?? pickOf(request.service))
  const label = mode === "quote" ? "Send a quote" : "Create job"
  const chosen = pickedService(pick)
  const missing = pickMissing(pick)
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={label}
      message={createWords(request, match, asNew, mode, chosen?.name)}
      confirmLabel={label}
      confirmDisabled={Boolean(missing)}
      slot="create-job-dialog"
      onConfirm={async () => (chosen && onCreate({ asNew, mode, service: { name: chosen.name, ...(chosen.price !== undefined ? { price: chosen.price } : {}) } }), { ok: true })}
    >
      <div className="flex flex-col gap-3">
        {match ? (
          <FormRow label="Customer">
            <select value={asNew ? "new" : "match"} onChange={(e) => setAsNew(e.target.value === "new")} className={SELECT}>
              <option value="match">{`Add to ${match.customer.name} (same ${match.by.join(" and ")})`}</option>
              <option value="new">Add as a new customer instead</option>
            </select>
          </FormRow>
        ) : (
          <div className="text-sm">
            <p className="font-medium">Customer</p>
            <p>New customer</p>
          </div>
        )}
        <ServicePicker value={pick} onChange={setPick} />
        {missing && <p className="text-sm text-muted-foreground">{missing}</p>}
      </div>
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
