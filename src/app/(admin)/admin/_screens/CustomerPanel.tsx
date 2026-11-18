import { RecordList, RecordPanel, type RecordFact } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPill, statusLabel } from "@/components/blocks/StatusPill"
import Link from "next/link"
import { jobIdOfPass, jobUrl } from "@/lib/admin/links"
import { MessageThread } from "@/components/blocks/MessageThread"
import { CustomerJobsSection } from "./CustomerJobs"
import { jobRows } from "./jobs-model"
import { PassSeasonView } from "./PassPanel"
import { CustomerFooter } from "./CustomerFooter"
import { CustomerBills } from "./VisitBill"
import type { VisitActions } from "./visit-actions-types"
import type { AdminData, Client, ClientCard, Pass } from "@/lib/admin/types"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { formatPhone } from "@/lib/format/contact"
import { PropertyBlock } from "./PropertyFields"
import { PanelNotes } from "./PanelNotes"
import { CustomerCardLine } from "./CustomerCardLine"
import { MARKETING_WORDS, SCHEDULED_WORDS, cardOf, consentEntries, propertiesOf, type CustomerRow } from "./customers-model"

// The Customers side panel, a `RecordPanel`: the same normal data as the row as its facts,
// the Season Pass (the season view, earlier seasons folded below it), the property (the yard: zones, controller, gate code, access note, contact), the jobs (each opening to its visits), the consent history (append-only, newest
// first) and every message the app sent. The footer is `CustomerFooter`: New job, Send a text, and the quiet ones under More. CustomersScreen owns
// which customer is open.

/** The Job fact: the newest open job's name ("Repair", "Season Pass TH-2027-0007 · 2027 · Active"), a link to it; None when nothing is open and no pass is on record. */
function JobFact({ row, jobId }: { row: CustomerRow; jobId: string | undefined }) {
  const pass = row.pass === "none" ? undefined : `Season Pass ${row.passNumber} · ${row.season} · ${statusLabel(row.pass)}`
  const text = row.job ? (row.job.isPass && pass ? pass : row.job.title) : (pass ?? "None")
  const id = row.job?.id ?? jobId
  return id && text !== "None" ? <Link href={jobUrl(id)} className="text-primary-dark underline underline-offset-2">{text}</Link> : <span>{text}</span>
}

/** The facts under the header, in order: Phone, Email, the open Job, Next, Scheduled, Marketing and the Card. The street is the subtitle. */
function factsOf(row: CustomerRow, card: ClientCard | undefined, jobId: string | undefined, readOnly: boolean, actions?: VisitActions): RecordFact[] {
  return [
    ...(row.phone ? ([["Phone", formatPhone(row.phone)]] as RecordFact[]) : []),
    ...(row.email ? ([["Email", row.email]] as RecordFact[]) : []),
    // One row: the newest open job, whatever it is (a repair, an installation, the pass), linking to that job on Jobs. A pass reads with its
    // season and state; with no open job the row falls back to the pass the customer has, else None.
    ["Job", <JobFact key="job" row={row} jobId={jobId} />],
    ["Next", row.next],
    ["Scheduled", SCHEDULED_WORDS[row.nextState]],
    ["Marketing", MARKETING_WORDS[row.marketing]],
    ["Card", <CustomerCardLine key="card" card={card} passId={row.passId} readOnly={readOnly} actions={actions} />],
  ]
}

/** The customer's pass seasons, newest first: the latest as the Season Pass, each earlier one folded under its year. */
function PassSeasons({ passes, today }: { passes: Pass[]; today: string }) {
  const [current, ...earlier] = passes
  if (!current) return null
  return (
    <section aria-labelledby="customer-pass-current" data-slot="customer-pass">
      <SectionHeading id="customer-pass-current">Season Pass</SectionHeading>
      <div className="mt-3">
        <PassSeasonView pass={current} today={today} idPrefix="cust-pass-current" withAccess={false} withConsent={false} />
      </div>
      {earlier.map((p) => (
        <details key={p.id} className="mt-4 border-t border-border pt-2" data-slot="customer-pass-earlier">
          <summary className="flex min-h-11 cursor-pointer items-center font-display text-lg text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">{`${p.season} season`}</summary>
          <div className="mt-2">
            <PassSeasonView pass={p} today={today} idPrefix={`cust-pass-${p.id}`} withAccess={false} withConsent={false} />
          </div>
        </details>
      ))}
    </section>
  )
}

function ConsentHistory({ client }: { client: Pick<Client, "consent" | "consentHistory"> | undefined }) {
  const entries = client ? consentEntries(client) : []
  if (entries.length === 0) return <p className="mt-2 text-sm text-muted-foreground">No consent recorded.</p>
  return (
    <RecordList data-slot="consent-history">
      {entries.map((e, i) => (
        <li key={i} className="py-1.5">
          <span className="block font-medium">{`${e.day}, ${e.source}`}</span>
          <span className="block text-muted-foreground">{e.line}</span>
        </li>
      ))}
    </RecordList>
  )
}

export interface CustomerPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: CustomerRow
  client: Client | undefined
  data: AdminData
  /** ISO datetime */
  today: string
  readOnly?: boolean
  actions?: VisitActions
  /** a line of status above the facts: "Marketing opt-out recorded." */
  notice?: string
  /** "Send pass offer" in More: the catalog's January pre-sell, which has no API yet */
  offers?: boolean
  /** "Record phone opt-out" in More, for a customer who opted in to marketing; absent when it cannot be done */
  onOptOut?: () => void
}

/** The Customers side panel, a `RecordPanel`: the street under the name, the pass pill, the facts, then the pass, Property, Notes and history, Jobs, Invoices, Consent history and Messages. */
export function CustomerPanel({ open, onOpenChange, row, client, data, today, readOnly = false, actions, notice, offers = false, onOptOut }: CustomerPanelProps) {
  const day = dayOf(today, TIME_ZONE)
  // The first property is the one shown; a customer with a second one is a later step.
  const property = client ? propertiesOf(client, data.passes)[0] : undefined
  const card = client ? cardOf(client, data.passes) : undefined
  // Every pass this customer has paid for, newest season first; an unpaid attempt is not a pass yet.
  const passes = data.passes.filter((p) => p.clientId === row.id && p.status !== "pending").sort((a, b) => b.season - a.season)
  const jobId = row.passId ? jobIdOfPass(data, row.passId) : undefined
  return (
    <RecordPanel
      open={open}
      onOpenChange={onOpenChange}
      title={row.name}
      subtitle={row.address ? `${row.address}, ${row.town}` : row.town}
      pills={row.pass !== "none" ? <StatusPill status={row.pass} /> : undefined}
      facts={factsOf(row, card, jobId, readOnly, actions)}
      slot="customer-panel"
      notice={notice ? <p role="status" className="text-sm text-muted-foreground">{notice}</p> : undefined}
      footer={<CustomerFooter row={row} client={client} data={data} today={today} readOnly={readOnly} actions={actions} jobHref={jobId ? jobUrl(jobId) : undefined} offers={offers} onOptOut={onOptOut} />}
    >
      <PassSeasons passes={passes} today={day} />
      {property && <PropertyBlock key={property.id} propertyId={property.id} yard={property} readOnly={readOnly} actions={actions} />}
      <PanelNotes about="customer" aboutId={row.id} timeline={client?.timeline} addNote={actions?.addNote} />
      <CustomerJobsSection rows={jobRows(data, day).filter((j) => j.customerId === row.id)} data={data} today={day} />
      {!readOnly && <CustomerBills jobs={(data.jobs ?? []).filter((j) => j.customerId === row.id)} data={data} actions={actions} />}
      <section aria-labelledby="customer-consent">
        <SectionHeading id="customer-consent">Consent history</SectionHeading>
        <ConsentHistory client={client} />
      </section>
      <section aria-labelledby="customer-messages">
        <SectionHeading id="customer-messages">Messages</SectionHeading>
        <MessageThread messages={data.messages.filter((m) => m.clientId === row.id)} newestFirst className="mt-3" />
      </section>
    </RecordPanel>
  )
}
