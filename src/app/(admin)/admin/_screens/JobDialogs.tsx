"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SERVICE_LIST } from "@/lib/services"
import { OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { ConfirmCancel } from "./ConfirmCancel"
import { FIELD, LABEL } from "./CustomerPicker"
import type { Outcome } from "./action-types"
import type { JobActions } from "./job-actions-types"
import { servicePriceLine } from "./NewJobService"
import { FORM_STATUS, useRunner } from "./use-runner"
import { useOpenVisit } from "./VisitPanelHost"

// The small dialogs the job panel's footer opens: Cancel job (the one confirm dialog, `ConfirmCancel`, the pass's Cancel pass uses it too) and New visit (another visit on this job, from the active catalogue). Each is a dialog over the panel that says
// the API's refusal in place and closes when it goes through.

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
  const { pending, error, run } = useRunner()
  const service = services.find((s) => s.key === what)
  const add = () => {
    if (!service) return
    const input = { serviceKey: service.key, ...(day ? { scheduledOn: day } : {}) }
    if (!actions) return (console.info("new visit", jobId, input), onOpenChange(false))
    run(() => actions.addVisit(jobId, input), ({ id }) => (onOpenChange(false), openVisit?.(id)))
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-slot="new-visit">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">New visit</DialogTitle>
          <DialogDescription>Another visit on this job. With a day, the customer is told the date.</DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor="nv-what" className={LABEL}>
            What is the visit for?
          </label>
          <select id="nv-what" value={what} onChange={(e) => setWhat(e.target.value)} className={FIELD}>
            <option value="" disabled>
              Choose one
            </option>
            {services.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
          {service && <p className="mt-2 text-sm text-muted-foreground">{servicePriceLine(service)}</p>}
        </div>
        <div>
          <label htmlFor="nv-day" className={LABEL}>
            Day, or leave it for later
          </label>
          <Input id="nv-day" type="date" value={day} min={today.slice(0, 10)} onChange={(e) => setDay(e.target.value)} className="min-h-11" />
        </div>
        <p role="alert" className={`${FORM_STATUS} text-destructive`}>
          {error}
        </p>
        <div className="flex gap-2">
          <Button type="button" className="min-h-11" disabled={pending || !service} onClick={add}>
            Add visit
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Never mind
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Cancel job: what happens to the schedule and the money, or why it cannot (the job holds a payment, refund it first). */
export function CancelJobDialog({ jobId, held, open, onOpenChange, onCancel }: { jobId: string; held: number; open: boolean; onOpenChange: (open: boolean) => void; onCancel?: (jobId: string) => Promise<Outcome> }) {
  return (
    <ConfirmCancel
      title="Cancel this job?"
      message="Its lines are canceled and its visits not done come off the schedule. The customer is not told. Nothing is deleted."
      blocked={held > 0 ? "This job has a payment. Refund it first." : undefined}
      keepLabel="Keep job"
      cancelLabel="Cancel job"
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onCancel ? () => onCancel(jobId) : undefined}
      log={`cancel job ${jobId}`}
    />
  )
}
