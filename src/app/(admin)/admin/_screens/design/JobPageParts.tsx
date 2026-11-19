"use client"

import { useState, type ReactNode } from "react"
import { Calendar, MapPin, Receipt, UserRound } from "lucide-react"
import { AsideCard } from "@/components/blocks/AsideCard"
import { BillingSection, type BillingRowData } from "@/components/blocks/BillingSection"
import { CollectPayment } from "@/components/blocks/CollectPayment"
import { dollars } from "@/lib/money/collect"
import { MessageTable } from "@/components/blocks/MessageTable"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { collectConfirm, footerConfirms, type ConfirmCopy, type ConfirmFacts } from "./confirm-copy"
import { RecordFacts, type RecordFact } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPill, statusLabel, type PillStatus } from "@/components/blocks/StatusPill"
import type { SummaryItem } from "@/components/blocks/SummaryBand"
import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import { NOW, noop, noteOk, type FooterPlan, type JobPageData, type PillData } from "./job-fixtures"

// The cards the one-trip, Season Pass and return-trip job pages share, so a card reads the same on every job (the rules are in
// docs/plans/2026-11-19-admin-page-layout-research.md): the badges for the header, the summary band's four cells, the aside (Customer,
// Property, Notes and history), Billing with beat two inline, Messages, and the header's actions. Pure props over the design fixtures.

export const CONTACT = { sms: "(970) 555-0123", email: "andrea.dalton@example.com" }
const PAY_WORDS: Partial<Record<string, string>> = { check: "Record the check", venmo: "Record the Venmo payment", cash: "Record the cash", invoice: "Send the invoice" }
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
  return [
    { label: b.when.label, value: b.when.value, sub: b.when.sub, icon: Calendar },
    { label: "Who", value: b.who, icon: UserRound },
    { label: "Where", value: street, sub: town, icon: MapPin },
    { label: "Total", value: b.total, sub: money.sub, tone: money.alert ? "alert" : "plain", icon: Receipt },
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
      <AsideCard name={customer} href="/admin/customers" phone={phone} address={[street, town ? `${town}, CO` : ""].filter(Boolean)} />
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

export function BillingCard({ data, facts }: { data: Pick<JobPageData, "billing" | "collect">; facts: ConfirmFacts }) {
  const { billing, collect } = data
  const summary = billing.summary.map(([k, v]) => [k, v] as [string, string])
  const status = billing.status
  return (
    <SectionCard title="Billing" id="billing-h">
      {collect && (
        <div className="mb-4 rounded-lg bg-stone p-4">
          <CollectPayment plan={collect.plan} summary={collect.summary} firstName="Andrea" onCharge={noteOk} onRecord={noteOk} onInvoice={noteOk} onLater={noop} onClose={noop} notNow confirmFor={(o, ref) => collectConfirm(o.value, facts, ref)} buttonLabel={(o) => (o.value === "card" ? `Charge ${dollars(collect.plan.amount)} to the ${collect.plan.cardWords}` : PAY_WORDS[o.value] ?? o.button)} />
        </div>
      )}
      {status && <p className="mb-2 text-sm font-medium"><MoneyCell text={status.text} tone={status.tone} /></p>}
      <BillingSection summary={summary} rows={billing.rows as BillingRowData[]} emptyLine={billing.emptyLine} />
    </SectionCard>
  )
}

export function MessagesCard({ messages }: { messages: Message[] }) {
  return (
    <section aria-labelledby="messages-h" className="flex flex-col gap-3">
      <SectionHeading level={2} size="section" id="messages-h">Messages</SectionHeading>
      <MessageTable messages={messages} to={CONTACT} />
    </section>
  )
}

/** A page with no buttons has no actions region. */
export const hasFooter = (plan: FooterPlan): boolean => Boolean(plan.primary || plan.secondary || plan.more?.length || plan.destructive || plan.slot)

/** The facts the confirmations read, from a job page's data. */
export function factsOfJob(job: JobPageData): ConfirmFacts {
  const text = job.billing.status?.text ?? ""
  const due = /(?:due|since) ([A-Z][a-z]{2} \d+)/.exec(text)?.[1] ?? "Dec 2"
  return {
    first: job.customer.split(" ")[0]!,
    service: "repair",
    amount: job.billing.summary.find(([k]) => k === "Total")?.[1] ?? "$145",
    phone: CONTACT.sms,
    address: split(row(job.where, "Address"))[0],
    cardWords: "Visa ending 4242",
    dueOn: due,
    pastDue: job.pills.some((p) => p.status === "overdue"),
  }
}

/** The header's actions: the primary, up to two outlines, More with the destructive one last inside it. A button that reaches the customer or their money opens its confirmation first (a customer-facing action always confirms and states its effect). */
export function Actions({ plan, facts }: { plan: FooterPlan; facts: ConfirmFacts }) {
  const [asking, setAsking] = useState<ConfirmCopy | null>(null)
  const confirms = footerConfirms(facts)
  const wrap = (a: FooterAction): FooterAction => (confirms[a.label] && !a.disabled ? { ...a, onClick: () => setAsking(confirms[a.label]!) } : a)
  return (
    <>
      <RecordFooter
        primary={plan.primary && wrap(plan.primary)}
        secondary={plan.secondary?.map(wrap) as FooterPlan["secondary"]}
        more={plan.more?.map(wrap)}
        destructive={plan.destructive && wrap(plan.destructive)}
        destructiveInMenu
        slot={plan.slot}
      />
      {asking && (
        <ConfirmDialog open onOpenChange={(o) => !o && setAsking(null)} title={asking.title} message={asking.message} confirmLabel={asking.confirmLabel} destructive={asking.destructive} slot="action-confirm" onConfirm={async () => ({ ok: true })}>
          {asking.body && <p className="whitespace-pre-wrap rounded-lg bg-stone p-3 text-sm">{asking.body}</p>}
        </ConfirmDialog>
      )}
    </>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium shadow-sm">{children}</p>
}
