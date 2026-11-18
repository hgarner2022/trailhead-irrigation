import { PanelFacts, PanelHeading, PanelList } from "@/components/blocks/PanelParts"
import { statusLabel } from "@/components/blocks/StatusPill"
import Link from "next/link"
import type { ReactNode } from "react"
import { jobIdOfPass, jobUrl } from "@/lib/admin/links"
import { MessageThread } from "@/components/blocks/MessageThread"
import { CustomerJobsSection } from "./CustomerJobs"
import { jobRows } from "./jobs-model"
import { PassSeasonView } from "./PassPanel"
import { TextForm } from "./VisitEditText"
import { CustomerBills } from "./VisitBill"
import type { VisitActions } from "./visit-actions-types"
import type { AdminData, Client, ClientCard, Pass } from "@/lib/admin/types"
import { formatPhone } from "@/lib/format/contact"
import { PropertyBlock } from "./PropertyFields"
import { PanelNotes } from "./PanelNotes"
import { CustomerCardLine } from "./CustomerCardLine"
import { MARKETING_WORDS, SCHEDULED_WORDS, cardOf, consentEntries, propertiesOf, type CustomerRow } from "./customers-model"

// The body of the Customers side panel: the same normal data as the row,
// the Season Pass (the season view, earlier seasons folded below it), the property (the yard: zones, controller, gate code, access note, contact), the jobs (each opening to its visits), the consent history (append-only, newest
// first) and every message the app sent. Pure render; CustomersScreen owns
// which customer is open and the buttons.

function Facts({ row, card, jobId, readOnly, actions }: { row: CustomerRow; card: ClientCard | undefined; jobId: string | undefined; readOnly: boolean; actions?: VisitActions }) {
  const facts: [string, ReactNode][] = [
    ...(row.address ? ([["Address", `${row.address}, ${row.town}`]] as [string, ReactNode][]) : ([["Town", row.town]] as [string, ReactNode][])),
    ...(row.email ? ([["Email", row.email]] as [string, ReactNode][]) : []),
    ...(row.phone ? ([["Phone", formatPhone(row.phone)]] as [string, ReactNode][]) : []),
    // One row: the job the customer's pass is, with its season and state in words, linking to that job on Jobs.
    ["Job", row.pass === "none" ? "None" : (() => {
      const text = `Season Pass ${row.passNumber} · ${row.season} · ${statusLabel(row.pass)}`
      return jobId ? <Link key="job" href={jobUrl(jobId)} className="text-primary-dark underline underline-offset-2">{text}</Link> : <span key="job">{text}</span>
    })()],
    ["Next", row.next],
    ["Scheduled", SCHEDULED_WORDS[row.nextState]],
    ["Marketing", MARKETING_WORDS[row.marketing]],
    ["Card", <CustomerCardLine key="card" card={card} passId={row.passId} readOnly={readOnly} actions={actions} />],
  ]
  return <PanelFacts rows={facts} className="mt-0" />
}

/** The customer's pass seasons, newest first: the latest as the Season Pass, each earlier one folded under its year. */
function PassSeasons({ passes, today }: { passes: Pass[]; today: string }) {
  const [current, ...earlier] = passes
  if (!current) return null
  return (
    <section aria-labelledby="customer-pass-current" data-slot="customer-pass">
      <PanelHeading id="customer-pass-current">Season Pass</PanelHeading>
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
    <PanelList data-slot="consent-history">
      {entries.map((e, i) => (
        <li key={i} className="py-1.5">
          <span className="block font-medium">{`${e.day}, ${e.source}`}</span>
          <span className="block text-muted-foreground">{e.line}</span>
        </li>
      ))}
    </PanelList>
  )
}

export function CustomerPanelBody({ row, client, data, today, readOnly = false, actions }: { row: CustomerRow; client: Client | undefined; data: AdminData; today: string; readOnly?: boolean; actions?: VisitActions }) {
  // The first property is the one shown; a customer with a second one is a later step.
  const property = client ? propertiesOf(client, data.passes)[0] : undefined
  const card = client ? cardOf(client, data.passes) : undefined
  // Every pass this customer has paid for, newest season first; an unpaid attempt is not a pass yet.
  const passes = data.passes.filter((p) => p.clientId === row.id && p.status !== "pending").sort((a, b) => b.season - a.season)
  return (
    <>
      <Facts row={row} card={card} jobId={row.passId ? jobIdOfPass(data, row.passId) : undefined} readOnly={readOnly} actions={actions} />
      <PassSeasons passes={passes} today={today} />
      {property && <PropertyBlock key={property.id} propertyId={property.id} yard={property} readOnly={readOnly} actions={actions} />}
      <PanelNotes about="customer" aboutId={row.id} timeline={client?.timeline} addNote={actions?.addNote} />
      <CustomerJobsSection rows={jobRows(data, today).filter((j) => j.customerId === row.id)} data={data} today={today} />
      {!readOnly && <CustomerBills jobs={(data.jobs ?? []).filter((j) => j.customerId === row.id)} data={data} actions={actions} />}
      {!readOnly && client?.app && <TextForm client={client} actions={actions} />}
      <section aria-labelledby="customer-consent">
        <PanelHeading id="customer-consent">Consent history</PanelHeading>
        <ConsentHistory client={client} />
      </section>
      <section aria-labelledby="customer-messages">
        <PanelHeading id="customer-messages">Messages</PanelHeading>
        <MessageThread messages={data.messages.filter((m) => m.clientId === row.id)} newestFirst className="mt-3" />
      </section>
    </>
  )
}
