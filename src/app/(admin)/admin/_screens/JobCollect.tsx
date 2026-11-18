"use client"

import { CollectPayment } from "@/components/blocks/CollectPayment"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { dollars } from "@/lib/money/collect"
import type { JobActions } from "./job-actions-types"
import type { VisitActions } from "./visit-actions-types"
import type { JobFacts } from "./job-panel-model"
import type { CollectPlan } from "@/lib/money/collect"

// "How is this paid?" for a job, in ONE dialog opened by the footer's Collect (the same block as the visit panel's, `CollectPayment`).
// Money in hand is a payment row on the job for what is unpaid; the invoice and the card are the visit panel's own calls (`visitActions`):
// the card charges the one done visit that is unpaid. Without actions (the catalog) the buttons only log.

export function JobCollectDialog({ facts, plan, visitId, open, onOpenChange, actions, visitActions }: { facts: JobFacts; plan: CollectPlan; visitId?: string; open: boolean; onOpenChange: (open: boolean) => void; actions?: JobActions; visitActions?: VisitActions }) {
  const { job, row } = facts
  const first = row.name.split(" ")[0] ?? row.name
  const log = (what: string) => async () => (console.info(what, job.id), { ok: true as const })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-slot="collect-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">How is this paid?</DialogTitle>
          <DialogDescription className="sr-only">Choose how {first} paid, then press the button. Nothing is charged until you do.</DialogDescription>
        </DialogHeader>
        <CollectPayment
          plan={plan}
          summary={`${facts.heading} · ${dollars(row.owed)} unpaid`}
          firstName={first}
          onCharge={visitActions && visitId ? () => visitActions.chargeCard(visitId) : log("charge")}
          onRecord={(input) => (actions ? actions.recordPayment(job.id, { method: input.method, amount: input.amount ?? row.owed, ...(input.reference ? { reference: input.reference } : {}) }) : log("record")())}
          onInvoice={visitActions ? () => visitActions.sendBill(job.id) : log("invoice")}
          onLater={() => onOpenChange(false)}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
