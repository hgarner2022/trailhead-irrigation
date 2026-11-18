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
import type { JobActions } from "./job-actions-types"
import { servicePriceLine } from "./NewJobService"
import { FORM_STATUS, useRunner } from "./use-runner"
import { useOpenVisit } from "./VisitPanelHost"

// The small dialogs the job panel's footer opens: Cancel job (the one confirm dialog, `ConfirmCancel`, the pass's Cancel pass uses it too), Record the payment (money handed over by check, Venmo or cash, for what is
// owed or less) and New visit (another visit on this job, from the active catalogue). Each is a dialog over the panel that says
// the API's refusal in place and closes when it goes through.

const METHODS = [
  { value: "check", label: "Check" },
  { value: "venmo", label: "Venmo" },
  { value: "cash", label: "Cash" },
] as const

type Method = (typeof METHODS)[number]["value"]

interface RecordProps {
  jobId: string
  /** whole dollars still unpaid; the amount starts here */
  owed: number
  open: boolean
  onOpenChange: (open: boolean) => void
  actions?: JobActions
}

export function RecordPaymentDialog({ jobId, owed, open, onOpenChange, actions }: RecordProps) {
  const [method, setMethod] = useState<Method>("check")
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState<string | null>(null)
  const { pending, error, run } = useRunner()
  const shown = amount ?? String(owed)
  const record = () => {
    const input = { method, amount: Number(shown) || 0, ...(reference.trim() ? { reference: reference.trim() } : {}) }
    if (!actions) return (console.info("record payment", jobId, input), onOpenChange(false))
    run(() => actions.recordPayment(jobId, input), () => onOpenChange(false))
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-slot="record-payment">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">Record the payment</DialogTitle>
          <DialogDescription>{`$${owed.toLocaleString("en-US")} is unpaid. A payment that covers it settles any invoice that is out.`}</DialogDescription>
        </DialogHeader>
        <fieldset>
          <legend className={LABEL}>Paid by</legend>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <label key={m.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="radio" name="job-paid-by" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="size-4 accent-primary" />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pay-amount" className={LABEL}>
              Amount
            </label>
            <Input id="pay-amount" inputMode="numeric" value={shown} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
          </div>
          <div>
            <label htmlFor="pay-ref" className={LABEL}>
              {method === "check" ? "Check number" : method === "venmo" ? "Venmo handle" : "Note"}
            </label>
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} className="min-h-11" />
          </div>
        </div>
        <p role="alert" className={`${FORM_STATUS} text-destructive`}>
          {error}
        </p>
        <div className="flex gap-2">
          <Button type="button" className="min-h-11" disabled={pending || !Number(shown)} onClick={record}>
            Record payment
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Never mind
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
export function CancelJobDialog({ jobId, held, open, onOpenChange, onCancel }: { jobId: string; held: number; open: boolean; onOpenChange: (open: boolean) => void; onCancel?: (jobId: string) => Promise<{ ok: true } | { ok: false; message: string }> }) {
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
