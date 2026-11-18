"use client"

import { useState } from "react"
import { PANEL_ROW, PanelHeading, PanelList, PanelRowEnd, PanelRowText } from "@/components/blocks/PanelParts"
import { JobPill } from "@/components/blocks/JobPill"
import { SidePanel } from "@/components/blocks/SidePanel"
import { Button } from "@/components/ui/button"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { visitJob } from "@/lib/admin/jobs"
import type { AdminData, Visit } from "@/lib/admin/types"
import type { JobActions } from "./job-actions-types"
import { footerPlan } from "./job-footer-model"
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
      <PanelHeading id="job-property">Property</PanelHeading>
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
      <PanelHeading id="job-visits">Visits</PanelHeading>
      {visits.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No visits yet.</p>
      ) : (
        <PanelList>
          {visits.map((v) => {
            const d = dayOfVisit(v)
            const detail = [d ? dayLabel(d) : "", v.personName].filter(Boolean).join(", ")
            return (
              <li key={v.id}>
                <OpenVisit id={v.id} className={PANEL_ROW}>
                  <PanelRowText title={kindLabel(v)} detail={detail || undefined} />
                  <PanelRowEnd>
                    <JobPill job={visitJob(v, day, TIME_ZONE, facts.pass?.cardFailedAt)} />
                  </PanelRowEnd>
                </OpenVisit>
              </li>
            )
          })}
        </PanelList>
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
  const [collecting, setCollecting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancellingJob, setCancellingJob] = useState(false)
  // Add a line is the primary of a job waiting on a quote, so the Lines section's own form is opened from the footer.
  const [addingLine, setAddingLine] = useState(false)
  if (!facts) return null
  const { job, row, pass, bill } = facts
  const say = (call: () => Promise<{ ok: boolean }>, said?: string) => run(call as never, undefined, said ?? "")
  const canAct = !readOnly
  const passOpen = canAct && pass?.status === "active"
  const plan = footerPlan(facts, canAct)
  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={row.name}
      description={facts.heading}
      footer={
        <JobFooter
          facts={facts}
          plan={plan}
          canAct={canAct}
          passOpen={passOpen}
          pass={pass}
          pending={pending}
          onCollect={() => setCollecting(true)}
          onAddVisit={() => setAdding(true)}
          onAddLine={() => setAddingLine(true)}
          onSendCardUpdateLink={() => (actions?.pass ? say(() => actions.pass!.sendCardUpdateLink(pass!.id), "Card update link sent.") : console.info("send card update link", [pass!.number]))}
          onResendConfirmation={() => (actions?.pass ? say(() => actions.pass!.resendConfirmation(pass!.id), "Confirmation sent.") : console.info("resend confirmation", [pass!.number]))}
          onCancelPass={() => setCancelling(true)}
          onCancelJob={() => setCancellingJob(true)}
        />
      }
    >
      <div className="flex flex-col gap-6" data-slot="job-panel">
        <p role="status" className="text-sm text-muted-foreground empty:hidden">
          {done}
        </p>
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {error}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StagePill stage={row.stage} />
          <MoneyPill money={row.money} />
        </div>
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
            <JobLinesSection jobId={job.id} lines={facts.lines} total={row.total} tax={facts.tax} data={data} editable={canAct && facts.canEditLines} actions={actions} adding={addingLine} onAddingChange={setAddingLine} addInFooter={plan.primary === "add-line"} />
            <Visits visits={facts.visits} facts={facts} today={today} />
          </>
        )}
        <JobMoneySection row={row} payments={facts.payments} bill={bill} actions={canAct ? visitActions : undefined} />
        {/* Notes are in the Notes and history block; the plain row stays for a job whose story is missing (the catalog's fixtures), so a note typed at the sale never disappears. */}
        {job.notes && !job.timeline && (
          <section aria-labelledby="job-notes" data-slot="job-notes">
            <PanelHeading id="job-notes">Notes</PanelHeading>
            <p className="mt-2 whitespace-pre-line text-sm">{job.notes}</p>
          </section>
        )}
        <PanelNotes about="job" aboutId={job.id} timeline={job.timeline} addNote={actions?.addNote} />
      </div>
      {canAct && (facts.canRecord || bill.canSend) && <JobCollectDialog facts={facts} {...jobCollect(facts, data)} open={collecting} onOpenChange={setCollecting} actions={actions} visitActions={visitActions} />}
      {canAct && facts.canCancel && <CancelJobDialog jobId={job.id} held={facts.held} open={cancellingJob} onOpenChange={setCancellingJob} onCancel={actions?.cancelJob} />}
      {canAct && facts.canAddVisit && <NewVisitDialog jobId={job.id} data={data} today={today} open={adding} onOpenChange={setAdding} actions={actions} />}
    </SidePanel>
  )
}
