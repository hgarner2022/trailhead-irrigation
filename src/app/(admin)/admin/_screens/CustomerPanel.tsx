import type { ReactNode } from "react"
import { JobPill } from "@/components/blocks/JobPill"
import { MessageThread } from "@/components/blocks/MessageThread"
import { OpenVisit } from "./VisitPanelHost"
import { TextForm } from "./VisitEditText"
import { CustomerBills } from "./VisitBill"
import type { VisitActions } from "./visit-actions-types"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { AdminData, Client, ClientCard, Visit } from "@/lib/admin/types"
import { KIND_WORDS, TIME_ZONE, shortDate } from "@/lib/admin/format"
import { visitJob } from "@/lib/admin/jobs"
import { formatPhone } from "@/lib/format/contact"
import { PropertyBlock } from "./PropertyFields"
import { CustomerCardLine } from "./CustomerCardLine"
import { MARKETING_WORDS, SCHEDULED_WORDS, cardOf, consentEntries, propertiesOf, type CustomerRow } from "./customers-model"

// The body of the Customers side panel: the same normal data as the row,
// plus the property (the yard: zones, controller, gate code, access note, contact), the jobs, the consent history (append-only, newest
// first) and every message the app sent. Pure render; CustomersScreen owns
// which customer is open and the buttons.

const RECENT = 5
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Subtitle({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="font-display text-lg leading-tight text-navy">
      {children}
    </h3>
  )
}

function Facts({ row, card, readOnly, actions }: { row: CustomerRow; card: ClientCard | undefined; readOnly: boolean; actions?: VisitActions }) {
  const facts: [string, ReactNode][] = [
    ...(row.address ? ([["Address", `${row.address}, ${row.town}`]] as [string, ReactNode][]) : ([["Town", row.town]] as [string, ReactNode][])),
    ...(row.email ? ([["Email", row.email]] as [string, ReactNode][]) : []),
    ...(row.phone ? ([["Phone", formatPhone(row.phone)]] as [string, ReactNode][]) : []),
    ["Pass", row.pass === "none" ? "None" : <span key="pass" className="inline-flex items-center gap-2"><span className="tabular-nums">{row.season}</span><StatusPill status={row.pass} /></span>],
    ["Next", row.next],
    ["Scheduled", SCHEDULED_WORDS[row.nextState]],
    ["Marketing", MARKETING_WORDS[row.marketing]],
    ["Card", <CustomerCardLine key="card" card={card} passId={row.passId} readOnly={readOnly} actions={actions} />],
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

/** The customer's visits, the ones that need a day first, then newest first, the last few, each with its two pills; each opens its panel. */
function Jobs({ visits, today }: { visits: Visit[]; today: string }) {
  const recent = [...visits].sort((a, b) => (a.startAt ? 1 : 0) - (b.startAt ? 1 : 0) || (b.startAt ?? "").localeCompare(a.startAt ?? "")).slice(0, RECENT)
  if (recent.length === 0) return <p className="mt-2 text-sm text-muted-foreground">No visits on record.</p>
  return (
    <ul className="mt-2 divide-y divide-border text-sm">
      {recent.map((v) => (
        <li key={v.id}>
          <OpenVisit id={v.id} className="gap-4 py-1.5">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{capital(KIND_WORDS[v.kind])}</span>
              <span className="block text-muted-foreground">{v.startAt ? shortDate(v.startAt, TIME_ZONE) : "No day yet"}</span>
            </span>
            <JobPill job={visitJob(v, today, TIME_ZONE)} />
          </OpenVisit>
        </li>
      ))}
    </ul>
  )
}

function ConsentHistory({ client }: { client: Pick<Client, "consent" | "consentHistory"> | undefined }) {
  const entries = client ? consentEntries(client) : []
  if (entries.length === 0) return <p className="mt-2 text-sm text-muted-foreground">No consent recorded.</p>
  return (
    <ul data-slot="consent-history" className="mt-2 divide-y divide-border text-sm">
      {entries.map((e, i) => (
        <li key={i} className="py-2.5">
          <span className="block font-medium">{`${e.day}, ${e.source}`}</span>
          <span className="block text-muted-foreground">{e.line}</span>
        </li>
      ))}
    </ul>
  )
}

export function CustomerPanelBody({ row, client, data, today, readOnly = false, actions }: { row: CustomerRow; client: Client | undefined; data: AdminData; today: string; readOnly?: boolean; actions?: VisitActions }) {
  // The first property is the one shown; a customer with a second one is a later step.
  const property = client ? propertiesOf(client, data.passes)[0] : undefined
  const card = client ? cardOf(client, data.passes) : undefined
  return (
    <>
      <Facts row={row} card={card} readOnly={readOnly} actions={actions} />
      {property && <PropertyBlock key={property.id} propertyId={property.id} yard={property} readOnly={readOnly} actions={actions} />}
      <section aria-labelledby="customer-jobs">
        <Subtitle id="customer-jobs">Visits</Subtitle>
        <Jobs visits={data.visits.filter((v) => v.clientId === row.id)} today={today} />
      </section>
      {!readOnly && <CustomerBills jobs={(data.jobs ?? []).filter((j) => j.customerId === row.id)} data={data} actions={actions} />}
      {!readOnly && client?.app && <TextForm client={client} actions={actions} />}
      <section aria-labelledby="customer-consent">
        <Subtitle id="customer-consent">Consent history</Subtitle>
        <ConsentHistory client={client} />
      </section>
      <section aria-labelledby="customer-messages">
        <Subtitle id="customer-messages">Messages</Subtitle>
        <MessageThread messages={data.messages.filter((m) => m.clientId === row.id)} newestFirst className="mt-3" />
      </section>
    </>
  )
}
