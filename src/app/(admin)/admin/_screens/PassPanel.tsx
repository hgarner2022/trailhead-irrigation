"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { JobPill } from "@/components/blocks/JobPill"
import { PassActions } from "@/components/blocks/PassActions"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { Pass } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/metrics"
import type { Outcome } from "./action-types"
import type { PassesActions } from "./passes-actions"
import { PENDING_NOTE, chargeRows, consentLine, jobRows } from "./passes-model"

// The body of the Passes side panel: who and what the pass is, its status
// (a pending pass says it is an unpaid attempt), the jobs with their day and
// window and state, the charges and the season line, all read from the same
// visit rows, then the change buttons. Client for the cancel dialog and the
// actions; PassesScreen owns which pass is open.

function Subtitle({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="font-display text-lg leading-tight text-navy">
      {children}
    </h3>
  )
}

function Facts({ pass }: { pass: Pass }) {
  const facts: [string, ReactNode][] = [
    ["Town", pass.town],
    ["Zones", pass.zones],
    ...(pass.accessNote ? ([["Access", pass.accessNote]] as [string, ReactNode][]) : []),
    ["Status", <StatusPill key="status" status={pass.status} />],
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {facts.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Jobs({ pass, today }: { pass: Pass; today: string }) {
  return (
    <ul data-slot="pass-jobs" className="mt-2 divide-y divide-border text-sm">
      {jobRows(pass, today).map((row) => (
        <li key={row.kind} className="flex items-center gap-4 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{row.name}</span>
            {/* The state says Needs a day; the line under the name is for a day and window. */}
            {row.job.state !== "needs-a-day" && <span className="block text-muted-foreground">{row.when}</span>}
          </span>
          <JobPill job={row.job} />
        </li>
      ))}
    </ul>
  )
}

function Charges({ pass }: { pass: Pass }) {
  return (
    <ul className="mt-2 divide-y divide-border text-sm">
      {chargeRows(pass).map((row) => (
        <li key={row.kind} className="flex items-center gap-4 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{row.name}</span>
            <span className="block text-muted-foreground">{row.when}</span>
          </span>
          <span className="text-right">
            <span className="block tabular-nums">{formatMoney(row.amount)}</span>
            <span className="block text-muted-foreground">{row.charged}</span>
          </span>
        </li>
      ))}
    </ul>
  )
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
          <DialogDescription>Nothing further is charged and the remaining visits come off the schedule.</DialogDescription>
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

export function PassDetail({ pass, today, readOnly, actions, run, notice }: { pass: Pass; today: string; readOnly: boolean; actions?: PassesActions; run: (call: () => Promise<Outcome>) => void; notice: string }) {
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
      {/* On its own line, not in the facts grid: beside the thumbnail on a phone it would wrap four deep. */}
      <p data-slot="pass-consent" className="text-sm">
        <span className="text-muted-foreground">Consent </span>
        <span className="font-medium">{consentLine(pass.consent)}</span>
      </p>
      <section aria-labelledby="pass-jobs">
        <Subtitle id="pass-jobs">Jobs</Subtitle>
        <Jobs pass={pass} today={today} />
      </section>
      <section aria-labelledby="pass-season">
        <Subtitle id="pass-season">Season</Subtitle>
        <SeasonLine mode="customer" season={pass.season} visits={pass.visits} today={today} className="mt-3" />
      </section>
      <section aria-labelledby="pass-charges">
        <Subtitle id="pass-charges">Charges</Subtitle>
        <Charges pass={pass} />
      </section>
      {pass.status !== "pending" && (
        <section aria-labelledby="pass-change">
          <Subtitle id="pass-change">Change the pass</Subtitle>
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
