"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Calendar, MapPin, Receipt, UserRound } from "lucide-react"
import { AsideCard } from "@/components/blocks/AsideCard"
import { CollectPayment } from "@/components/blocks/CollectPayment"
import { dollars } from "@/lib/money/collect"
import { MessageTable } from "@/components/blocks/MessageTable"
import { RecordChip } from "@/components/blocks/RecordChip"
import { useToast } from "@/components/blocks/Toast"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { SplitButton } from "@/components/blocks/SplitButton"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { collectConfirm, doneToast, footerConfirms, type ConfirmCopy, type ConfirmFacts } from "./confirm-copy"
import { RecordFacts, type RecordFact } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill, statusLabel, type PillStatus } from "@/components/blocks/StatusPill"
import type { SummaryItem } from "@/components/blocks/SummaryBand"
import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import { MessageDialog } from "./MessageDialog"
import { NOW, noop, noteOk, type FooterPlan, type JobPageData, type PastVisit, type PillData } from "./job-fixtures"

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** The Schedule's address for a day written "Tue, Nov 24" or "Oct 14, 2026" (2026 when no year); undefined for "None" or "No day yet". */
export function dayHref(label: string): string | undefined {
  const m = /([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?\b/.exec(label)
  const month = m ? MONTHS.indexOf(m[1]!) : -1
  if (!m || month < 0) return undefined
  return `/admin/schedule?day=${m[3] ?? "2026"}-${String(month + 1).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`
}

const split = (address: string | undefined): [string, string | undefined] => {
  const [street, ...rest] = (address ?? "").split(", ")
  return [street || "No address", rest.join(", ") || undefined]
}

export interface BandInput {
  when: { label: string; value: string; sub?: string; activeSince?: string }
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
    { label: b.when.label, value: dayHref(b.when.value) ? <RecordChip kind="day" name={b.when.value} href={dayHref(b.when.value)!} /> : b.when.value, sub: b.when.activeSince ? <><span className="block">{b.when.sub}</span><span className="block font-medium text-navy">{b.when.activeSince}</span></> : b.when.sub, icon: Calendar },
    { label: "Who", value: /^No one/.test(b.who) ? b.who : <RecordChip kind="person" name={b.who} href="/admin/settings?tab=people" />, icon: UserRound },
    { label: "Where", value: street === "No address" ? street : <RecordChip kind="property" name={street} href="/admin/customers" />, sub: town, icon: MapPin },
    { label: "Total", value: b.total, sub: money.sub, tone: money.alert ? "alert" : "plain", icon: Receipt },
  ]
}

export function bandOfJob(job: JobPageData): SummaryItem[] {
  return bandItems({
    when: { label: "When", value: row(job.when, "Day") ?? "None", sub: row(job.when, "Time"), activeSince: job.activeSince },
    who: row(job.when, "Who") ?? "No one",
    address: row(job.where, "Address"),
    total: job.billing.summary.find(([k]) => k === "Total")?.[1] ?? "$0",
    pills: job.pills,
    statusText: job.billing.status?.text,
    canceled: job.pills.some((p) => p.status === "cancelled"),
  })
}

/** The aside: the customer with phone and address, the property's facts, then Notes and history. */
/** Past visits at this property: the earlier visits newest first, each the date, the service, who and the note left on it; three shown, "See all N" opens the customer. */
export function PastVisitsCard({ street, visits, total }: { street: string; visits: PastVisit[]; total: number }) {
  return (
    <SectionCard title={`Past visits at ${street}`} id="past-h">
      {visits.length === 0 ? (
        <p className="text-sm text-muted-foreground">First visit here.</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visits.slice(0, 3).map((v) => (
              <li key={v.id} data-slot="past-visit" className="py-3 first:pt-0 last:pb-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <RecordChip kind="job" name={v.service} href={`/admin/jobs/${v.jobId}`} />
                  <RecordChip kind="day" name={v.date} href={dayHref(v.date) ?? "/admin/schedule"} />
                  <RecordChip kind="person" name={v.who} href="/admin/settings?tab=people" />
                </p>
                {v.note && <p className="mt-1 text-sm text-foreground">{v.note}</p>}
              </li>
            ))}
          </ul>
          {total > 3 && (
            <Link href="/admin/customers" className="mt-3 inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              See all {total}
            </Link>
          )}
        </>
      )}
    </SectionCard>
  )
}

export function Aside({ customer, phone, where, notes, pastVisits, pastTotal }: { customer: string; phone: { text: string; href: string }; where: readonly RecordFact[]; notes: TimelineLine[]; pastVisits?: PastVisit[]; pastTotal?: number }) {
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
      {pastVisits && <PastVisitsCard street={street} visits={pastVisits} total={pastTotal ?? pastVisits.length} />}
      <SectionCard title="Notes and history" id="notes-h">
        <NotesAndHistory bare lines={notes} onAddNote={noteOk} now={NOW} />
      </SectionCard>
    </>
  )
}

export interface CollectHandlers {
  onCharge?: () => Promise<{ ok: true }>
  onRecord?: (input: { method: string; reference?: string }) => Promise<{ ok: true }>
  onInvoice?: (o?: { report: boolean }) => Promise<{ ok: true }>
  onClose?: () => void
  onLater?: () => void
  /** the money or the invoice has gone through: the page is already in its new state and a toast has said so; a dialog closes here */
  onDone?: (way: string) => void
}

/** How is this paid?, the same choice block in Billing and in the dialog that follows Mark done. */
export function CollectBlock({ collect, facts, handlers, bare }: { collect: NonNullable<JobPageData["collect"]>; facts: ConfirmFacts; handlers?: CollectHandlers; bare?: boolean }) {
  const toast = useToast()
  return (
    <div className={bare ? "" : "mb-4 rounded-lg bg-stone p-4"}>
      <CollectPayment plan={collect.plan} summary={collect.summary} firstName="Andrea" onCharge={handlers?.onCharge ?? noteOk} onRecord={handlers?.onRecord ?? noteOk} onInvoice={handlers?.onInvoice ?? noteOk} onLater={handlers?.onLater ?? noop} onClose={handlers?.onClose ?? noop} notNow onDone={(d) => (toast(doneToast(d.way, facts)), handlers?.onDone?.(d.way))} confirmFor={(o, ref) => collectConfirm(o.value, facts, ref)} buttonLabel={(o) => (o.value === "card" ? `Charge ${dollars(collect.plan.amount)} to the ${collect.plan.cardWords}` : PAY_WORDS[o.value] ?? o.button)} />
    </div>
  )
}

export function MessagesCard({ messages }: { messages: Message[] }) {
  return (
    <SectionCard title="Messages" id="messages-h">
      <MessageTable messages={messages} to={CONTACT} toolbar={false} />
    </SectionCard>
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
    customer: job.customer,
    channel: job.contact?.channel ?? "text",
    email: job.contact?.email ?? "andrea.dalton@example.com",
    firstText: !job.messages.some((m) => m.channel === "sms"),
    late: job.pillNote === "day passed",
    service: "repair",
    amount: job.billing.summary.find(([k]) => k === "Total")?.[1] ?? "$145",
    phone: CONTACT.sms,
    address: split(row(job.where, "Address"))[0],
    cardWords: "Visa ending 4242",
    dueOn: due,
    pastDue: job.pills.some((p) => p.status === "overdue"),
    invoiceOpen: Boolean(job.billing.invoices?.some((i) => i.status !== "paid")),
  }
}

/** The header's actions: the primary, up to two outlines, More with the destructive one last inside it. A button that reaches the customer or their money opens its confirmation first (a customer-facing action always confirms and states its effect). */
export function Actions({ plan, facts, onDo, onMessage, intercept = [], collect, handlers }: { plan: FooterPlan; facts: ConfirmFacts; onDo?: (label: string, variant?: string) => void; onMessage?: (m: { channel: "text" | "email"; body: string }) => void; intercept?: string[]; collect?: JobPageData["collect"]; handlers?: CollectHandlers }) {
  const [composing, setComposing] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [doneDay, setDoneDay] = useState<string>("")
  const [asking, setAsking] = useState<(ConfirmCopy & { label?: string }) | null>(null)
  const confirms = footerConfirms(facts)
  const wrap = (a: FooterAction): FooterAction => {
    if (a.disabled) return a
    if (a.label === "Send a message") return { ...a, onClick: () => setComposing(true) }
    if (a.label === "Collect payment" && collect) return { ...a, onClick: () => setCollecting(true) }
    if (intercept.includes(a.label)) return { ...a, onClick: () => onDo?.(a.label) }
    if (confirms[a.label]) return { ...a, onClick: () => (setDoneDay(confirms[a.label]!.doneOn?.[0] ?? ""), setAsking({ ...confirms[a.label]!, label: a.label })) }
    return onDo ? { ...a, onClick: () => onDo(a.label) } : a
  }
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
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAsking(null)}
          title={asking.title}
          message={asking.message}
          confirmLabel={asking.confirmLabel}
          destructive={asking.destructive}
          slot="action-confirm"
          onConfirm={async (variant) => {
            if (asking.label) onDo?.(asking.label, variant)
            return { ok: true }
          }}
          renderConfirm={asking.quiet ? ({ confirm, pending }) => <SplitButton label={asking.confirmLabel ?? "Confirm"} onClick={() => confirm("send")} disabled={pending} menuLabel="More ways" menu={[{ label: asking.quiet!, onSelect: () => confirm("quiet") }]} /> : undefined}
        >
          {asking.body && <p className="whitespace-pre-wrap rounded-lg bg-stone p-3 text-sm">{asking.body}</p>}
          {asking.doneOn && (
            <FormRow label="Done on">
              <select value={doneDay} onChange={(e) => setDoneDay(e.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm">{asking.doneOn.map((d) => <option key={d}>{d}</option>)}</select>
            </FormRow>
          )}
        </ConfirmDialog>
      )}
      {collecting && collect && (
        <ConfirmDialog open onOpenChange={(o) => !o && setCollecting(false)} title="How is this paid?" actions="none" size="md" slot="collect-dialog">
          <CollectBlock bare collect={collect} facts={facts} handlers={{ ...handlers, onClose: () => setCollecting(false), onLater: () => setCollecting(false), onDone: (way) => (setCollecting(false), handlers?.onDone?.(way)) }} />
        </ConfirmDialog>
      )}
      {composing && <MessageDialog facts={facts} onClose={() => setComposing(false)} onSend={(m) => onMessage?.(m)} />}
    </>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium shadow-sm">{children}</p>
}
