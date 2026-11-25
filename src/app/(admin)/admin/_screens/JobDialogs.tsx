"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { DayField } from "@/components/blocks/DayField"
import { FormRow } from "@/components/blocks/FormRow"
import { SERVICE_LIST } from "@/lib/services"
import { OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { FIELD } from "./CustomerPicker"
import type { Outcome } from "./action-types"
import type { JobActions } from "./job-actions-types"
import { servicePriceLine } from "./NewJobService"
import { useOpenVisit } from "./RecordHost"

// The small dialogs the job panel's footer opens, each the one `ConfirmDialog`: Cancel job (the pass's Cancel pass uses it too) and
// New visit (another visit on this job, from the active catalogue). Each says the API's refusal in place and closes when it goes through.

interface VisitProps {
  jobId: string
  data: Pick<AdminData, "services">
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  actions?: JobActions
}

export function NewVisitDialog({ jobId, data, today, open, onOpenChange, actions }: VisitProps) {
  const openVisit = useOpenVisit()
  const services = (data.services ?? (SERVICE_LIST as readonly ServiceItem[])).filter((s) => s.active !== false && (OFFICE_KINDS as readonly string[]).includes(s.kind))
  const [what, setWhat] = useState("")
  const [day, setDay] = useState("")
  const service = services.find((s) => s.key === what)
  const input = service ? { serviceKey: service.key, ...(day ? { scheduledOn: day } : {}) } : undefined
  const add = async () => {
    if (!input) return { ok: false as const, message: "Choose what the visit is for." }
    if (!actions) return (console.info("new visit", jobId, input), { ok: true as const })
    const out = await actions.addVisit(jobId, input)
    if (out.ok) openVisit?.(out.data.id)
    return out
  }
  return (
    <ConfirmDialog
      slot="new-visit"
      title="New visit"
      message="Another visit on this job. With a day, the customer is told the date."
      confirmLabel="Add visit"
      confirmDisabled={!service}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={add}
    >
      <FormRow label="What is the visit for?" hint={service ? servicePriceLine(service) : undefined}>
        <select value={what} onChange={(e) => setWhat(e.target.value)} className={FIELD}>
          <option value="" disabled>
            Choose one
          </option>
          {services.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>
      </FormRow>
      <DayField label="Day, or leave it for later" value={day} onChange={(d) => setDay(d)} from={today.slice(0, 10)} clearable />
    </ConfirmDialog>
  )
}

/** Cancel job: what happens to the schedule and the money, or why it cannot (the job holds a payment, refund it first). */
export function CancelJobDialog({ jobId, held, open, onOpenChange, onCancel }: { jobId: string; held: number; open: boolean; onOpenChange: (open: boolean) => void; onCancel?: (jobId: string) => Promise<Outcome> }) {
  return (
    <ConfirmDialog
      title="Cancel this job?"
      message="Its lines are canceled and its visits not done come off the schedule. The customer is not told. Nothing is deleted."
      blocked={held > 0 ? "This job has a payment. Refund it first." : undefined}
      destructive
      confirmLabel="Cancel job"
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onCancel ? () => onCancel(jobId) : undefined}
      log={`cancel job ${jobId}`}
    />
  )
}
