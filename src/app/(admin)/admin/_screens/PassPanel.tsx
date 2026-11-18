"use client"

import { useState, useTransition, type ReactNode } from "react"
import { PANEL_ROW, PanelFacts, PanelHeading, PanelList, PanelRowEnd, PanelRowText } from "@/components/blocks/PanelParts"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { JobPill } from "@/components/blocks/JobPill"
import { OpenVisit } from "./VisitPanelHost"
import { PassActions } from "@/components/blocks/PassActions"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatusPill } from "@/components/blocks/StatusPill"
import { visitPaid } from "@/lib/admin/jobs"
import type { Pass } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/metrics"
import type { Outcome } from "./action-types"
import type { PassesActions } from "./passes-actions"
import { PENDING_NOTE, cardWords, chargeRows, consentLine, jobRows } from "./passes-model"

// The body of the Passes side panel: who and what the pass is, its status
// (a pending pass says it is an unpaid attempt), the consent and the card
// (an active pass sold by the office may have none: "No card yet, collect at
// the visit", with Send card link beside it), the jobs with their day and
// window and state, the charges and the season line, all read from the same
// visit rows, then the change buttons. Client for the cancel dialog and the
// actions; PassesScreen owns which pass is open.

function Facts({ pass }: { pass: Pass }) {
  const facts: [string, ReactNode][] = [
    ["Town", pass.town],
    ["Zones", pass.zones],
    ...(pass.accessNote ? ([["Access", pass.accessNote]] as [string, ReactNode][]) : []),
    ["Status", <StatusPill key="status" status={pass.status} />],
  ]
  return <PanelFacts rows={facts as [string, ReactNode][]} className="mt-0" />
}

function Jobs({ pass, today }: { pass: Pass; today: string }) {
  return (
    <PanelList data-slot="pass-jobs">
      {jobRows(pass, today).map((row) => (
        <li key={row.kind}>
          {/* The row opens the visit's panel (a link to it where there is no host). */}
          <OpenVisit id={row.visitId ?? ""} className={PANEL_ROW}>
            {/* The state says Unscheduled; the line under the name is for a day and window. */}
            <PanelRowText title={row.name} detail={row.job.state !== "needs-a-day" ? row.when : undefined} />
            <PanelRowEnd>
              <JobPill job={row.job} />
            </PanelRowEnd>
          </OpenVisit>
        </li>
      ))}
    </PanelList>
  )
}

function Charges({ pass }: { pass: Pass }) {
  return (
    <PanelList>
      {chargeRows(pass).map((row) => (
        <li key={row.kind} className={`flex items-center ${PANEL_ROW}`}>
          <PanelRowText title={row.name} detail={row.when} />
          <PanelRowEnd>
            <span className="block tabular-nums">{formatMoney(row.amount)}</span>
            <span className="block text-muted-foreground">{row.charged}</span>
          </PanelRowEnd>
        </li>
      ))}
    </PanelList>
  )
}

/** What Cancel the pass says about the money: the visits not yet charged are not charged. */
function cancelMoney(pass: Pass): string {
  const left = pass.visits.filter((v) => !visitPaid(v)).reduce((sum, v) => sum + v.amount, 0)
  return `${left > 0 ? `$${left.toLocaleString("en-US")} in visits not yet charged will not be charged.` : "Nothing further is charged."} The remaining visits come off the schedule.`
}

export function CancelDialog({ pass, open, onOpenChange, onCancel }: { pass: Pass; open: boolean; onOpenChange: (open: boolean) => void; onCancel?: (passId: string) => Promise<Outcome> }) {
  const [pending, start] = useTransition()
  const [problem, setProblem] = useState("")
  const cancel = () => {
    if (!onCancel) {
      console.info("cancel pass", [pass.number])
      return onOpenChange(false)
    }
    start(async () => {
      const out = await onCancel(pass.id)
      setProblem(out.ok ? "" : out.message)
      if (out.ok) onOpenChange(false)
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">Cancel this pass?</DialogTitle>
          <DialogDescription>{cancelMoney(pass)}</DialogDescription>
        </DialogHeader>
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {problem}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep pass
          </Button>
          <Button onClick={cancel} disabled={pending}>
            Cancel pass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PassDetail({ pass, today, readOnly, actions, run, notice }: { pass: Pass; today: string; readOnly: boolean; actions?: PassesActions; run: (call: () => Promise<Outcome>, done?: string) => void; notice: string }) {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="text-sm text-muted-foreground empty:hidden">
        {notice}
      </p>
      <div className="flex items-start gap-5">
        <PassCard pass={pass} size="thumb" interactive={false} className="shrink-0" />
        <Facts pass={pass} />
      </div>
      {pass.status === "pending" && (
        <p data-slot="pass-pending-note" className="text-sm text-muted-foreground">
          {PENDING_NOTE}
        </p>
      )}
      {/* On their own lines, not in the facts grid: beside the thumbnail on a phone they would wrap four deep. */}
      <p data-slot="pass-consent" className="text-sm">
        <span className="text-muted-foreground">Consent </span>
        <span className="font-medium">{consentLine(pass.consent)}</span>
      </p>
      <div data-slot="pass-card-line" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Card </span>
          <span className="font-medium">{cardWords(pass)}</span>
        </p>
        {/* A pass sold with no card gets its link from here; a pass with a card has Send card update link in the footer. */}
        {!readOnly && pass.status === "active" && !pass.cardLast4 && (
          <Button variant="outline" size="sm" onClick={() => (actions ? run(() => actions.sendCardUpdateLink(pass.id), "Card link sent.") : console.info("send card link", [pass.number]))}>
            Send card link
          </Button>
        )}
      </div>
      <section aria-labelledby="pass-jobs">
        <PanelHeading id="pass-jobs">Visits</PanelHeading>
        <Jobs pass={pass} today={today} />
      </section>
      <section aria-labelledby="pass-season">
        <PanelHeading id="pass-season">Season</PanelHeading>
        <SeasonLine mode="customer" season={pass.season} visits={pass.visits} today={today} className="mt-3" />
      </section>
      <section aria-labelledby="pass-charges">
        <PanelHeading id="pass-charges">Charges</PanelHeading>
        <Charges pass={pass} />
      </section>
      {pass.status !== "pending" && (
        <section aria-labelledby="pass-change">
          <PanelHeading id="pass-change">Change the pass</PanelHeading>
          {readOnly ? (
            <p className="mt-3 text-sm text-muted-foreground">A manager changes the pass.</p>
          ) : (
            <PassActions
              pass={pass}
              voice="admin"
              className="mt-3"
              onAddInspection={(id) => (actions ? run(() => actions.addInspection(id)) : console.info("add inspection", [id]))}
              onChangePreference={(kind, preference) => (actions ? run(() => actions.changePreference(pass.id, kind, preference)) : console.info("change preference", [pass.number, kind, preference]))}
              onSkip={(id, kind) => (actions ? run(() => actions.skip(id, kind)) : console.info("skip visit", [id, kind]))}
            />
          )}
        </section>
      )}
      {pass.stripeUrl && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={pass.stripeUrl} target="_blank" rel="noreferrer">
              Open in Stripe
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
