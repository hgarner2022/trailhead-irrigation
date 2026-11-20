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
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand, type SummaryItem } from "@/components/blocks/SummaryBand"
import { recordHref } from "@/components/blocks/record-preview-model"
import { useToast } from "@/components/blocks/Toast"
import { ConsentCard } from "./ConsentCard"
import { CustomerBilling } from "./CustomerBilling"
import { CollectDialog, CopyDialog, EditDetailsDialog, MergeDialog, contactOf } from "./CustomerDialogs"
import { MessagesTable, JobsTable } from "./CustomerTables"
import { AddressChip, JobChip } from "./RecordChips"
import { cardLinkCopy, deleteCustomerCopy, mergeCopy, refundCopy } from "./confirm-copy"
import type { CustomerPageData, PassArea, SeasonLink } from "./customer-fixtures"
import { MessageDialog } from "./MessageDialog"
import { ReminderDialog } from "./ReminderDialog"
import { NOW, noteOk } from "./job-fixtures"

// The customer page (Hannah: "update the customer layout to look like this"), on the page frame of the job page and the rules of
// docs/plans/2026-11-19-admin-page-layout-research.md and her rules of Nov 19 2026. Header: the name, the badges, and the actions at the top
// right: New job (primary), Send a message, Collect payment when anything is unpaid, More (Edit details, Send card link, Merge, and Delete only
// while nothing has happened). The summary band: Next visit, Unpaid, Season Pass, Card on file, each a link to what it summarises and a plain
// cell when it has nothing behind it. Main column: Jobs, Season Pass, Billing, Messages, Photos, Notes and history. Aside: Contact (with how
// to reach them), Property, Consent. Every record named is a chip. Every action that reaches the customer or their money confirms in a dialog
// with the effect and the customer's channel; a result is a toast, never a message in a section. Pure props, nothing wired.

const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
export type CustomerDialog = "message" | "collect" | "card-link" | "refund" | "remind" | "edit" | "merge" | "delete" | null

const scrollTo = (id: string) => () => {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: "smooth", block: "center" })
}

export function bandOf(d: CustomerPageData): SummaryItem[] {
  const { next, unpaid, pass, card } = d.band
  const hasUnpaid = d.unpaid !== undefined
  const jobHref = (id?: string) => (id ? recordHref.job(id) : undefined)
  return [
    { label: "Next visit", value: next.value, sub: next.sub, icon: CalendarDays, href: jobHref(next.jobId) },
    { label: "Unpaid", value: unpaid.value, sub: unpaid.sub, tone: unpaid.alert ? "alert" : "plain", icon: Receipt, ...(unpaid.invoiceId ? { href: recordHref.invoice(unpaid.invoiceId) } : hasUnpaid ? { onClick: scrollTo("billing-h") } : {}) },
    { label: "Season Pass", value: pass.value, sub: pass.sub, icon: Ticket, href: jobHref(pass.jobId) },
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

/** The Season Pass block exists only for a customer who has one: a customer without a pass has no block at all (selling one is New job, then Season Pass, and More, then Sell a Season Pass). From November 1 a holder's block offers Reserve next season. */
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
        {area.reserveNext && (
          <Button asChild variant="outline" className="min-h-11 self-start">
            <Link href={`/admin/jobs?new=1&customer=${d.id}&service=season-pass&renew=${area.jobId}`}>Reserve next season</Link>
          </Button>
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
  const c = contactOf(d)
  const close = () => setDialog(null)
  const open = (which: CustomerDialog) => () => setDialog(which)
  const act = (label: string, onClick: () => void): FooterAction => ({ label, onClick })
  const unpaid = d.unpaid !== undefined
  const secondary: [FooterAction] | [FooterAction, FooterAction] = unpaid ? [act("Send a message", open("message")), act("Collect payment", open("collect"))] : [act("Send a message", open("message"))]
  // Selling a pass lives here and in New job, never in a card of its own; a lapsed holder is offered the next season instead.
  const sell: FooterAction = d.area.kind === "pass" ? (d.area.reserveNext ? { label: "Reserve next season", href: `/admin/jobs?new=1&customer=${d.id}&service=season-pass&renew=${d.area.jobId}` } : { label: "" }) : { label: d.area.earlier.length ? "Reserve next season" : "Sell a Season Pass", href: `/admin/jobs?new=1&customer=${d.id}&service=season-pass` }
  const more = [act("Edit details", open("edit")), ...(sell.label ? [sell] : []), act("Send card link", open("card-link")), act("Merge", open("merge"))]
  const pay = row ?? (d.billing.payments[0] ? { amount: d.billing.payments[0].amount, how: d.billing.payments[0].how.split(" ")[0]!.toLowerCase() } : undefined)
  const inv = row?.number ? row : d.openInvoice ? { number: d.openInvoice.number, amount: d.openInvoice.amount, due: d.openInvoice.due, pastDue: false } : undefined
  const sentVia = d.contact.channel === "text" ? "texted" : "emailed"
  const quiet = (variant?: string) => variant === "quiet"
  return (
    <>
      <RecordPage
        crumb={{ label: "Customers", href: "/admin/customers" }}
        title={d.name}
        subtitle={d.subtitle}
        badges={d.pills.map((p) => <StatusPill key={p.label ?? p.status} status={p.status} label={p.label} size="lg" />)}
        band={<SummaryBand items={bandOf(d)} />}
        asideLabel="About this customer"
        actions={<RecordFooter primary={{ label: "New job", href: `/admin/jobs?new=1&customer=${d.id}` }} secondary={secondary} more={more} destructive={d.untouched ? act("Delete customer", open("delete")) : undefined} destructiveInMenu />}
        aside={
          <>
            <SectionCard title="Contact" id="contact-h" action={<button type="button" onClick={open("edit")} className={`min-h-11 ${LINK}`}>Edit</button>}>
              <RecordFacts
                divided
                rows={[
                  ["Phone", <a key="p" href={d.contact.phone.href} className={`${LINK} inline-flex min-h-11 items-center`}>{d.contact.phone.text}</a>],
                  ["Email", <a key="e" href={`mailto:${d.contact.email}`} className={`${LINK} inline-flex min-h-11 items-center break-all`}>{d.contact.email}</a>],
                ]}
              />
            </SectionCard>
            <SectionCard title="Property" id="property-h" action={<button type="button" onClick={open("edit")} className={`min-h-11 ${LINK}`}>Edit</button>}>
              <RecordFacts divided rows={[["Address", <AddressChip key="a" customerId={d.id} street={d.address[0]} />], ...d.property]} />
            </SectionCard>
            <ConsentCard consent={d.consent} firstName={d.firstName} initial={initialConsent} />
          </>
        }
      >
        <SectionCard title="Jobs" id="jobs-h">
          {d.jobs.length ? (
            <JobsTable rows={d.jobs} customer={d.name} />
          ) : (
            <EmptyState title="No jobs yet" line="Start with a repair, a spring turn-on or a Season Pass. The job and its days show here." action={<Button asChild variant="outline" className="min-h-11"><Link href={`/admin/jobs?new=1&customer=${d.id}`}>New job</Link></Button>} />
          )}
        </SectionCard>
        <SeasonPassCard d={d} />
        <CustomerBilling billing={d.billing} customerName={d.name} onUpdateCard={open("card-link")} onRefund={(r) => (setRow({ amount: r.amount, how: r.methodLabel.split(" ")[0]!.toLowerCase() }), setDialog("refund"))} onRemind={(r) => (setRow({ number: r.number, amount: r.amount, due: r.due, pastDue: r.status === "overdue" }), setDialog("remind"))} />
        <SectionCard title="Messages" id="messages-h">
          <MessagesTable messages={d.messages} to={{ sms: d.contact.phone.text, email: d.contact.email }} />
        </SectionCard>
        {d.photos.length > 0 && (
          <SectionCard title="Photos" id="photos-h">
            <Photos photos={d.photos} audience="staff" customerName={d.firstName} bare canShow={false} camera={false} heading="Photos from the customer" />
          </SectionCard>
        )}
        <SectionCard title="Notes and history" id="notes-h">
          <NotesAndHistory bare lines={d.notes} onAddNote={noteOk} now={NOW} />
        </SectionCard>
      </RecordPage>

      {dialog === "message" && (
        <MessageDialog facts={{ first: d.firstName, channel: d.contact.channel, email: d.contact.email, phone: d.contact.phone.text, service: "job", amount: d.unpaid ?? "$0", address: d.address[0], dueOn: "", customer: d.name }} onClose={close} onSend={(m) => toast(`${m.channel === "text" ? "Text sent" : "Email sent"} to ${d.firstName}`)} />
      )}
      {dialog === "collect" && <CollectDialog who={c} amount={Number((d.unpaid ?? "$0").replace(/\D/g, ""))} card={d.billing.card} invoice={d.openInvoice} onClose={close} />}
      {dialog === "card-link" && <CopyDialog copy={cardLinkCopy(c)} onClose={close} onDone={() => toast(`Card link ${sentVia} to ${d.firstName}`)} />}
      {dialog === "refund" && pay && <CopyDialog copy={refundCopy(c, pay.amount, pay.how ?? "card")} onClose={close} onDone={(v) => toast(quiet(v) ? `Refunded ${pay.amount}. ${d.firstName} was not notified.` : `Refunded ${pay.amount}. ${d.firstName} was ${sentVia} a notice.`)} />}
      {dialog === "remind" && inv && <ReminderDialog who={c} invoice={{ number: inv.number!, amount: inv.amount, service: "job", dueOn: inv.due ?? "", pastDue: inv.pastDue }} onClose={close} onSend={() => toast(`Reminder ${sentVia} to ${d.firstName}`)} />}
      {dialog === "edit" && <EditDetailsDialog d={d} onClose={close} onDone={() => toast("Details saved")} />}
      {dialog === "merge" && <MergeDialog d={d} others={["Andrea Daltons (duplicate)", "A. Dalton"]} copy={(o) => mergeCopy(d.name, o)} onClose={close} onDone={(o) => toast(`Merged ${o} into ${d.name}`)} />}
      {dialog === "delete" && <CopyDialog copy={deleteCustomerCopy(d.name)} onClose={close} onDone={() => toast(`Deleted ${d.name}`)} />}
    </>
  )
}
