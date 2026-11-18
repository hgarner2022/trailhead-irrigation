"use client"

import Link from "next/link"
import { useState } from "react"
import { CollectPayment } from "@/components/blocks/CollectPayment"
import { MessageThread } from "@/components/blocks/MessageThread"
import { RECORD_ROW, RecordFacts, RecordList, RecordPanel, RecordRowEnd, RecordRowText, type RecordFact } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPills } from "@/components/blocks/StatusPill"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { visitJob } from "@/lib/admin/jobs"
import { customerUrl, jobUrl } from "@/lib/admin/links"
import { routePeople } from "@/lib/admin/people"
import type { AdminData } from "@/lib/admin/types"
import { formatPhone } from "@/lib/format/contact"
import { dollars, type CollectPlan } from "@/lib/money/collect"
import { propertyLines, yardFromPass } from "./customers-model"
import { PanelNotes } from "./PanelNotes"
import { BillBlock } from "./VisitBill"
import { VisitFooter } from "./VisitFooter"
import { Included, JobLines } from "./VisitLines"
import type { VisitActions } from "./visit-actions-types"
import { visitBar } from "./visit-bar-model"
import { visitFooter } from "./visit-collect-model"
import { dayLabel, dayOfVisit, kindLabel, priceWords, timeWords, visitFacts, type VisitFacts } from "./visit-panel-model"

// The visit panel, a `RecordPanel` (docs/plans/2026-11-18-admin-holistic-design.md, section 7): from Visits, Home, Schedule, the pass panel and
// the customer panel. The header names the customer and what the visit is, with its two pills under the subtitle; the facts are When, Who,
// Minutes, Price, Job (a link up) and the phone; then At the property, What is included, Notes and history, the job, the invoice when one
// is out, and the messages. The footer is `RecordFooter` (`visitBar` says which buttons): every action is a button that acts at once or
// opens one dialog, and after Mark done the body itself turns to "How is this paid?". A tech sees all of it and the buttons their role
// allows. On a laptop it is the drawer over the page; on a phone it is a sheet.

/** The job the visit belongs to, one line: "Season Pass TH-2027-0007 · 2027" or "Repair · sold Nov 3", linking to that job on Jobs: the way up from a visit. */
function JobLine({ facts }: { facts: VisitFacts }) {
  const { pass, job, visit } = facts
  const kind = job?.kind === "repair" ? "Repair" : job?.kind === "install" ? "Installation" : "Job"
  const text = pass ? `Season Pass ${pass.number} · ${pass.season}` : `${kind}${job?.soldOn ? ` · sold ${shortDate(job.soldOn, TIME_ZONE)}` : ""}`
  return (
    <Link data-slot="visit-job-line" href={visit.jobId ? jobUrl(visit.jobId) : customerUrl(visit.clientId)} className="text-primary-dark underline underline-offset-2" title={text}>
      {text}
    </Link>
  )
}

/** The facts under the header, in order: When, Who, Minutes, Price, Job (a link up) and the customer's phone (tap to call). */
function factsOf(facts: VisitFacts): RecordFact[] {
  const { client, visit } = facts
  const day = dayOfVisit(visit)
  const when = day ? `${dayLabel(day)}, ${timeWords(visit).replace(/^Any time/, "any time")}` : "Unscheduled"
  return [
    ["When", when],
    ["Who", visit.personName ?? ""],
    ["Minutes", String(visit.minutes ?? 60)],
    ["Price", facts.priceCancelled ? "Canceled" : priceWords({ price: facts.price })],
    ["Job", <JobLine key="job" facts={facts} />],
    ...(client?.phone ? ([["Phone", <a key="p" className="text-primary-dark underline underline-offset-2" href={`tel:${client.phone}`}>{formatPhone(client.phone)}</a>]] as RecordFact[]) : []),
  ]
}

/** The yard the visit is at, as the property holds it, with the street first; the gate code and on-site phone only for a manager. */
function AtTheProperty({ facts, readOnly }: { facts: VisitFacts; readOnly: boolean }) {
  const { client, visit } = facts
  // Only the fixtures (a client with no property rows) fall back to the pass; live data never does.
  const yard = visit.property ?? (client?.properties ? undefined : yardFromPass(facts.pass))
  const lines = yard ? propertyLines(yard, { canSeeContact: !readOnly }) : []
  const street = client?.address ? `${client.address}, ${visit.town}` : visit.town
  return (
    <section aria-labelledby="visit-property" data-slot="visit-property">
      <SectionHeading id="visit-property">At the property</SectionHeading>
      <ul className="mt-2 space-y-1 text-sm">
        <li className="font-medium">{street}</li>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {!readOnly && client?.email && <p className="mt-2 text-sm text-muted-foreground">{client.email}</p>}
    </section>
  )
}

/** The job the visit belongs to: what it is and its money, the lines, and the job's other visits (each opens its own panel). */
function JobBlock({ facts, today, onOpenVisit }: { facts: VisitFacts; today: string; onOpenVisit: (id: string) => void }) {
  const { pass, job, siblings, visit } = facts
  const day = dayOf(today, TIME_ZONE)
  const title = pass ? `Season Pass ${pass.number}` : job ? `${job.kind === "repair" || job.kind === "install" ? kindLabel({ kind: job.kind }) : "Booked work"}, ${job.source === "site" ? "from the site" : "taken by the office"}` : "One-off visit"
  return (
    <section aria-labelledby="visit-job" data-slot="visit-job">
      <SectionHeading id="visit-job">Job</SectionHeading>
      <p className="mt-2 text-sm">
        <span className="font-medium">{title}</span>
        {facts.money && <span className="text-muted-foreground">{`. ${facts.money}.`}</span>}
      </p>
      {job?.lines?.length ? <JobLines lines={job.lines} visitId={visit.id} /> : null}
      {siblings.length > 1 && (
        <RecordList>
          {siblings.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => onOpenVisit(v.id)} aria-current={v.id === visit.id ? "true" : undefined} className={`flex min-h-11 w-full items-center text-left ${RECORD_ROW}`}>
                <RecordRowText title={kindLabel(v)} detail={dayOfVisit(v) ? dayLabel(dayOfVisit(v)!) : undefined} strong={v.id === visit.id} />
                <RecordRowEnd>
                  <StatusPills job={visitJob(v, day, TIME_ZONE, pass?.cardFailedAt)} />
                </RecordRowEnd>
              </button>
            </li>
          ))}
        </RecordList>
      )}
    </section>
  )
}

export interface VisitPanelProps {
  data: AdminData
  today: string
  visitId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenVisit: (id: string) => void
  readOnly?: boolean
  /** a tech who may Mark done and take the money, though the rest of the panel is read-only */
  canCollect?: boolean
  actions?: VisitActions
}

export function VisitPanel({ data, today, visitId, open, onOpenChange, onOpenVisit, readOnly = false, canCollect = false, actions }: VisitPanelProps) {
  // Beat two ("How is this paid?") keeps the plan it opened with, as state: once the money has arrived the page refreshes and the visit has
  // no plan any more, but the body stays to say what happened until it is closed, and closing it is what keeps it shut. After Mark done the
  // plan arrives with the refresh, so `wantCollect` waits for it once.
  const [collectPlan, setCollectPlan] = useState<CollectPlan | null>(null)
  const [settled, setSettled] = useState(false)
  const [wantCollect, setWantCollect] = useState(false)
  const [shownFor, setShownFor] = useState({ visitId, open })
  // Closing the panel or opening another visit starts over: beat two never comes back by itself.
  if (shownFor.visitId !== visitId || shownFor.open !== open) {
    setShownFor({ visitId, open })
    if (collectPlan) setCollectPlan(null)
    if (wantCollect) setWantCollect(false)
  }
  const facts = visitId ? visitFacts(data, visitId, today) : undefined
  const access = !readOnly ? "all" : canCollect ? "collect" : "none"
  const plan = facts ? visitFooter(facts, access, data.settings.billing?.dueDays) : undefined
  if (wantCollect && plan?.plan) {
    setCollectPlan(plan.plan)
    setSettled(false)
    setWantCollect(false)
  }
  if (!facts || !plan) return null
  const { visit, states, client, pass } = facts
  const day = dayOf(today, TIME_ZONE)
  const visitDay = dayOfVisit(visit)
  const bar = visitBar(facts, plan, access, day)
  const hasFooter = Boolean(collectPlan || bar.primary || bar.secondary.length || bar.more.length || bar.destructive)
  const first = visit.clientName.split(" ")[0] ?? visit.clientName
  const startCollect = () => {
    setSettled(false)
    setCollectPlan(plan.plan ?? null)
  }
  const log = (what: string) => async () => (console.info(what, visit.id), { ok: true as const })
  const notes = [facts.customerChange, states.dayPassed && visitDay ? `The day passed on ${dayLabel(visitDay)}. Mark it done or move it.` : ""].filter(Boolean)
  return (
    <RecordPanel
      open={open}
      onOpenChange={onOpenChange}
      title={visit.clientName}
      // The pills carry the state, so the line says only what the visit is and, once it has one, its day.
      subtitle={`${kindLabel(visit)}${visitDay ? `, ${dayLabel(visitDay)}` : ""}`}
      pills={<StatusPills job={states} />}
      facts={collectPlan ? undefined : factsOf(facts)}
      slot="visit-panel"
      notice={
        !collectPlan && notes.length > 0 ? (
          <p data-slot="customer-change" className="text-sm text-muted-foreground">
            {notes.join(" ")}
          </p>
        ) : undefined
      }
      footer={
        hasFooter ? (
          <VisitFooter
            key={visit.id}
            facts={facts}
            people={routePeople(data.settings.people)}
            plan={plan}
            bar={bar}
            today={day}
            visitDay={visitDay}
            pass={pass}
            actions={actions}
            collecting={Boolean(collectPlan)}
            settled={settled}
            onCollect={startCollect}
            onMarkedDone={() => setWantCollect(true)}
            onLeaveCollect={() => setCollectPlan(null)}
          />
        ) : undefined
      }
    >
      {collectPlan ? (
        <div data-slot="collect-dialog">
          <SectionHeading id="visit-collect">How is this paid?</SectionHeading>
          <CollectPayment
            className="mt-3"
            plan={collectPlan}
            summary={`${kindLabel(visit)}${plan.unpaid > 0 ? ` · ${dollars(plan.unpaid)} unpaid` : ""}`}
            firstName={first}
            onCharge={actions ? () => actions.chargeCard(visit.id) : log("charge")}
            onRecord={actions ? (input) => actions.recordPayment(visit.id, input) : log("record")}
            onInvoice={actions && visit.jobId ? () => actions.sendBill(visit.jobId!) : log("invoice")}
            onLater={() => setCollectPlan(null)}
            onClose={() => setCollectPlan(null)}
            onSettled={() => setSettled(true)}
          />
        </div>
      ) : (
        <>
          <AtTheProperty facts={facts} readOnly={readOnly} />
          {facts.line?.description ? <Included text={facts.line.description} /> : null}
          <PanelNotes about="visit" aboutId={visit.id} timeline={visit.timeline} addNote={actions?.addNote} />
          {/* The plain row stays for a visit whose story is missing (the catalog's fixtures) or empty, so a note a person typed never disappears. */}
          {visit.notes && !visit.timeline?.length ? <RecordFacts rows={[["Notes", visit.notes]]} /> : null}
          <JobBlock facts={facts} today={today} onOpenVisit={onOpenVisit} />
          {!readOnly && facts.bill.invoice && <BillBlock state={facts.bill} jobId={visit.jobId ?? ""} headingId="visit-bill" actions={actions} />}
          <section aria-labelledby="visit-thread">
            <SectionHeading id="visit-thread">Messages</SectionHeading>
            <MessageThread messages={facts.messages} newestFirst className="mt-3" />
          </section>
        </>
      )}
    </RecordPanel>
  )
}
