import type { ReactNode } from "react"
import { AsideCard } from "@/components/blocks/AsideCard"
import { BillingSection, type BillingRowData } from "@/components/blocks/BillingSection"
import { CollectPayment } from "@/components/blocks/CollectPayment"
import { MessageThread } from "@/components/blocks/MessageThread"
import { RecordChip } from "@/components/blocks/RecordChip"
import { dayPreview, customerPreview, personPreview, recordHref } from "@/components/blocks/record-preview-model"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { RecordFooter } from "@/components/blocks/RecordFooter"
import { RecordFacts, type RecordFact } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill, statusLabel, type PillStatus } from "@/components/blocks/StatusPill"
import type { SummaryItem } from "@/components/blocks/SummaryBand"
import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import { NOW, noop, noteOk, type FooterPlan, type JobPageData, type PillData } from "./job-fixtures"

// The cards the one-trip, Season Pass and return-trip job pages share, so a card reads the same on every job (the rules are in
// docs/plans/2026-11-19-admin-page-layout-research.md): the badges for the header, the summary band's four cells, the aside (Customer,
// Property, Notes and history), Billing with beat two inline, Messages, and the header's actions. Pure props over the design fixtures.

const MONEY: PillStatus[] = ["paid", "owed", "bill-sent", "overdue", "failed", "charge-failed"]
const ALERT: PillStatus[] = ["overdue", "failed", "charge-failed"]
const row = (rows: readonly RecordFact[], label: string) => rows.find(([k]) => k === label)?.[1] as string | undefined

export const EditLink = ({ label = "Edit" }: { label?: string }) => (
  <button type="button" onClick={noop} className="min-h-11 rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
    {label}
  </button>
)

/** The status badges beside the title, large, with a muted note after them ("day passed"). */
export function Badges({ pills, note }: { pills: PillData[]; note?: string }) {
  return (
    <>
      {pills.map((p) => <StatusPill key={p.status} status={p.status} label={p.label} size="lg" />)}
      {note && <span className="text-sm text-muted-foreground">{note}</span>}
    </>
  )
}

/** The money cell's line under the total: the job's own money word, from the billing status or the money badge. */
function moneyWord(pills: PillData[], statusText: string | undefined, canceled: boolean): { sub: string; alert: boolean } {
  const pill = pills.find((p) => MONEY.includes(p.status))
  const alert = Boolean(pill && ALERT.includes(pill.status))
  if (statusText) return { sub: statusText, alert }
  if (pill) return { sub: pill.label ?? statusLabel(pill.status), alert }
  return { sub: canceled ? "Canceled" : "Not billed yet", alert: false }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const EXACT = /^\d{1,2}:\d{2} [ap]m$/

/** "Tue, Nov 24" or "Today, Wed Nov 18" as the Schedule's day, 2026-11-24; nothing for "No day yet" or "None". */
export function isoDayOf(label: string): string | undefined {
  const m = /([A-Z][a-z]{2}) (\d{1,2})\b/.exec(label)
  const month = m ? MONTHS.indexOf(m[1]!) : -1
  return m && month >= 0 ? `2026-${String(month + 1).padStart(2, "0")}-${m[2]!.padStart(2, "0")}` : undefined
}

/**
 * The When cell: a scheduled day is a chip that opens the Schedule on that day ("Tue, Nov 24 at 9:00 am"), with the day's stops and who in its
 * card; a visit with no day reads "No day yet" as plain text (the Schedule button is its link). A window or a done time stays the muted line.
 */
function whenCell(value: string, sub: string | undefined, who: string): { value: ReactNode; sub?: string } {
  const iso = isoDayOf(value)
  if (!iso) return { value, sub }
  const exact = sub !== undefined && EXACT.test(sub)
  const name = exact ? `${value} at ${sub}` : value
  const person = who.startsWith("No one") ? "No one yet" : who
  return { value: <RecordChip kind="day" size="band" name={name} href={recordHref.day(iso)} preview={dayPreview({ isoDay: iso, label: name, stops: 3, who: person })} />, sub: exact ? undefined : sub }
}

/** The Who cell: the person is a record, "No one" is not. */
function whoChip(who: string): ReactNode {
  if (who.startsWith("No one")) return who
  return <RecordChip kind="person" size="band" name={who} href={recordHref.person()} preview={personPreview({ name: who, role: "Owner", stopsToday: 3 })} />
}

const split = (address: string | undefined): [string, string | undefined] => {
  const [street, ...rest] = (address ?? "").split(", ")
  return [street || "No address", rest.join(", ") || undefined]
}

export interface BandInput {
  when: { label: string; value: string; sub?: string }
  who: string
  address?: string
  total: string
  pills: PillData[]
  statusText?: string
  canceled: boolean
}

/** The summary band: When (or Next visit), Who, Where and Total with its money word. Four cells, always. */
export function bandItems(b: BandInput): SummaryItem[] {
  const [street, town] = split(b.address)
  const money = moneyWord(b.pills, b.statusText, b.canceled)
  const day = whenCell(b.when.value, b.when.sub, b.who)
  return [
    { label: b.when.label, value: day.value, sub: day.sub },
    { label: "Who", value: whoChip(b.who) },
    { label: "Where", value: street, sub: town },
    { label: "Total", value: b.total, sub: money.sub, tone: money.alert ? "alert" : "plain" },
  ]
}

export function bandOfJob(job: JobPageData): SummaryItem[] {
  return bandItems({
    when: { label: "When", value: row(job.when, "Day") ?? "None", sub: row(job.when, "Time") },
    who: row(job.when, "Who") ?? "No one",
    address: row(job.where, "Address"),
    total: job.billing.summary.find(([k]) => k === "Total")?.[1] ?? "$0",
    pills: job.pills,
    statusText: job.billing.status?.text,
    canceled: job.pills.some((p) => p.status === "cancelled"),
  })
}

/** The aside: the customer with phone and address, the property's facts, then Notes and history. */
export function Aside({ customer, phone, where, notes }: { customer: string; phone: { text: string; href: string }; where: readonly RecordFact[]; notes: TimelineLine[] }) {
  const [street, town] = split(row(where, "Address"))
  const facts = where.filter(([k]) => k !== "Address")
  return (
    <>
      <AsideCard name={customer} href={recordHref.customer("c-" + customer)} preview={customerPreview({ id: "c-" + customer, name: customer, phone: phone.text, address: [street, town ? `${town}, CO` : ""].filter(Boolean).join(", "), openJobs: 1, unpaid: "$0" })} phone={phone} address={[street, town ? `${town}, CO` : ""].filter(Boolean)} />
      {facts.length > 0 && (
        <SectionCard title="Property" id="property-h" action={<EditLink />}>
          <RecordFacts divided rows={facts} />
        </SectionCard>
      )}
      <SectionCard title="Notes and history" id="notes-h">
        <NotesAndHistory bare lines={notes} onAddNote={noteOk} now={NOW} />
      </SectionCard>
    </>
  )
}

export function BillingCard({ data }: { data: Pick<JobPageData, "billing" | "collect"> }) {
  const { billing, collect } = data
  const summary = billing.summary.map(([k, v]) => [k, v] as [string, string])
  const status = billing.status
  return (
    <SectionCard title="Billing" id="billing-h">
      {collect && (
        <div className="mb-4 rounded-lg bg-stone p-4">
          <CollectPayment plan={collect.plan} summary={collect.summary} firstName="Andrea" onCharge={noteOk} onRecord={noteOk} onInvoice={noteOk} onLater={noop} onClose={noop} />
        </div>
      )}
      {status && <p className="mb-2 text-sm font-medium"><MoneyCell text={status.text} tone={status.tone} /></p>}
      <BillingSection summary={summary} rows={billing.rows as BillingRowData[]} emptyLine={billing.emptyLine} />
    </SectionCard>
  )
}

export function MessagesCard({ messages }: { messages: Message[] }) {
  return (
    <SectionCard title="Messages" id="messages-h">
      <MessageThread messages={messages} newestFirst />
    </SectionCard>
  )
}

/** A page with no buttons has no actions region. */
export const hasFooter = (plan: FooterPlan): boolean => Boolean(plan.primary || plan.secondary || plan.more?.length || plan.destructive || plan.slot)

/** The header's actions: the primary, up to two outlines, More with the destructive one last inside it. */
export function Actions({ plan }: { plan: FooterPlan }) {
  return <RecordFooter primary={plan.primary} secondary={plan.secondary} more={plan.more} destructive={plan.destructive} destructiveInMenu slot={plan.slot} />
}

export function Notice({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium shadow-sm">{children}</p>
}
