"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { pickMissing, pickOf, pickedService, type ServicePick } from "../requests/request-catalogue"
import { ServicePicker } from "../requests/ServicePicker"
import type { QuoteJob } from "./quote-model"

// Change service (Hannah, Nov 21 2026, docs/plans/2026-11-21-request-conversion-research.md): while no quote has been sent a job's service can be swapped, with the same "What is this for?"
// picker the convert sheet has. The service line takes the new service's name and its catalogue price (none for "Something else"); the notes, the photos and every other line stay, and
// Notes and history says "Service changed from X to Y". Once a quote is out the control is gone: Ryan revises the quote instead. Nothing is sent to the customer. Pure props.

/** A job whose service can still be changed: no quote was ever sent on it, and it was not booked online as a visit. */
export const canChangeService = (job: QuoteJob): boolean => !job.canceled && job.quotes.length === 0 && !job.visit

export interface ChangeServiceDialogProps {
  job: QuoteJob
  onClose: () => void
  onChange: (service: { name: string; price?: number }) => void
  /** where the picker starts: the job's own service when the catalogue has it (a story shows a changed one) */
  initialPick?: ServicePick
}

export function ChangeServiceDialog({ job, onClose, onChange, initialPick }: ChangeServiceDialogProps) {
  const [pick, setPick] = useState<ServicePick>(initialPick ?? pickOf(job.service))
  const chosen = pickedService(pick)
  const same = chosen?.name === job.service
  const missing = pickMissing(pick) || (same ? "This is the current service." : "")
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Change service"
      message={`Change the service from ${job.service}${chosen && !same ? ` to ${chosen.name}` : ""}. The service line becomes the new service, and the notes, photos and other lines stay. Nothing is sent to ${job.first}.`}
      confirmLabel="Change service"
      confirmDisabled={Boolean(missing)}
      slot="change-service-dialog"
      onConfirm={async () => (chosen && onChange({ name: chosen.name, ...(chosen.price !== undefined ? { price: chosen.price } : {}) }), { ok: true })}
    >
      <div className="flex flex-col gap-3">
        <ServicePicker value={pick} onChange={setPick} />
        {missing && <p className="text-sm text-muted-foreground">{missing}</p>}
      </div>
    </ConfirmDialog>
  )
}
