"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { JobPill } from "@/components/blocks/JobPill"
import { MessageThread } from "@/components/blocks/MessageThread"
import { SidePanel } from "@/components/blocks/SidePanel"
import { Button } from "@/components/ui/button"
import { visitJob } from "@/lib/admin/jobs"
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { formatPhone } from "@/lib/format/contact"
import type { AdminData } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { CancelVisit, EditForm, ResendButton, TextForm } from "./VisitEditText"
import { DoneForm, MoveForm, NotDoneForm, PaidByChoice, doneAsksPaidBy } from "./VisitMoveDone"
import { BillBlock } from "./VisitBill"
import { Included, JobLines } from "./VisitLines"
import { useRunner } from "./use-runner"
import { dayLabel, dayOfVisit, kindLabel, priceWords, timeWords, visitFacts, type VisitFacts } from "./visit-panel-model"
import { routePeople } from "@/lib/admin/people"
import { propertyLines, yardFromPass } from "./customers-model"

// The visit panel (Build 1): from Visits, Home, Schedule, the pass panel and the customer panel. Header with the
// customer and the visit's kind and day; the two pills; the customer block; the visit block; the job it belongs to
// (the pass with its number and its other visits, or the booked work); the actions; and the thread, newest first.
// A tech sees all of it and no buttons. On a laptop it is the drawer over the page; on a phone it is a sheet.

function Subtitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="font-display text-lg leading-tight text-navy">
      {children}
    </h3>
  )
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function CustomerBlock({ facts }: { facts: VisitFacts }) {
  const { client, visit } = facts
  const rows: [string, ReactNode][] = [
    ["Address", client?.address ? `${client.address}, ${visit.town}` : visit.town],
    ...(client?.phone ? ([["Phone", <a key="p" className="text-primary-dark underline underline-offset-2" href={`tel:${client.phone}`}>{formatPhone(client.phone)}</a>]] as [string, ReactNode][]) : []),
    ...(client?.email ? ([["Email", client.email]] as [string, ReactNode][]) : []),
  ]
  return (
    <section aria-labelledby="visit-customer">
      <Subtitle id="visit-customer">Customer</Subtitle>
      <Facts rows={rows} />
    </section>
  )
}

/** The yard the visit is at, as the property holds it; the gate code and on-site phone only for a manager. Nothing for a visit with no property. */
function AtTheProperty({ facts, readOnly }: { facts: VisitFacts; readOnly: boolean }) {
  // Only the fixtures (a client with no property rows) fall back to the pass; live data never does.
  const yard = facts.visit.property ?? (facts.client?.properties ? undefined : yardFromPass(facts.pass))
  if (!yard) return null
  const lines = propertyLines(yard, { canSeeContact: !readOnly })
  return (
    <section aria-labelledby="visit-property" data-slot="visit-property">
      <Subtitle id="visit-property">At the property</Subtitle>
      {lines.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nothing on file yet</p>
      )}
    </section>
  )
}

function VisitBlock({ facts }: { facts: VisitFacts }) {
  const { visit } = facts
  const day = dayOfVisit(visit)
  return (
    <section aria-labelledby="visit-facts">
      <Subtitle id="visit-facts">Visit</Subtitle>
      <Facts
        rows={[
          ["Day", day ? dayLabel(day) : "No day yet"],
          ["Time", timeWords(visit)],
          ["Who", visit.personName ?? ""],
          ["Minutes", String(visit.minutes ?? 60)],
          ["Price", facts.priceCancelled ? "Cancelled" : priceWords({ price: facts.price })],
          ...(visit.notes ? ([["Notes", visit.notes]] as [string, ReactNode][]) : []),
        ]}
      />
      <p className="mt-2 text-sm text-muted-foreground empty:hidden">{facts.states.dayPassed ? `The day passed on ${dayLabel(day!)}. Mark it done or move it.` : ""}</p>
    </section>
  )
}

function JobBlock({ facts, today, onOpenVisit }: { facts: VisitFacts; today: string; onOpenVisit: (id: string) => void }) {
  const { pass, job, siblings, visit } = facts
  const day = dayOf(today, TIME_ZONE)
  const title = pass ? `Season Pass ${pass.number}` : job ? `${job.kind === "repair" || job.kind === "install" ? kindLabel({ kind: job.kind }) : "Booked work"}, ${job.source === "site" ? "from the site" : "taken by the office"}` : "One-off visit"
  return (
    <section aria-labelledby="visit-job" data-slot="visit-job">
      <Subtitle id="visit-job">Job</Subtitle>
      <p className="mt-2 text-sm">
        <span className="font-medium">{title}</span>
        {facts.money && <span className="text-muted-foreground">{`. ${facts.money}.`}</span>}
        {pass && (
          <>
            {" "}
            <Link href={`/admin/passes?pass=${encodeURIComponent(pass.id)}`} className="text-primary-dark underline underline-offset-2">
              Open pass
            </Link>
          </>
        )}
      </p>
      {job?.lines?.length ? <JobLines lines={job.lines} visitId={visit.id} /> : null}
      {siblings.length > 1 && (
        <ul className="mt-2 divide-y divide-border text-sm">
          {siblings.map((v) => (
            <li key={v.id} className="flex items-center gap-3 py-1">
              <button type="button" onClick={() => onOpenVisit(v.id)} aria-current={v.id === visit.id ? "true" : undefined} className="min-h-11 min-w-0 flex-1 text-left">
                <span className={v.id === visit.id ? "block font-semibold" : "block font-medium text-primary-dark"}>{kindLabel(v)}</span>
                <span className="block text-muted-foreground">{dayOfVisit(v) ? dayLabel(dayOfVisit(v)!) : "No day yet"}</span>
              </button>
              <JobPill job={visitJob(v, day, TIME_ZONE, pass?.cardFailedAt)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Actions({ facts, data, today, actions }: { facts: VisitFacts; data: AdminData; today: string; actions?: VisitActions }) {
  const { visit, pass, states, client } = facts
  const day = dayOf(today, TIME_ZONE)
  const open = states.work === "needs-a-day" || states.work === "not-done" || states.work === "scheduled"
  // Money owed is recorded here for a one-off and for a pass visit whose pass has no card; a pass with a card is charged.
  const owed = states.work === "done" && states.money === "owed" && doneAsksPaidBy(visit, pass)
  const pay = useRunner()
  return (
    <div className="flex flex-col gap-6" data-slot="visit-actions">
      {open && <MoveForm key={visit.id + (visit.scheduledOn ?? "")} visit={visit} today={day} actions={actions} />}
      {states.work === "scheduled" && <DoneForm visit={visit} pass={pass} today={day} actions={actions} />}
      {owed && (
        <section aria-labelledby="visit-pay">
          <Subtitle id="visit-pay">Record the payment</Subtitle>
          <PaidByChoice
            visit={visit}
            pending={pay.pending}
            label="Record payment"
            onChoose={(paid) => {
              const { method } = paid
              if (method === "bill") return
              if (actions) pay.run(() => actions.recordPayment(visit.id, { ...paid, method }), undefined, "Payment recorded.")
              else console.info("record payment", visit.id, paid)
            }}
          />
          <p role="alert" className={`mt-1 text-sm empty:hidden ${pay.error ? "text-destructive" : "text-muted-foreground"}`}>
            {pay.error || pay.done}
          </p>
        </section>
      )}
      <BillBlock state={facts.bill} jobId={visit.jobId ?? ""} headingId="visit-bill" actions={actions} />
      {states.work === "scheduled" && <NotDoneForm visit={visit} actions={actions} />}
      {open && <EditForm key={`edit-${visit.id}`} visit={visit} people={routePeople(data.settings.people)} actions={actions} />}
      <TextForm client={client} visitId={visit.id} actions={actions} />
      <div className="flex flex-wrap items-start gap-3">
        {pass && pass.status === "active" && <ResendButton passId={pass.id} actions={actions} />}
        {open && <CancelVisit visit={visit} pass={pass} actions={actions} />}
      </div>
    </div>
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
  actions?: VisitActions
}

export function VisitPanel({ data, today, visitId, open, onOpenChange, onOpenVisit, readOnly = false, actions }: VisitPanelProps) {
  const facts = visitId ? visitFacts(data, visitId, today) : undefined
  if (!facts) return null
  const { visit, states } = facts
  const day = dayOfVisit(visit)
  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={visit.clientName}
      description={`${kindLabel(visit)}${day ? `, ${dayLabel(day)}` : ", no day yet"}`}
      className="z-50"
    >
      <div className="flex flex-col gap-6" data-slot="visit-panel">
        <div className="flex flex-wrap items-center gap-2">
          <JobPill job={states} />
        </div>
        <CustomerBlock facts={facts} />
        <AtTheProperty facts={facts} readOnly={readOnly} />
        <VisitBlock facts={facts} />
        {facts.line?.description ? <Included text={facts.line.description} /> : null}
        <JobBlock facts={facts} today={today} onOpenVisit={onOpenVisit} />
        {!readOnly && <Actions facts={facts} data={data} today={today} actions={actions} />}
        <section aria-labelledby="visit-thread">
          <Subtitle id="visit-thread">Messages</Subtitle>
          <MessageThread messages={facts.messages} newestFirst className="mt-3" />
        </section>
        <Button variant="ghost" className="min-h-11 self-start" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </SidePanel>
  )
}
