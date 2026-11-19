import type { ReactNode } from "react"
import { BillingSection, type BillingRowData } from "@/components/blocks/BillingSection"
import { CollectPayment } from "@/components/blocks/CollectPayment"
import { MessageThread } from "@/components/blocks/MessageThread"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { RecordFooter } from "@/components/blocks/RecordFooter"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import { NOW, noop, noteOk, type FooterPlan, type JobPageData, type PillData } from "./job-fixtures"

// The sections the one-trip, Season Pass and return-trip job pages share, so a section reads the same on every job: the two-column pair
// (left and right from `lg`, stacked on a phone, the same gutter as the page's When and Where), the pills, Billing with beat two inline,
// Notes and history, Messages, and the footer bar. Pure props over the design fixtures.

export function Pair({ children }: { children: ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">{children}</div>
}

export const EditLink = ({ label = "Edit" }: { label?: string }) => (
  <button type="button" onClick={noop} className="min-h-11 rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
    {label}
  </button>
)

export function Pills({ pills, note }: { pills: PillData[]; note?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {pills.map((p) => <StatusPill key={p.status} status={p.status} label={p.label} />)}
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </span>
  )
}

export function Billing({ data }: { data: Pick<JobPageData, "billing" | "collect"> }) {
  const { billing, collect } = data
  const summary = billing.summary.map(([k, v]) => [k, v] as [string, string])
  const status = billing.status
  return (
    <section aria-labelledby="billing-h">
      <SectionHeading id="billing-h">Billing</SectionHeading>
      {collect && (
        <div className="mt-2 rounded-lg border border-border bg-card p-4">
          <CollectPayment plan={collect.plan} summary={collect.summary} firstName="Andrea" onCharge={noteOk} onRecord={noteOk} onInvoice={noteOk} onLater={noop} onClose={noop} />
        </div>
      )}
      {status && <p className="mt-2 text-sm font-medium"><MoneyCell text={status.text} tone={status.tone} /></p>}
      <BillingSection summary={summary} rows={billing.rows as BillingRowData[]} emptyLine={billing.emptyLine} />
    </section>
  )
}

export function History({ notes, messages }: { notes: TimelineLine[]; messages: Message[] }) {
  return (
    <Pair>
      <section aria-label="Notes and history">
        <NotesAndHistory lines={notes} onAddNote={noteOk} now={NOW} />
      </section>
      <section aria-labelledby="messages-h">
        <SectionHeading id="messages-h">Messages</SectionHeading>
        <div className="mt-2"><MessageThread messages={messages} newestFirst /></div>
      </section>
    </Pair>
  )
}

/** A page with no buttons has no footer bar. */
export const hasFooter = (plan: FooterPlan): boolean => Boolean(plan.primary || plan.secondary || plan.more?.length || plan.destructive || plan.slot)

export function Footer({ plan }: { plan: FooterPlan }) {
  return <RecordFooter primary={plan.primary} secondary={plan.secondary} more={plan.more} destructive={plan.destructive} slot={plan.slot} />
}

export function Notice({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-lg border border-border bg-stone px-4 py-3 text-sm font-medium">{children}</p>
}
