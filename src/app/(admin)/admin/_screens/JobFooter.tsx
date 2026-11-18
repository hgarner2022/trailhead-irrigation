"use client"

import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import type { Pass } from "@/lib/admin/types"
import type { JobBar, JobBarId } from "./job-footer-model"
import type { JobFacts } from "./job-panel-model"
import { useOpenVisit } from "./VisitPanelHost"

// The job panel's footer, a `RecordFooter`: one filled primary, the next step for this job (`footerPlan`: Add a line for a job waiting on a
// quote, Open visit while a visit is ahead, Collect $145 for work done and unpaid, which opens How is this paid?), up to two
// outlines, More (Record the payment, Resend confirmation, Open in Stripe) and the one destructive ghost at the far right (Cancel pass or
// Cancel job). `jobBar` says which. A tech has no buttons. Open visit opens that visit's panel in place of this one; the customer is
// a link in the facts.

export interface JobFooterProps {
  facts: JobFacts
  bar: JobBar
  nextVisitId?: string
  pass?: Pass
  pending: boolean
  /** opens How is this paid?: the card, check, Venmo, cash, an invoice */
  onCollect: () => void
  onAddVisit: () => void
  onAddLine: () => void
  onSendCardUpdateLink: () => void
  onResendConfirmation: () => void
  onCancelPass: () => void
  onCancelJob: () => void
}

export function JobFooter({ facts, bar, nextVisitId, pass, pending, onCollect, onAddVisit, onAddLine, onSendCardUpdateLink, onResendConfirmation, onCancelPass, onCancelJob }: JobFooterProps) {
  const openVisit = useOpenVisit()
  const act: Record<JobBarId, FooterAction> = {
    "add-line": { label: "Add a line", onClick: onAddLine },
    "open-visit": openVisit && nextVisitId ? { label: "Open visit", onClick: () => openVisit(nextVisitId) } : { label: "Open visit", href: nextVisitId ? `/admin/visits?visit=${encodeURIComponent(nextVisitId)}` : undefined },
    collect: { label: `Collect $${facts.row.owed.toLocaleString("en-US")}`, onClick: onCollect, disabled: pending },
    "new-visit": { label: "New visit", onClick: onAddVisit },
    record: { label: "Record the payment", onClick: onCollect, disabled: pending },
    "card-link": { label: "Send card link", onClick: onSendCardUpdateLink, disabled: pending },
    resend: { label: "Resend confirmation", onClick: onResendConfirmation, disabled: pending },
    stripe: { label: "Open in Stripe", href: pass?.stripeUrl, external: true },
    "cancel-pass": { label: "Cancel pass", onClick: onCancelPass },
    "cancel-job": { label: "Cancel job", onClick: onCancelJob },
  }
  const secondary = bar.secondary.map((id) => act[id])
  return (
    <RecordFooter
      primary={bar.primary ? act[bar.primary] : undefined}
      secondary={secondary.length === 0 ? undefined : secondary.length === 1 ? [secondary[0]!] : [secondary[0]!, secondary[1]!]}
      more={bar.more.map((id) => act[id])}
      destructive={bar.destructive ? act[bar.destructive] : undefined}
    />
  )
}
