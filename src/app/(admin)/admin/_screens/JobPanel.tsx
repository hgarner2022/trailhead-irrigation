"use client"

import { useState } from "react"
import Link from "next/link"
import { RECORD_ROW, RecordList, RecordPanel, RecordRowEnd, RecordRowText, type RecordFact } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPills } from "@/components/blocks/StatusPill"
import { Button } from "@/components/ui/button"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { visitJob } from "@/lib/admin/jobs"
import { customerUrl } from "@/lib/admin/links"
import type { AdminData, Visit } from "@/lib/admin/types"
import type { JobActions } from "./job-actions-types"
import { footerPlan, jobBar } from "./job-footer-model"
import { jobCollect, jobFacts, type JobFacts } from "./job-panel-model"
import { JobFooter } from "./JobFooter"
import { CancelJobDialog, NewVisitDialog } from "./JobDialogs"
import { JobCollectDialog } from "./JobCollect"
import { JobLinesSection } from "./JobLinesSection"
import { JobMoneySection } from "./JobMoneySection"
import { MoneyPill, StagePill } from "./JobPills"
import { PanelNotes } from "./PanelNotes"
import { CancelDialog, PassChange, PassSeasonView } from "./PassPanel"
import { propertyLines } from "./customers-model"
import { useRunner } from "./use-runner"
import type { VisitActions } from "./visit-actions-types"
import { OpenVisit } from "./VisitPanelHost"
import { dayLabel, dayOfVisit, kindLabel } from "./visit-panel-model"

// The job panel, through the one SidePanel (docs/DESIGN.md, Uniformity): the customer's name and what the job is in the header, the
// stage and money pills, then Property, Lines, Visits, Money and Notes (a Season Pass shows its season in place of Lines and
// Visits, with its own buttons), and the footer's actions. A tech sees all of it and no buttons. Notes and history is the story
// of the job (`events.*`) with an Add note that a tech may use too.

function Property({ facts, readOnly }: { facts: JobFacts; readOnly: boolean }) {
  const lines = propertyLines(facts.yard, { canSeeContact: !readOnly })
  const street = facts.row.property
  if (!street && lines.length === 0) return null
  return (
    <section aria-labelledby="job-property" data-slot="job-property">
      <SectionHeading id="job-property">Property</SectionHeading>
      <ul className="mt-2 space-y-1 text-sm">
        {street && <li className="font-medium">{street}</li>}
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  )
}

function Visits({ visits, facts, today }: { visits: Visit[]; facts: JobFacts; today: string }) {
  const day = dayOf(today, TIME_ZONE)
  return (
    <section aria-labelledby="job-visits" data-slot="job-visits">
      <SectionHeading id="job-visits">Visits</SectionHeading>
      {visits.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No visits yet.</p>
      ) : (
        <RecordList>
          {visits.map((v) => {
            const d = dayOfVisit(v)
            const detail = [d ? dayLabel(d) : "", v.personName].filter(Boolean).join(", ")
            return (
              <li key={v.id}>
                <OpenVisit id={v.id} className={RECORD_ROW}>
                  <RecordRowText title={kindLabel(v)} detail={detail || undefined} />
                  <RecordRowEnd>
                    <StatusPills job={visitJob(v, day, TIME_ZONE, facts.pass?.cardFailedAt)} />
                  </RecordRowEnd>
                </OpenVisit>
              </li>
            )
          })}
        </RecordList>
      )}
    </section>
  )
}

export interface JobPanelProps {
  data: AdminData
  today: string
  jobId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  /** a tech reads the job and changes nothing */
  readOnly?: boolean
  /** the job panel's own actions (lines, payments, a new visit, the pass's buttons) */
  actions?: JobActions
  /** Send an invoice and Remind, the same ones the visit panel uses */
  visitActions?: VisitActions
}

export function JobPanel({ data, today, jobId, open, onOpenChange, readOnly = false, actions, visitActions }: JobPanelProps) {
  const facts = jobId ? jobFacts(data, jobId, today) : undefined
  const { pending, error, done, run } = useRunner()
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancellingJob, setCancellingJob] = useState(false)
  // Add a line is the primary of a job waiting on a quote, so the Lines section's own form is opened from the footer.
  const [addingLine, setAddingLine] = useState(false)
  // The Collect dialog keeps what it opened with, as state, like the visit panel's: after the money arrives the job no longer offers Collect,
  // but the dialog stays to say what happened until it is closed, and a later Refund must not bring it back by itself.
  const [collect, setCollect] = useState<{ facts: JobFacts; plan: ReturnType<typeof jobCollect> } | null>(null)
  if (!facts) return null
  const { job, row, pass, bill } = facts
  const say = (call: () => Promise<{ ok: boolean }>, said?: string) => run(call as never, undefined, said ?? "")
  const canAct = !readOnly
  const passOpen = canAct && pass?.status === "active"
  const plan = footerPlan(facts, canAct)
  const bar = jobBar(facts, plan, canAct, pass, passOpen)
  // a Done and paid job, a canceled one and a tech have no buttons: no footer strip at all
  const hasFooter = Boolean(bar.primary || bar.secondary.length || bar.more.length || bar.destructive)
  const rec: RecordFact[] = [
    ["Customer", <Link key="c" href={customerUrl(row.customerId)} className="text-primary-dark underline underline-offset-2">{row.name}</Link>],
    ["Total", row.total > 0 ? `$${row.total.toLocaleString("en-US")}` : "Quote later"],
    ...(row.owed > 0 ? ([["Unpaid", `$${row.owed.toLocaleString("en-US")}`]] as RecordFact[]) : []),
    ["Next", row.nextText],
  ]
  return (
    <RecordPanel
      open={open}
      onOpenChange={onOpenChange}
      title={row.name}
      subtitle={facts.heading}
      pills={
        <>
          <StagePill stage={row.stage} />
          <MoneyPill money={row.money} />
        </>
      }
      facts={rec}
      slot="job-panel"
      notice={
        <>
          <p role="status" className="text-sm text-muted-foreground empty:hidden">
            {done}
          </p>
          <p role="alert" className="text-sm text-destructive empty:hidden">
            {error}
          </p>
        </>
      }
      footer={
        hasFooter ? (
        <JobFooter
          facts={facts}
          bar={bar}
          nextVisitId={plan.nextVisitId}
          pass={pass}
          pending={pending}
          onCollect={() => setCollect({ facts, plan: jobCollect(facts, data) })}
          onAddVisit={() => setAdding(true)}
          onAddLine={() => setAddingLine(true)}
          onSendCardUpdateLink={() => (actions?.pass ? say(() => actions.pass!.sendCardUpdateLink(pass!.id), "Card update link sent.") : console.info("send card update link", [pass!.number]))}
          onResendConfirmation={() => (actions?.pass ? say(() => actions.pass!.resendConfirmation(pass!.id), "Confirmation sent.") : console.info("resend confirmation", [pass!.number]))}
          onCancelPass={() => setCancelling(true)}
          onCancelJob={() => setCancellingJob(true)}
        />
        ) : undefined
      }
    >
      <Property facts={facts} readOnly={readOnly} />
      {pass ? (
        <>
          <PassSeasonView
            pass={pass}
            today={today}
            money={row.moneyText}
            idPrefix="job-pass"
            withAccess={false}
            cardAction={
              passOpen && !pass.cardLast4 ? (
                <Button type="button" variant="outline" size="sm" onClick={() => (actions?.pass ? say(() => actions.pass!.sendCardUpdateLink(pass.id), "Card link sent.") : console.info("send card link", [pass.number]))}>
                  Send card link
                </Button>
              ) : undefined
            }
          />
          {canAct && pass.status === "active" && <PassChange pass={pass} actions={actions?.pass} run={(call, said) => say(call, said)} />}
          {pass && <CancelDialog pass={pass} open={cancelling} onOpenChange={setCancelling} onCancel={actions?.pass?.cancel} />}
        </>
      ) : (
        <>
          <JobLinesSection jobId={job.id} lines={facts.lines} total={row.total} tax={facts.tax} data={data} editable={canAct && facts.canEditLines} actions={actions} adding={addingLine} onAddingChange={setAddingLine} addInFooter />
          <Visits visits={facts.visits} facts={facts} today={today} />
        </>
      )}
      <JobMoneySection row={row} payments={facts.payments} bill={bill} actions={canAct ? visitActions : undefined} />
      {/* Notes are in the Notes and history block; the plain row stays for a job whose story is missing (the catalog's fixtures), so a note typed at the sale never disappears. */}
      {job.notes && !job.timeline && (
        <section aria-labelledby="job-notes" data-slot="job-notes">
          <SectionHeading id="job-notes">Notes</SectionHeading>
          <p className="mt-2 whitespace-pre-line text-sm">{job.notes}</p>
        </section>
      )}
      <PanelNotes about="job" aboutId={job.id} timeline={job.timeline} addNote={actions?.addNote} />
      {collect && <JobCollectDialog facts={collect.facts} {...collect.plan} open onOpenChange={(o) => !o && setCollect(null)} actions={actions} visitActions={visitActions} />}
      {canAct && facts.canCancel && <CancelJobDialog jobId={job.id} held={facts.held} open={cancellingJob} onOpenChange={setCancellingJob} onCancel={actions?.cancelJob} />}
      {canAct && facts.canAddVisit && <NewVisitDialog jobId={job.id} data={data} today={today} open={adding} onOpenChange={setAdding} actions={actions} />}
    </RecordPanel>
  )
}
