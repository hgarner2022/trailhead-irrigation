"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { DayField } from "@/components/blocks/DayField"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { jobUrl } from "@/lib/admin/links"
import { dollars } from "@/lib/money/collect"
import type { AdminData, Pass, Visit } from "@/lib/admin/types"
import { CancelVisitDialog, EditDialog, TextDialog } from "./VisitEditText"
import { MoveDialog } from "./VisitMove"
import { NotDoneDialog } from "./VisitMoveDone"
import { OnMyWay } from "./VisitOnMyWay"
import { useOpenRecord } from "./RecordHost"
import type { VisitActions } from "./visit-actions-types"
import type { BarId, VisitBar } from "./visit-bar-model"
import { aheadSentence, type VisitFooterPlan } from "./visit-collect-model"
import { FORM_STATUS, useRunner } from "./use-runner"
import { kindLabel, type VisitFacts } from "./visit-panel-model"

// The visit panel's footer (`RecordFooter`) and the dialogs its buttons open, each ONE `ConfirmDialog` and never two at once. Which buttons
// there are, by state, is `visitBar` (docs/plans/2026-11-18-admin-holistic-design.md, section 7). Mark done asks the day (and "This visit is
// scheduled for Friday. Mark it done today?" when its day is ahead), writes the done fact and nothing else, and then the panel itself turns
// to "How is this paid?" (`CollectPayment` in the panel's body, its one button here in the footer). Undo done acts at once with ten seconds
// of Undo; Refund asks first. While the panel is collecting, the footer has the choice's button and a Cancel. Without `actions` (the
// catalog) the buttons only log.

const LABELS: Record<BarId, string> = {
  place: "Schedule",
  move: "Move",
  "mark-done": "Mark done",
  "not-done": "Not done",
  edit: "Edit",
  text: "Send a text",
  "on-my-way": "On my way",
  cancel: "Cancel visit",
  confirmed: "Customer confirmed",
  collect: "Collect the payment",
  "open-job": "Open job",
  "undo-done": "Undo done",
  refund: "Refund",
}

const yearBefore = (day: string) => `${+day.slice(0, 4) - 1}${day.slice(4, 10)}`

function MarkDoneDialog({ visit, today, visitDay, open, onOpenChange, onDone, actions }: { visit: Visit; today: string; visitDay?: string; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void; actions?: VisitActions }) {
  const [day, setDay] = useState(today)
  const toast = useUndoToast()
  const ahead = aheadSentence(visitDay, today)
  const done = async () => {
    if (!actions) return (console.info("mark done", visit.id, day), onDone(), { ok: true as const })
    const out = await actions.markDone(visit.id, day !== today ? { completedOn: day } : {})
    if (out.ok) {
      toast("Marked done. ", async () => void (await actions.undoDone(visit.id)))
      onDone()
    }
    return out
  }
  return (
    <ConfirmDialog
      slot="mark-done"
      title={ahead ? "Mark done today?" : "Mark done"}
      message={ahead || `${kindLabel(visit)} for ${visit.clientName}.`}
      confirmLabel="Mark done"
      confirmDisabled={!day}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={done}
    >
      <p className="text-sm text-muted-foreground">Nothing is charged. How it is paid is the next step.</p>
      <DayField label="Done on" value={day} onChange={(d) => setDay(d || today)} from={yearBefore(today)} to={today} />
    </ConfirmDialog>
  )
}

export interface VisitFooterProps {
  facts: VisitFacts
  people: AdminData["settings"]["people"]
  plan: VisitFooterPlan
  bar: VisitBar
  /** today as a Mountain calendar day */
  today: string
  visitDay?: string
  pass?: Pass
  actions?: VisitActions
  /** beat two is open in the body: the footer holds its one button and a Cancel */
  collecting: boolean
  /** beat two has gone through: the Cancel goes and the one Close stays */
  settled: boolean
  /** open beat two (the unpaid visit's Collect, and what Mark done leads to) */
  onCollect: () => void
  onMarkedDone: () => void
  onLeaveCollect: () => void
}

/** The footer slot of the visit panel and the dialogs it opens. */
export function VisitFooter({ facts, people, plan, bar, today, visitDay, pass, actions, collecting, settled, onCollect, onMarkedDone, onLeaveCollect }: VisitFooterProps) {
  const { visit, client } = facts
  const [open, setOpen] = useState<null | "done" | "move" | "not-done" | "edit" | "text" | "on-my-way" | "cancel" | "refund">(null)
  const shown = (which: NonNullable<typeof open>) => ({ open: open === which, onOpenChange: (o: boolean) => setOpen(o ? which : null) })
  const { pending, error, run } = useRunner()
  const toast = useUndoToast()
  const host = useOpenRecord()
  const refund = plan.refund
  const undo = () => {
    if (!actions) return console.info("undo done", visit.id)
    run(
      () => actions.undoDone(visit.id),
      () => toast("Marked not done yet. ", async () => void (await actions.markDone(visit.id, visit.completedOn ? { completedOn: visit.completedOn } : {}))),
    )
  }
  const confirmed = () => {
    if (!actions) return console.info("customer confirmed", visit.id)
    run(() => actions.confirmDay(visit.id), () => toast("Marked confirmed. "))
  }
  const act: Record<BarId, FooterAction> = {
    place: { label: LABELS.place, onClick: () => setOpen("move") },
    move: { label: LABELS.move, onClick: () => setOpen("move") },
    "mark-done": { label: LABELS["mark-done"], onClick: () => setOpen("done") },
    "not-done": { label: LABELS["not-done"], onClick: () => setOpen("not-done") },
    edit: { label: LABELS.edit, onClick: () => setOpen("edit") },
    text: { label: LABELS.text, onClick: () => setOpen("text") },
    "on-my-way": { label: LABELS["on-my-way"], onClick: () => setOpen("on-my-way") },
    cancel: { label: LABELS.cancel, onClick: () => setOpen("cancel") },
    confirmed: { label: LABELS.confirmed, onClick: confirmed, disabled: pending },
    collect: { label: plan.unpaid > 0 ? `Collect ${dollars(plan.unpaid)}` : LABELS.collect, onClick: onCollect },
    "open-job": host && visit.jobId ? { label: LABELS["open-job"], onClick: () => host.open("job", visit.jobId!) } : { label: LABELS["open-job"], href: visit.jobId ? jobUrl(visit.jobId) : undefined },
    "undo-done": { label: LABELS["undo-done"], onClick: undo, disabled: pending },
    refund: { label: refund ? `Refund ${dollars(refund.left)}` : LABELS.refund, onClick: () => setOpen("refund") },
  }
  const pick = (id: BarId) => act[id]
  const secondary = bar.secondary.map(pick)
  return (
    <>
      {collecting ? (
        <RecordFooter slot secondary={settled ? undefined : [{ label: "Cancel", onClick: onLeaveCollect }]} />
      ) : (
        <RecordFooter
          primary={bar.primary ? pick(bar.primary) : undefined}
          secondary={secondary.length === 0 ? undefined : secondary.length === 1 ? [secondary[0]!] : [secondary[0]!, secondary[1]!]}
          more={bar.more.map(pick)}
          destructive={bar.destructive ? pick(bar.destructive) : undefined}
        />
      )}
      <p role="alert" className={`${FORM_STATUS} w-full text-destructive`}>
        {error}
      </p>
      <MarkDoneDialog visit={visit} today={today} visitDay={visitDay} {...shown("done")} onDone={onMarkedDone} actions={actions} />
      <MoveDialog key={`move-${visit.id}-${visit.scheduledOn ?? ""}`} visit={visit} today={today} actions={actions} {...shown("move")} />
      <NotDoneDialog visit={visit} actions={actions} {...shown("not-done")} />
      <EditDialog key={`edit-${visit.id}`} visit={visit} people={people} actions={actions} {...shown("edit")} />
      <TextDialog client={client} visitId={visit.id} actions={actions} {...shown("text")} />
      <OnMyWay visit={visit} actions={actions} {...shown("on-my-way")} />
      <CancelVisitDialog visit={visit} pass={pass} actions={actions} {...shown("cancel")} />
      {refund && (
        <ConfirmDialog
          title={`Refund ${dollars(refund.left)}?`}
          message={`Takes back the ${dollars(refund.left)} recorded by ${refund.method}. It is a refund row on the job and nothing is deleted. The visit reads unpaid again.`}
          destructive
          confirmLabel={`Refund ${dollars(refund.left)}`}
          {...shown("refund")}
          onConfirm={actions ? () => actions.refundPayment(refund.paymentId) : undefined}
          log={`refund ${refund.paymentId}`}
        />
      )}
    </>
  )
}
