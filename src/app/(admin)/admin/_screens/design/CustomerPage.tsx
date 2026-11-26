"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarDays, CreditCard, Receipt, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/blocks/EmptyState"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { PassSeason } from "@/components/blocks/PassSeason"
import { Photos } from "@/components/blocks/Photos"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { RecordPage } from "@/components/blocks/RecordPage"
import { RecordFacts } from "@/components/blocks/RecordPanel"
import { CustomerCard } from "@/components/blocks/CustomerCard"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand, type SummaryItem } from "@/components/blocks/SummaryBand"
import { useToast } from "@/components/blocks/Toast"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { DoNotServiceTag } from "@/components/blocks/DoNotServiceTag"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { customerStatusOf } from "@/lib/customers/status"
import { ConsentCard } from "./ConsentCard"
import { CustomerBilling } from "./CustomerBilling"
import { CollectDialog, CopyDialog, EditDetailsDialog, MergeDialog, contactOf } from "./CustomerDialogs"
import { MessagesTable, JobsTable } from "./CustomerTables"
import { JobChip } from "./RecordChips"
import { cardLinkCopy, deleteCustomerCopy, mergeCopy, refundCopy } from "./confirm-copy"
import { AS_OF, STATUS_PILL, type CustomerPageData, type PassArea, type SeasonLink } from "./customer-fixtures"
import { CustomerQuotes } from "./CustomerQuotes"
import { MessageDialog } from "./MessageDialog"
import { ReminderDialog } from "./ReminderDialog"
import { NOW, noteOk } from "./job-fixtures"
import { TextLink } from "@/components/blocks/TextLink"
import { customerHeading } from "@/lib/admin/record-title"

// The customer page (Hannah: "update the customer layout to look like this"), on the page frame of the job page and the rules of
// docs/plans/2026-11-19-admin-page-layout-research.md and her rules of Nov 19 2026. Header: the name, the badges, and the actions at the top
// right: New job (primary), Send a message, Collect payment when anything is unpaid, More (Edit details, New quote, Send card link, Merge, and Delete only
// while nothing has happened). The summary band: Next visit, Unpaid, Season Pass, Card on file; each scrolls to its section on this page (Jobs, Billing, Season Pass, the card row)
// and none leaves it, since the job, the invoice and the pass are each linked once in their own section (Hannah, Nov 25 2026: "Too many links"); a cell with nothing behind it is plain. Main column: Jobs, Quotes (Nov 22 2026, with New quote), Season Pass, Billing, Messages, Photos, Notes and history. Aside: Contact (with how
// to reach them: the one `CustomerCard` with no name, since a page never links to itself), Property (the address is text), Consent. A job's name is its row's one link. Every action that reaches the customer or their money confirms in a dialog
// with the effect and the customer's channel; a result is a toast, never a message in a section. Pure props, nothing wired.

export type CustomerDialog = "archive" | "message" | "collect" | "card-link" | "refund" | "remind" | "edit" | "merge" | "delete" | null

const scrollTo = (id: string) => () => {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: "smooth", block: "center" })
}

export function bandOf(d: CustomerPageData): SummaryItem[] {
  const { next, unpaid, pass, card } = d.band
  const hasUnpaid = d.unpaid !== undefined || Boolean(unpaid.invoiceId)
  return [
    { label: "Next visit", value: next.value, sub: next.sub, icon: CalendarDays, ...(next.jobId ? { onClick: scrollTo("jobs-h") } : {}) },
    { label: "Unpaid", value: unpaid.value, sub: unpaid.sub, tone: unpaid.alert ? "alert" : "plain", icon: Receipt, ...(hasUnpaid ? { onClick: scrollTo("billing-h") } : {}) },
    { label: "Season Pass", value: pass.value, sub: pass.sub, icon: Ticket, ...(pass.jobId && d.area.kind === "pass" ? { onClick: scrollTo("pass-h") } : {}) },
    { label: "Card on file", value: card.value, sub: card.sub, icon: CreditCard, ...(d.billing.card ? { onClick: scrollTo("card-row") } : {}) },
  ]
}

const seasonChip = (s: SeasonLink, customer: string) => <JobChip id={s.jobId} name={`Season Pass ${s.season}, ${s.number}`} customer={customer} status="done" />

function Earlier({ area, customer }: { area: PassArea; customer: string }) {
  if (!area.earlier.length) return null
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-medium text-muted-foreground">Earlier seasons ({area.earlier.length})</summary>
      <ul className="flex flex-col gap-1 pb-1">
        {area.earlier.map((e) => (
          <li key={e.number} className="flex flex-wrap items-center justify-between gap-x-3">
            {seasonChip(e, customer)}
            <span className="flex flex-wrap items-center gap-x-1 text-muted-foreground">
              {e.state}
              {e.renewedAs && (
                <>
                  <span>, renewed as</span>
                  {seasonChip(e.renewedAs, customer)}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

/** The Season Pass block exists only for a customer who has one: a customer without a pass has no block at all (selling one is New job, then Season Pass, and More, then Sell a Season Pass). */
function SeasonPassCard({ d }: { d: CustomerPageData }) {
  const { area } = d
  if (area.kind !== "pass") return null
  return (
    <SectionCard title="Season Pass" id="pass-h">
      <div className="flex flex-col gap-3">
        <PassSeason variant="customer" idPrefix="cust-pass" pass={area.pass} today={NOW.toISOString()} facts={area.facts} card={area.card} visits={[]} charges={[]} className="sm:[&>div:first-child]:flex-col" />
        {area.renewedFrom && (
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            Renewed from {seasonChip(area.renewedFrom, d.name)}
          </p>
        )}
        {area.renewedAs && (
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            Renewed as {seasonChip(area.renewedAs, d.name)}
          </p>
        )}
        <Earlier area={area} customer={d.name} />
      </div>
    </SectionCard>
  )
}

export interface CustomerPageProps {
  customer: CustomerPageData
  /** the dialog open on first render (the stories that show one) */
  initialDialog?: CustomerDialog
  /** the Consent dialog open on first render (the stories that show one) */
  initialConsent?: "opt-in" | "history" | null
}

export function CustomerPage({ customer: d, initialDialog = null, initialConsent = null }: CustomerPageProps) {
  const [dialog, setDialog] = useState<CustomerDialog>(initialDialog)
  // the payment or invoice row a refund or a reminder was opened from
  const [row, setRow] = useState<{ number?: string; amount: string; how?: string; due?: string; pastDue?: boolean } | null>(null)
  const toast = useToast()
  const undoToast = useUndoToast()
  // The status is read from the facts by `customerStatusOf`; Archive is the one status the office sets, so it is the one piece of state here.
  const [archivedAt, setArchivedAt] = useState(d.statusFacts.archivedAt ?? null)
  const [dns, setDns] = useState(d.doNotService)
  const [history, setHistory] = useState<typeof d.notes>([])
  const status = customerStatusOf({ ...d.statusFacts, archivedAt }, AS_OF)
  const openJobs = d.jobs.filter((j) => j.open && j.status !== "cancelled")
  const pill = STATUS_PILL[status]
  const c = contactOf(d)
  const close = () => setDialog(null)
  const open = (which: CustomerDialog) => () => setDialog(which)
  const act = (label: string, onClick: () => void): FooterAction => ({ label, onClick })
  const unpaid = d.unpaid !== undefined
  const secondary: [FooterAction] | [FooterAction, FooterAction] = unpaid ? [act("Send a message", open("message")), act("Collect payment", open("collect"))] : [act("Send a message", open("message"))]
  // Selling a pass lives here and in New job, never in a card of its own. A pass renews itself, so a holder has no sell or reserve action at all.
  const sell: FooterAction = d.area.kind === "pass" ? { label: "" } : { label: "Sell a Season Pass", href: `/admin/jobs?new=1&customer=${d.id}&service=season-pass` }
  const more = [act("Edit details", open("edit")), { label: "New quote", href: `/admin/quotes?new=1&customer=${d.id}` }, ...(sell.label ? [sell] : []), act("Send card link", open("card-link")), act("Merge", open("merge")), ...(archivedAt ? [] : [act("Archive customer", open("archive"))])]
  const pay = row ?? (d.billing.payments[0] ? { amount: d.billing.payments[0].amount, how: d.billing.payments[0].how.split(" ")[0]!.toLowerCase() } : undefined)
  const inv = row?.number ? row : d.openInvoice ? { number: d.openInvoice.number, amount: d.openInvoice.amount, due: d.openInvoice.due, pastDue: false } : undefined
  const sentVia = d.contact.channel === "text" ? "texted" : "emailed"
  const quiet = (variant?: string) => variant === "quiet"
  return (
    <>
      <RecordPage
        crumb={{ label: "Customers", href: "/admin/customers" }}
        {...customerHeading({ name: d.name, detail: d.subtitle })}
        badges={
          <>
            <StatusPill status={pill.status} label={pill.label} size="lg" />
            {d.pills.filter((p) => p.status !== "owed" && p.status !== "overdue").map((p) => <StatusPill key={p.label ?? p.status} status={p.status} label={p.label} size="lg" />)}
            {dns && <DoNotServiceTag reason={dns.reason} />}
          </>
        }
        notice={
          archivedAt ? (
            <p data-slot="archived-banner" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3 text-sm shadow-sm">
              <span>Archived Nov 20. New work brings them back.</span>
              <Button size="touch" type="button" variant="outline" onClick={() => (setArchivedAt(null), toast(`${d.firstName} is back on the Customers list`))}>
                Unarchive
              </Button>
            </p>
          ) : undefined
        }
        band={<SummaryBand items={bandOf(d)} />}
        asideLabel="About this customer"
        actions={<RecordFooter primary={{ label: "New job", href: `/admin/jobs?new=1&customer=${d.id}` }} secondary={secondary} more={more} destructive={d.untouched ? act("Delete customer", open("delete")) : undefined} destructiveInMenu />}
        aside={
          <>
            <CustomerCard title="Contact" id="contact-h" phone={d.contact.phone.text} email={d.contact.email} action={<TextLink onClick={open("edit")}>Edit</TextLink>} />
            <SectionCard title="Property" id="property-h" action={<TextLink onClick={open("edit")}>Edit</TextLink>}>
              <RecordFacts divided rows={[["Address", d.address.filter(Boolean).join(", ")], ...d.property]} />
            </SectionCard>
            <ConsentCard consent={d.consent} firstName={d.firstName} initial={initialConsent} />
          </>
        }
      >
        <SectionCard title="Jobs" id="jobs-h">
          {d.jobs.length ? (
            <JobsTable rows={d.jobs} />
          ) : (
            <EmptyState title="No jobs yet" line="Start with a repair, a spring turn-on or a Season Pass. The job and its days show here." action={<Button size="touch" asChild variant="outline"><Link href={`/admin/jobs?new=1&customer=${d.id}`}>New job</Link></Button>} />
          )}
        </SectionCard>
        <CustomerQuotes quotes={d.quotes ?? []} customerId={d.id} />
        <SeasonPassCard d={d} />
        <CustomerBilling billing={d.billing} onUpdateCard={open("card-link")} onRefund={(r) => (setRow({ amount: r.amount, how: r.methodLabel.split(" ")[0]!.toLowerCase() }), setDialog("refund"))} onRemind={(r) => (setRow({ number: r.number, amount: r.amount, due: r.due, pastDue: r.status === "overdue" }), setDialog("remind"))} />
        <SectionCard title="Messages" id="messages-h">
          <MessagesTable messages={d.messages} to={{ sms: d.contact.phone.text, email: d.contact.email }} />
        </SectionCard>
        {d.photos.length > 0 && (
          <SectionCard title="Photos" id="photos-h">
            <Photos photos={d.photos} audience="staff" customerName={d.firstName} bare canShow={false} camera={false} heading="Photos from the customer" />
          </SectionCard>
        )}
        <SectionCard title="Notes and history" id="notes-h">
          <NotesAndHistory bare lines={[...history, ...d.notes]} onAddNote={noteOk} now={NOW} />
        </SectionCard>
      </RecordPage>

      {dialog === "message" && (
        <MessageDialog facts={{ first: d.firstName, channel: d.contact.channel, email: d.contact.email, phone: d.contact.phone.text, service: "job", amount: d.unpaid ?? "$0", address: d.address[0], dueOn: "", customer: d.name }} onClose={close} onSend={(m) => toast(`${m.channel === "text" ? "Text sent" : "Email sent"} to ${d.firstName}`)} />
      )}
      {dialog === "collect" && <CollectDialog who={c} amount={Number((d.unpaid ?? "$0").replace(/\D/g, ""))} card={d.billing.card} invoice={d.openInvoice} onClose={close} />}
      {dialog === "card-link" && <CopyDialog copy={cardLinkCopy(c)} onClose={close} onDone={() => toast(`Card link ${sentVia} to ${d.firstName}`)} />}
      {dialog === "refund" && pay && <CopyDialog copy={refundCopy(c, pay.amount, pay.how ?? "card")} onClose={close} onDone={(v) => toast(quiet(v) ? `Refunded ${pay.amount}. ${d.firstName} was not notified.` : `Refunded ${pay.amount}. ${d.firstName} was ${sentVia} a notice.`)} />}
      {dialog === "remind" && inv && <ReminderDialog who={c} invoice={{ number: inv.number!, amount: inv.amount, service: "job", dueOn: inv.due ?? "", pastDue: inv.pastDue }} onClose={close} onSend={() => toast(`Reminder ${sentVia} to ${d.firstName}`)} />}
      {dialog === "edit" && (
        <EditDetailsDialog
          d={d}
          dns={dns}
          onClose={close}
          onDone={(v) => {
            if (Boolean(v.dns) !== Boolean(dns) || v.dns?.reason !== dns?.reason) setHistory((h) => [{ id: `dns${h.length}`, at: "2026-11-20T15:00:00Z", actor: "Ryan", kind: "event", what: v.dns ? `Marked Do not service${v.dns.reason ? `: ${v.dns.reason}` : ""}` : "Cleared Do not service" }, ...h])
            setDns(v.dns)
            toast("Details saved")
          }}
        />
      )}
      {dialog === "archive" && openJobs.length > 0 && (
        <ConfirmDialog open onOpenChange={(o) => !o && close()} title="Archive customer" blocked={`Open jobs: ${openJobs.map((j) => j.name).join(", ")}. Finish or cancel them first.`} actions="none" slot="archive-refused" />
      )}
      {dialog === "archive" && openJobs.length === 0 && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title="Archive customer"
          message={d.unpaid ? `${d.name} owes ${d.unpaid}. Archive anyway? The invoice stays open and shows on Reports.` : `Archive ${d.name}? They leave the Customers list until Show archived is on. New work brings them back.`}
          confirmLabel="Archive customer"
          destructive
          slot="archive-confirm"
          onConfirm={async () => (setArchivedAt(AS_OF), undoToast(`Archived ${d.name}`, () => setArchivedAt(null)), { ok: true })}
        />
      )}
      {dialog === "merge" && <MergeDialog d={d} others={["Andrea Daltons (duplicate)", "A. Dalton"]} copy={(o) => mergeCopy(d.name, o)} onClose={close} onDone={(o) => toast(`Merged ${o} into ${d.name}`)} />}
      {dialog === "delete" && <CopyDialog copy={deleteCustomerCopy(d.name)} onClose={close} onDone={() => toast(`Deleted ${d.name}`)} />}
    </>
  )
}
