"use client"

import { CollectPayment } from "@/components/blocks/CollectPayment"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import type { JobActions } from "./job-actions-types"
import type { VisitActions } from "./visit-actions-types"
import type { JobFacts } from "./job-panel-model"
import type { CollectPlan } from "@/lib/money/collect"
import { money } from "@/lib/admin/format"

// "How is this paid?" for a job, in ONE dialog opened by the footer's Collect (the same block as the visit panel's, `CollectPayment`).
// Money in hand is a payment row on the job for what is unpaid; the invoice and the card are the visit panel's own calls (`visitActions`):
// the card charges the one done visit that is unpaid. Without actions (the catalog) the buttons only log.

export function JobCollectDialog({ facts, plan, visitId, open, onOpenChange, actions, visitActions }: { facts: JobFacts; plan: CollectPlan; visitId?: string; open: boolean; onOpenChange: (open: boolean) => void; actions?: JobActions; visitActions?: VisitActions }) {
  const { job, row } = facts
  const first = row.name.split(" ")[0] ?? row.name
  const log = (what: string) => async () => (console.info(what, job.id), { ok: true as const })
  return (
    <ConfirmDialog slot="collect-dialog" size="md" title="How is this paid?" actions="none" open={open} onOpenChange={onOpenChange}>
        <CollectPayment
          plan={plan}
          summary={`${facts.heading} · ${money(row.owed)} unpaid`}
          firstName={first}
          onCharge={visitActions && visitId ? () => visitActions.chargeCard(visitId) : log("charge")}
          onRecord={(input) => (actions ? actions.recordPayment(job.id, { method: input.method, amount: input.amount ?? row.owed, ...(input.reference ? { reference: input.reference } : {}) }) : log("record")())}
          onInvoice={visitActions ? () => visitActions.sendBill(job.id) : log("invoice")}
          onLater={() => onOpenChange(false)}
          onClose={() => onOpenChange(false)}
        />
    </ConfirmDialog>
  )
}
