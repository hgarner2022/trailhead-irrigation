"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { customerUrl } from "@/lib/admin/links"
import type { Pass } from "@/lib/admin/types"
import type { JobPrimary, JobFooterPlan } from "./job-footer-model"
import type { JobFacts } from "./job-panel-model"
import { useOpenVisit } from "./VisitPanelHost"

// The job panel's footer: one filled primary, the next step for this job (`footerPlan`: Add a line for a job waiting on a quote,
// Open visit while a visit is ahead, Send an invoice for work done and unpaid, Record the payment once an invoice is out), then
// the other buttons as outlines, Open customer last, and the one destructive ghost button at the far right (Cancel pass or Cancel
// job). A tech has no buttons but Open customer. Open visit opens that visit's panel in place of this one.

export interface JobFooterProps {
  facts: JobFacts
  plan: JobFooterPlan
  /** a manager: a tech gets Open customer only */
  canAct: boolean
  /** the pass is active and a manager is looking: its own buttons */
  passOpen: boolean
  pass?: Pass
  pending: boolean
  onSendBill: () => void
  onRecord: () => void
  onAddVisit: () => void
  onAddLine: () => void
  onSendCardUpdateLink: () => void
  onResendConfirmation: () => void
  onCancelPass: () => void
  onCancelJob: () => void
}

export function JobFooter({ facts, plan, canAct, passOpen, pass, pending, onSendBill, onRecord, onAddVisit, onAddLine, onSendCardUpdateLink, onResendConfirmation, onCancelPass, onCancelJob }: JobFooterProps) {
  const openVisit = useOpenVisit()
  const { primary } = plan
  // The first button is filled; the rest are outlines.
  const variant = (which: JobPrimary) => (primary === which ? "default" : "outline")
  const buttons: { key: JobPrimary; node: React.ReactNode }[] = []
  if (canAct && primary === "open-visit" && plan.nextVisitId) {
    const id = plan.nextVisitId
    buttons.push({
      key: "open-visit",
      node: openVisit ? (
        <Button key="open-visit" type="button" className="min-h-11" onClick={() => openVisit(id)}>
          Open visit
        </Button>
      ) : (
        <Button key="open-visit" className="min-h-11" asChild>
          <Link href={`/admin/visits?visit=${encodeURIComponent(id)}`}>Open visit</Link>
        </Button>
      ),
    })
  }
  if (canAct && primary === "add-line") {
    buttons.push({ key: "add-line", node: <Button key="add-line" type="button" className="min-h-11" onClick={onAddLine}>Add a line</Button> })
  }
  if (canAct && facts.bill.canSend) {
    buttons.push({ key: "send-invoice", node: <Button key="send-invoice" type="button" variant={variant("send-invoice")} className="min-h-11" disabled={pending} onClick={onSendBill}>Send an invoice</Button> })
  }
  if (canAct && facts.canRecord) {
    buttons.push({ key: "record", node: <Button key="record" type="button" variant={variant("record")} className="min-h-11" onClick={onRecord}>Record the payment</Button> })
  }
  // A Done job is finished: more work for the customer is a new job, so New visit is for a job still being worked.
  if (canAct && facts.canAddVisit && facts.row.stage !== "done") {
    buttons.push({ key: "new-visit", node: <Button key="new-visit" type="button" variant={variant("new-visit")} className="min-h-11" onClick={onAddVisit}>New visit</Button> })
  }
  return (
    <>
      {buttons.map((b) => b.node)}
      {passOpen && pass?.cardLast4 && (
        <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={onSendCardUpdateLink}>
          Send card update link
        </Button>
      )}
      {passOpen && pass && (
        <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={onResendConfirmation}>
          Resend confirmation
        </Button>
      )}
      <Button variant="outline" className="min-h-11" asChild>
        <Link href={customerUrl(facts.row.customerId)}>Open customer</Link>
      </Button>
      {passOpen && pass && (
        <Button type="button" variant="ghost" className="ml-auto min-h-11 text-destructive hover:text-destructive" onClick={onCancelPass}>
          Cancel pass
        </Button>
      )}
      {canAct && facts.canCancel && (
        <Button type="button" variant="ghost" className="ml-auto min-h-11 text-destructive hover:text-destructive" onClick={onCancelJob}>
          Cancel job
        </Button>
      )}
    </>
  )
}
