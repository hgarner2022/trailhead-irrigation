"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CollectPayment } from "@/components/blocks/CollectPayment"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { dollars } from "@/lib/money/collect"
import type { Visit } from "@/lib/admin/types"
import { ConfirmCancel } from "./ConfirmCancel"
import type { VisitActions } from "./visit-actions-types"
import { aheadSentence, type VisitFooterPlan } from "./visit-collect-model"
import { FORM_STATUS, useRunner } from "./use-runner"
import { kindLabel } from "./visit-panel-model"

// The visit panel's footer and the two beats it opens, each in ONE dialog (never two at once): Mark done (the day, and "This visit is
// scheduled for Friday. Mark it done today?" when its day is ahead), which writes the done fact and nothing else; then "How is this
// paid?" (`CollectPayment`), which opens at once when the visit is unpaid and again from the primary "Collect $145". Undo done acts at
// once with ten seconds of Undo; Refund asks first. Without `actions` (the catalog) the buttons only log.

const LABEL = "mb-1 block text-sm font-medium text-foreground"

function MarkDoneDialog({ visit, today, visitDay, open, onOpenChange, onDone, actions }: { visit: Visit; today: string; visitDay?: string; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void; actions?: VisitActions }) {
  const [day, setDay] = useState(today)
  const { pending, error, run } = useRunner()
  const toast = useUndoToast()
  const ahead = aheadSentence(visitDay, today)
  const done = () => {
    if (!actions) return (console.info("mark done", visit.id, day), onOpenChange(false), onDone())
    run(
      () => actions.markDone(visit.id, day !== today ? { completedOn: day } : {}),
      () => {
        onOpenChange(false)
        toast("Marked done. ", async () => void (await actions.undoDone(visit.id)))
        onDone()
      },
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-slot="mark-done">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">{ahead ? "Mark done today?" : "Mark done"}</DialogTitle>
          <DialogDescription>{ahead || `${kindLabel(visit)} for ${visit.clientName}.`}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Nothing is charged. How it is paid is the next step.</p>
        <div className="max-w-48">
          <label htmlFor="done-day" className={LABEL}>
            Done on
          </label>
          <Input id="done-day" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} className="min-h-11" />
        </div>
        <p role="alert" className={`${FORM_STATUS} text-destructive`}>
          {error}
        </p>
        <div className="flex gap-2">
          <Button type="button" className="min-h-11" disabled={pending || !day} onClick={done}>
            Mark done
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Never mind
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface FooterProps {
  visit: Visit
  plan: VisitFooterPlan
  today: string
  visitDay?: string
  firstName: string
  summary: string
  actions?: VisitActions
}

/** The buttons for the footer slot and the dialogs they open. Render inside `SidePanel`'s `footer` prop. */
export function VisitFooter({ visit, plan, today, visitDay, firstName, summary, actions }: FooterProps) {
  const [doneOpen, setDoneOpen] = useState(false)
  const [collectOpen, setCollectOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const { pending, error, run } = useRunner()
  const toast = useUndoToast()
  const refund = plan.refund
  const undo = () => {
    if (!actions) return console.info("undo done", visit.id)
    run(
      () => actions.undoDone(visit.id),
      () => toast("Marked not done yet. ", async () => void (await actions.markDone(visit.id, visit.completedOn ? { completedOn: visit.completedOn } : {}))),
    )
  }
  const log = (what: string) => async () => (console.info(what, visit.id), { ok: true as const })
  return (
    <>
      {plan.primary === "mark-done" && (
        <Button type="button" className="min-h-11" onClick={() => setDoneOpen(true)}>
          Mark done
        </Button>
      )}
      {plan.primary === "collect" && (
        <Button type="button" className="min-h-11" onClick={() => setCollectOpen(true)}>
          {plan.unpaid > 0 ? `Collect ${dollars(plan.unpaid)}` : "Collect the payment"}
        </Button>
      )}
      {plan.canUndo && (
        <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={undo}>
          Undo done
        </Button>
      )}
      {refund && (
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setRefundOpen(true)}>
          {`Refund ${dollars(refund.left)}`}
        </Button>
      )}
      <p role="alert" className={`${FORM_STATUS} w-full text-destructive`}>
        {error}
      </p>
      <MarkDoneDialog visit={visit} today={today} visitDay={visitDay} open={doneOpen} onOpenChange={setDoneOpen} onDone={() => setCollectOpen(true)} actions={actions} />
      {plan.plan && (
        <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
          <DialogContent className="sm:max-w-md" data-slot="collect-dialog">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-semibold text-navy">How is this paid?</DialogTitle>
              <DialogDescription className="sr-only">Choose how {firstName} paid, then press the button. Nothing is charged until you do.</DialogDescription>
            </DialogHeader>
            <CollectPayment
              plan={plan.plan}
              summary={summary}
              firstName={firstName}
              onCharge={actions ? () => actions.chargeCard(visit.id) : log("charge")}
              onRecord={actions ? (input) => actions.recordPayment(visit.id, input) : log("record")}
              onInvoice={actions && visit.jobId ? () => actions.sendBill(visit.jobId!) : log("invoice")}
              onLater={() => setCollectOpen(false)}
              onClose={() => setCollectOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
      {refund && (
        <ConfirmCancel
          title={`Refund ${dollars(refund.left)}?`}
          message={`Takes back the ${dollars(refund.left)} recorded by ${refund.method}. It is a refund row on the job and nothing is deleted. The visit reads unpaid again.`}
          keepLabel="Keep payment"
          cancelLabel={`Refund ${dollars(refund.left)}`}
          open={refundOpen}
          onOpenChange={setRefundOpen}
          onConfirm={actions ? () => actions.refundPayment(refund.paymentId) : undefined}
          log={`refund ${refund.paymentId}`}
        />
      )}
    </>
  )
}
