"use client"

import Link from "next/link"
import { useState } from "react"
import { PANEL_ROW, PanelHeading, PanelList, PanelRowEnd, PanelRowText } from "@/components/blocks/PanelParts"
import { JobPill } from "@/components/blocks/JobPill"
import { SidePanel } from "@/components/blocks/SidePanel"
import { Button } from "@/components/ui/button"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { customerUrl } from "@/lib/admin/links"
import { visitJob } from "@/lib/admin/jobs"
import type { AdminData, Visit } from "@/lib/admin/types"
import type { JobActions } from "./job-actions-types"
import { jobFacts, type JobFacts } from "./job-panel-model"
import { NewVisitDialog, RecordPaymentDialog } from "./JobDialogs"
import { JobLinesSection } from "./JobLinesSection"
import { JobMoneySection } from "./JobMoneySection"
import { MoneyPill, StagePill } from "./JobPills"
import { CancelDialog, PassChange, PassSeasonView } from "./PassPanel"
import { propertyLines } from "./customers-model"
import { useRunner } from "./use-runner"
import type { VisitActions } from "./visit-actions-types"
import { OpenVisit } from "./VisitPanelHost"
import { dayLabel, dayOfVisit, kindLabel } from "./visit-panel-model"

// The job panel, through the one SidePanel (docs/DESIGN.md, Uniformity): the customer's name and what the job is in the header, the
// stage and money pills, then Property, Lines, Visits, Money and Notes (a Season Pass shows its season in place of Lines and
// Visits, with its own buttons), and the footer's actions. A tech sees all of it and no buttons. Notes and history waits for the
// `events.*` handlers, which are not in the API yet.

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
  /** Send a bill and Remind, the same ones the visit panel uses */
  visitActions?: VisitActions
}

export function JobPanel({ data, today, jobId, open, onOpenChange, readOnly = false, actions, visitActions }: JobPanelProps) {
  const facts = jobId ? jobFacts(data, jobId, today) : undefined
  const { pending, error, done, run } = useRunner()
  const [recording, setRecording] = useState(false)
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  if (!facts) return null
  const { job, row, pass, bill } = facts
  const say = (call: () => Promise<{ ok: boolean }>, said?: string) => run(call as never, undefined, said ?? "")
  const sendBill = () => (visitActions ? run(() => visitActions.sendBill(job.id), undefined, "Bill sent.") : console.info("send a bill", job.id))
  const canAct = !readOnly
  const passOpen = canAct && pass?.status === "active"
  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={row.name}
      description={facts.heading}
      footer={
        <>
          {canAct && bill.canSend && (
            <Button type="button" className="min-h-11" disabled={pending} onClick={sendBill}>
              Send a bill
            </Button>
          )}
          {canAct && facts.canRecord && (
            <Button type="button" variant={bill.canSend ? "outline" : "default"} className="min-h-11" onClick={() => setRecording(true)}>
              Record the payment
            </Button>
          )}
          {canAct && facts.canAddVisit && (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setAdding(true)}>
              New visit
            </Button>
          )}
          {passOpen && pass?.cardLast4 && (
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => (actions?.pass ? say(() => actions.pass!.sendCardUpdateLink(pass.id), "Card update link sent.") : console.info("send card update link", [pass.number]))}>
              Send card update link
            </Button>
          )}
          {passOpen && pass && (
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => (actions?.pass ? say(() => actions.pass!.resendConfirmation(pass.id), "Confirmation sent.") : console.info("resend confirmation", [pass.number]))}>
              Resend confirmation
            </Button>
          )}
          <Button variant="outline" className="min-h-11" asChild>
            <Link href={customerUrl(row.customerId)}>Open customer</Link>
          </Button>
          {passOpen && pass && (
            <Button type="button" variant="ghost" className="ml-auto min-h-11 text-destructive hover:text-destructive" onClick={() => setCancelling(true)}>
              Cancel pass
            </Button>
          )}
        </>
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
            <JobLinesSection jobId={job.id} lines={facts.lines} total={row.total} data={data} editable={canAct && facts.canEditLines} actions={actions} />
            <Visits visits={facts.visits} facts={facts} today={today} />
          </>
        )}
        <JobMoneySection row={row} payments={facts.payments} bill={bill} actions={canAct ? visitActions : undefined} />
        {job.notes && (
          <section aria-labelledby="job-notes" data-slot="job-notes">
            <PanelHeading id="job-notes">Notes</PanelHeading>
            <p className="mt-2 whitespace-pre-line text-sm">{job.notes}</p>
          </section>
        )}
      </div>
      {canAct && facts.canRecord && <RecordPaymentDialog jobId={job.id} owed={row.owed} open={recording} onOpenChange={setRecording} actions={actions} />}
      {canAct && facts.canAddVisit && <NewVisitDialog jobId={job.id} data={data} today={today} open={adding} onOpenChange={setAdding} actions={actions} />}
    </SidePanel>
  )
}
