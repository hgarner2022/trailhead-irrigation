"use client"

import { useMemo, useState } from "react"
import { Calendar, CheckCircle2, Receipt, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { LineItemList } from "@/components/blocks/LineItemList"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { RecordPage } from "@/components/blocks/RecordPage"
import { RecordFacts } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand, type SummaryItem } from "@/components/blocks/SummaryBand"
import { useToast } from "@/components/blocks/Toast"
import { CollectDialog, CopyDialog } from "./CustomerDialogs"
import { MessagesTable, PaymentsTable } from "./CustomerTables"
import { AddressChip, CustomerChip, JobChip, paymentHref } from "./RecordChips"
import { ReminderDialog } from "./ReminderDialog"
import { cancelInvoiceCopy, resendInvoiceCopy } from "./confirm-copy"
import { INVOICE_PILL, type InvoicePageData, type ReminderRow } from "./invoice-fixtures"
import { NOW, noteOk } from "./job-fixtures"

// The invoice as a page of its own, like the job page (Hannah, Nov 19 2026; docs/plans/2026-11-18-invoice-workflow-research.md): the number as the
// title with its status pill and the customer chip, the actions at the top right (Send a payment reminder, primary while it is unpaid; Collect
// payment; More: Resend, Open pay page, Cancel invoice in the destructive colour), the summary band (Amount, Sent, Due, Paid on, each a link to
// what it summarises), then Lines (frozen, with tax when any), Payments, Reminders (what was sent, by hand or by the schedule, and the next one
// with Pause), Messages and Notes and history; the aside holds the Customer, the Job and the Property. Every action that reaches the customer
// confirms with the exact effect and their channel; a result is a toast and the section changes state (a new reminder row, a new pill). Pure props.

const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
const scrollTo = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
type Dialog = "remind" | "collect" | "resend" | "cancel" | null

export interface InvoicePageProps {
  invoice: InvoicePageData
  initialDialog?: Dialog
}

const REMINDER_COLUMNS: GridColumnDef<ReminderRow>[] = [
  { id: "sent", accessorKey: "sortAt", header: "Sent", meta: { bare: true }, cell: ({ row }) => row.original.sentOn },
  { id: "how", accessorKey: "how", header: "How" },
  { id: "to", accessorKey: "to", header: "To" },
  { id: "words", accessorKey: "words", header: "Status" },
]
const REMINDER_CARD: GridCardSlots = { title: "sent", line: ["how"], when: ["to", "words"] }

function RemindersCard({ d, rows, paused, onPause }: { d: InvoicePageData; rows: ReminderRow[]; paused: boolean; onPause: () => void }) {
  const done = d.status === "paid" || d.status === "canceled"
  const line = done ? (d.status === "paid" ? "No more reminders: it is paid." : "No reminders: it is canceled.") : paused ? "Scheduled reminders are paused." : d.schedule ? `Next reminder: ${d.schedule.next}` : "No reminder is scheduled."
  return (
    <SectionCard title="Reminders" id="reminders-h" flush>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <p data-slot="reminder-schedule" className="text-sm font-medium">{line}</p>
        {!done && d.schedule && (
          <Button type="button" variant="outline" className="min-h-11" onClick={onPause}>
            {paused ? "Resume" : "Pause"}
          </Button>
        )}
      </div>
      {rows.length > 0 ? (
        <div className="border-t border-border">
          <DataGrid columns={REMINDER_COLUMNS} card={REMINDER_CARD} data={rows} getRowId={(r) => r.id} toolbar={false} pageSize={10} emptyTitle="No reminders yet" emptyLine="Every reminder sent for this invoice shows here." />
        </div>
      ) : (
        <p className="border-t border-border px-5 py-4 text-sm text-muted-foreground">No reminders sent yet. They show here with how they went out.</p>
      )}
    </SectionCard>
  )
}

export function InvoicePage({ invoice, initialDialog = null }: InvoicePageProps) {
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(initialDialog)
  const [state, setState] = useState({ status: invoice.status, paid: false, reminded: invoice.remindedToday ?? false, paused: invoice.schedule?.paused ?? false, extra: [] as ReminderRow[] })
  const d = invoice
  const status = state.status
  const out = status === "sent" || status === "past-due"
  const first = d.customer.contact.first
  const sentVia = d.customer.contact.channel === "text" ? "texted" : "emailed"
  const close = () => setDialog(null)
  const act = (label: string, onClick: () => void, disabled?: boolean): FooterAction => ({ label, onClick, disabled })
  const pill = INVOICE_PILL[status]
  const paidNow = state.paid ? { label: "Today", paymentId: "p-new" } : d.paidOn
  const payments = useMemo(() => (state.paid ? [{ id: "p-new", receipt: "R-1100", date: "Nov 18", sortDay: "2026-11-18", jobId: d.job.id, jobName: d.job.name, how: "Card", amount: d.amount, stripeUrl: "https://dashboard.stripe.com/payments/pi_new" }, ...d.payments] : d.payments), [state.paid, d])
  const reminders = useMemo(() => [...state.extra, ...d.reminders], [state.extra, d.reminders])
  const unpaid = state.paid || !out ? "$0" : d.unpaid
  const totals = state.paid ? d.totals.map(([k, v, e]) => (k === "Paid" ? ([k, d.amount, e] as const) : k === "Unpaid" ? ([k, "$0", undefined] as const) : ([k, v, e] as const))) : d.totals

  const band: SummaryItem[] = [
    { label: "Amount", value: d.amount, sub: d.totals.some(([k, v]) => k === "Tax" && v !== "$0") ? "Tax included" : "No tax", icon: Receipt, onClick: scrollTo("lines-h") },
    { label: "Sent", value: d.sent, sub: first ? `${d.customer.contact.channel === "text" ? "Text" : "Email"} to ${first}` : undefined, icon: Send, onClick: scrollTo("messages-h") },
    { label: "Due", value: d.due, sub: status === "past-due" ? "Past due" : status === "sent" ? "Not yet due" : undefined, tone: status === "past-due" ? "alert" : "plain", icon: Calendar, onClick: scrollTo("reminders-h") },
    { label: "Paid on", value: paidNow ? paidNow.label.split(",")[0]! : "Not paid", sub: paidNow ? paidNow.label.split(", ")[1] ?? "" : status === "canceled" ? "Canceled" : `${unpaid} unpaid`, icon: CheckCircle2, ...(paidNow ? { href: paymentHref(paidNow.paymentId) } : {}) },
  ]

  const more: FooterAction[] = [act("Resend the invoice", () => setDialog("resend")), { label: "Open pay page", href: `https://trailheadirrigation.com/pay/${d.id}`, external: true }]
  const actions = (
    <RecordFooter
      primary={out ? act(state.reminded ? "Reminded today" : "Send a payment reminder", () => setDialog("remind"), state.reminded) : undefined}
      secondary={out ? [act("Collect payment", () => setDialog("collect"))] : undefined}
      more={status === "canceled" ? [{ label: "Open pay page", href: `https://trailheadirrigation.com/pay/${d.id}`, external: true }] : more}
      destructive={out ? act("Cancel invoice", () => setDialog("cancel")) : undefined}
      destructiveInMenu
    />
  )
  const c = d.customer.contact
  return (
    <>
      <RecordPage
        crumb={{ label: "Invoices", href: "/admin/invoices" }}
        title={d.number}
        badges={
          <>
            <StatusPill status={pill.pill} label={pill.label} size="lg" />
            <CustomerChip id={d.customer.id} name={d.customer.name} phone={d.customer.phone.text} address={d.customer.street} unpaid={unpaid} />
          </>
        }
        band={<SummaryBand items={band} />}
        asideLabel="About this invoice"
        actions={actions}
        aside={
          <>
            <SectionCard title="Customer" id="customer-h">
              <div className="flex flex-col gap-1">
                <CustomerChip id={d.customer.id} name={d.customer.name} phone={d.customer.phone.text} address={d.customer.street} unpaid={unpaid} />
                <a href={d.customer.phone.href} className={`${LINK} inline-flex min-h-11 items-center text-sm font-medium`}>{d.customer.phone.text}</a>
                <p className="text-sm text-muted-foreground">Contact by {c.channel === "text" ? "text" : "email"}</p>
              </div>
            </SectionCard>
            <SectionCard title="Job" id="job-h">
              <div className="flex flex-col gap-2">
                <JobChip id={d.job.id} name={d.job.name} customer={d.customer.name} status={d.job.status} total={d.job.total} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusPill status={d.job.status} label={d.job.statusLabel} />
                  <span className="text-muted-foreground">{d.job.next}</span>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Property" id="property-h">
              <RecordFacts divided rows={[["Address", <AddressChip key="a" customerId={d.customer.id} street={d.customer.street} />], ...d.property]} />
            </SectionCard>
          </>
        }
      >
        <SectionCard title="Lines" id="lines-h">
          <LineItemList lines={d.lines} totals={totals} />
        </SectionCard>
        <SectionCard title="Payments" id="payments-h" flush>
          {payments.length ? <PaymentsTable rows={payments} customer={d.customer.name} cardWords={d.card ? `${d.card.brand} ending ${d.card.last4}` : undefined} omitJob /> : <p className="px-5 py-4 text-sm text-muted-foreground">No payments yet. A payment shows here with its receipt, and settles the invoice.</p>}
        </SectionCard>
        <RemindersCard d={{ ...d, status }} rows={reminders} paused={state.paused} onPause={() => (setState((s) => ({ ...s, paused: !s.paused })), toast(state.paused ? "Scheduled reminders resumed" : "Scheduled reminders paused"))} />
        <SectionCard title="Messages" id="messages-h" flush>
          <MessagesTable messages={d.messages} to={{ sms: d.customer.phone.text, email: c.email }} />
        </SectionCard>
        <SectionCard title="Notes and history" id="notes-h">
          <NotesAndHistory bare lines={d.notes} onAddNote={noteOk} now={NOW} />
        </SectionCard>
      </RecordPage>

      {dialog === "remind" && (
        <ReminderDialog
          who={c}
          invoice={{ number: d.number, amount: d.amount, service: d.job.name.toLowerCase(), dueOn: d.due, pastDue: status === "past-due" }}
          onClose={close}
          onSend={() => {
            setState((s) => ({ ...s, reminded: true, extra: [{ id: "r-new", sentOn: "Nov 18", sortAt: "2026-11-18", how: "By hand", to: c.channel === "text" ? c.phone : c.email, words: "Sent" }, ...s.extra] }))
            toast(`Reminder ${sentVia} to ${first}`)
          }}
        />
      )}
      {dialog === "collect" && <CollectDialog who={c} amount={Number(d.unpaid.replace(/\D/g, ""))} card={d.card ?? { brand: "Visa", last4: "4242" }} invoice={{ number: d.number, jobName: d.job.name, amount: d.unpaid }} onClose={close} onPaid={() => setState((s) => ({ ...s, paid: true, status: "paid" }))} />}
      {dialog === "resend" && <CopyDialog copy={resendInvoiceCopy(c, { number: d.number, amount: d.amount })} onClose={close} onDone={() => toast(`Invoice ${sentVia} to ${first} again`)} />}
      {dialog === "cancel" && <CopyDialog copy={cancelInvoiceCopy(c, { number: d.number })} onClose={close} onDone={(v) => (setState((s) => ({ ...s, status: "canceled" })), toast(v === "quiet" ? `Canceled ${d.number}. ${first} was not notified.` : `Canceled ${d.number}. ${first} was ${sentVia} a notice.`))} />}
    </>
  )
}
