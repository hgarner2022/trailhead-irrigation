"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ExternalLink, Mail, MessageSquare } from "lucide-react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { DataTable, type DataTableColumn } from "@/components/blocks/DataTable"
import { KIND_NAMES, isTrouble, statusWords } from "@/components/blocks/MessageThread"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { StatusPill } from "@/components/blocks/StatusPill"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import type { Message } from "@/lib/admin/types"
import { DayChip, InvoiceChip, JobChip, PaymentChip, PersonChip, useRowOpen } from "./RecordChips"
import type { CustomerInvoiceRow, CustomerJobRow, CustomerPaymentRow } from "./customer-fixtures"

// The four tables on a customer's page (Hannah, Nov 19 2026), all on `DataTable`: Jobs, Invoices, Payments and Messages. Every table has the same
// light header, 56px rows and 20px gutters; a row opens its record as a whole and the chips inside open their own. Open work sorts first and
// each group is newest first. Money words are only Paid, Unpaid, Invoice sent, Past due and Failed. Pure props over the fixtures.

const QUIET = "block text-xs text-muted-foreground"
const STRIPE = "inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

/** Open jobs on top, then each group newest first. */
export const sortJobs = (rows: readonly CustomerJobRow[]): CustomerJobRow[] => [...rows].sort((a, b) => Number(b.open) - Number(a.open) || b.sortDay.localeCompare(a.sortDay))
/** Invoices still out first (Past due, then sent), then the paid and canceled, newest first. */
export const sortInvoices = (rows: readonly CustomerInvoiceRow[]): CustomerInvoiceRow[] => {
  const rank = (r: CustomerInvoiceRow) => (r.status === "overdue" ? 0 : r.status === "bill-sent" ? 1 : 2)
  return [...rows].sort((a, b) => rank(a) - rank(b) || b.sortDay.localeCompare(a.sortDay))
}
export const sortPayments = (rows: readonly CustomerPaymentRow[]): CustomerPaymentRow[] => [...rows].sort((a, b) => b.sortDay.localeCompare(a.sortDay))

const Money = ({ row }: { row: CustomerJobRow }) => (
  <span className="block">
    <MoneyCell text={row.money?.word ?? null} tone={row.money?.tone} />
    {(row.money?.note || row.note) && <span className={QUIET}>{row.money?.note ?? row.note}</span>}
  </span>
)

const Who = ({ who, day }: { who?: string; day?: CustomerJobRow["day"] }) => (who ? <PersonChip table name={who} stopsToday={day?.stops ?? 0} /> : <span className="text-muted-foreground">No one yet</span>)

function JobDay({ row }: { row: CustomerJobRow }) {
  if (!row.day) return <span className="text-muted-foreground">No day yet</span>
  return (
    <span className="block">
      <DayChip table iso={row.day.iso} label={row.day.label} stops={row.day.stops} who={row.who ?? "No one yet"} />
      <span className={`${QUIET} -mt-1 pl-8`}>{row.day.time}</span>
    </span>
  )
}

export function JobsTable({ rows, customer }: { rows: readonly CustomerJobRow[]; customer: string }) {
  const open = useRowOpen()
  const job = (r: CustomerJobRow) => <JobChip table id={r.id} name={r.name} customer={customer} status={r.status} next={r.day ? `${r.day.label}, ${r.day.time}` : undefined} />
  const columns: DataTableColumn<CustomerJobRow>[] = [
    { id: "job", header: "Job", cell: job },
    { id: "day", header: "Day", cell: (r) => <JobDay row={r} /> },
    { id: "who", header: "Who", cell: (r) => <Who who={r.who} day={r.day} /> },
    { id: "status", header: "Status", cell: (r) => <StatusPill status={r.status} label={r.statusLabel} /> },
    { id: "billing", header: "Billing", cell: (r) => <Money row={r} /> },
  ]
  return (
    <DataTable
      label="Jobs"
      columns={columns}
      rows={sortJobs(rows)}
      getKey={(r) => r.id}
      onOpen={(r) => open(r.name)}
      searchText={(r) => `${r.name} ${r.statusLabel} ${r.who ?? ""}`}
      card={(r) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            {job(r)}
            <StatusPill status={r.status} label={r.statusLabel} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            <JobDay row={r} />
            <Who who={r.who} day={r.day} />
          </div>
          <Money row={r} />
        </div>
      )}
    />
  )
}

export function InvoicesTable({ rows, customer }: { rows: readonly CustomerInvoiceRow[]; customer: string }) {
  const open = useRowOpen()
  const invoice = (r: CustomerInvoiceRow) => <InvoiceChip table id={r.id} number={r.number} customer={customer} status={r.status} statusLabel={r.statusLabel} total={r.amount} balance={r.status === "paid" ? "$0" : r.amount} due={r.due} />
  const columns: DataTableColumn<CustomerInvoiceRow>[] = [
    { id: "invoice", header: "Invoice", cell: invoice },
    { id: "job", header: "Job", cell: (r) => <JobChip table id={r.jobId} name={r.jobName} customer={customer} /> },
    { id: "sent", header: "Sent", cell: (r) => r.sent },
    { id: "due", header: "Due", cell: (r) => r.due },
    { id: "amount", header: "Amount", align: "right", cell: (r) => r.amount },
    { id: "status", header: "Status", cell: (r) => <StatusPill status={r.status} label={r.statusLabel} /> },
  ]
  return (
    <DataTable
      label="Invoices"
      columns={columns}
      rows={sortInvoices(rows)}
      getKey={(r) => r.id}
      onOpen={(r) => open(r.number)}
      card={(r) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            {invoice(r)}
            <StatusPill status={r.status} label={r.statusLabel} />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <JobChip table id={r.jobId} name={r.jobName} customer={customer} />
            <span className="tabular-nums">{r.amount}</span>
          </div>
          <span className="text-sm text-muted-foreground">Sent {r.sent}, due {r.due}</span>
        </div>
      )}
    />
  )
}

const StripeLink = ({ url }: { url?: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className={STRIPE}>
      Open in Stripe
      <ExternalLink className="size-3.5" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : null

export function PaymentsTable({ rows, customer, omitJob }: { rows: readonly CustomerPaymentRow[]; customer: string; omitJob?: boolean }) {
  const open = useRowOpen()
  const receipt = (r: CustomerPaymentRow) => <PaymentChip table id={r.id} receipt={r.receipt} />
  const columns: DataTableColumn<CustomerPaymentRow>[] = [
    { id: "receipt", header: "Receipt", cell: receipt },
    { id: "date", header: "Date", cell: (r) => r.date },
    ...(omitJob ? [] : [{ id: "job", header: "Job", cell: (r: CustomerPaymentRow) => <JobChip table id={r.jobId} name={r.jobName} customer={customer} /> }]),
    { id: "how", header: "How", cell: (r) => r.how },
    { id: "amount", header: "Amount", align: "right", cell: (r) => r.amount },
    { id: "stripe", header: "Stripe", hideHeader: true, cell: (r) => <StripeLink url={r.stripeUrl} /> },
  ]
  return (
    <DataTable
      label="Payments"
      columns={columns}
      rows={sortPayments(rows)}
      getKey={(r) => r.id}
      onOpen={(r) => open(`Receipt ${r.receipt}`)}
      card={(r) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            {receipt(r)}
            <span className="font-medium tabular-nums">{r.amount}</span>
          </div>
          <div className="text-sm text-muted-foreground">{r.date}, {r.how}</div>
          {!omitJob && <JobChip table id={r.jobId} name={r.jobName} customer={customer} />}
          <StripeLink url={r.stripeUrl} />
        </div>
      )}
    />
  )
}

interface MessageRow {
  id: string
  at: string
  date: string
  title: string
  preview: string
  channel: Message["channel"]
  to: string
  pill: "failed" | "active" | "pending"
  words: string
  message: Message
}

const firstLine = (body: string) => body.split("\n")[0] ?? body

/** Everything the app sent the customer, newest first, as the same table as the rest; a row opens the whole message. */
export function MessagesTable({ messages, to }: { messages: readonly Message[]; to: { sms: string; email: string } }) {
  const [shown, setShown] = useState<MessageRow | null>(null)
  const rows = useMemo<MessageRow[]>(
    () => [...messages].sort((a, b) => b.at.localeCompare(a.at)).map((m) => ({ id: m.id, at: m.at, date: shortDate(m.at, TIME_ZONE), title: KIND_NAMES[m.kind], preview: firstLine(m.body), channel: m.channel, to: m.channel === "sms" ? to.sms : to.email, pill: isTrouble(m) ? "failed" : m.status === "delivered" ? "active" : "pending", words: statusWords(m), message: m })),
    [messages, to.sms, to.email],
  )
  const channel = (r: MessageRow): ReactNode => {
    const Icon = r.channel === "sms" ? MessageSquare : Mail
    return (
      <span className="inline-flex items-center gap-1.5">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {r.channel === "sms" ? "Text" : "Email"}
      </span>
    )
  }
  const what = (r: MessageRow) => (
    <span className="block min-w-0 max-w-[28ch]">
      <span className="block font-medium">{r.title}</span>
      <span className="block truncate text-muted-foreground" title={r.preview}>{r.preview}</span>
    </span>
  )
  const columns: DataTableColumn<MessageRow>[] = [
    { id: "date", header: "Date", cell: (r) => r.date },
    { id: "message", header: "Message", cell: what },
    { id: "channel", header: "Channel", cell: channel },
    { id: "to", header: "To", cell: (r) => r.to },
    { id: "status", header: "Status", cell: (r) => <StatusPill status={r.pill} label={r.words} /> },
  ]
  return (
    <>
      <DataTable
        label="Messages"
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        onOpen={setShown}
        searchText={(r) => `${r.title} ${r.preview}`}
        card={(r) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{r.title}</span>
              <StatusPill status={r.pill} label={r.words} />
            </div>
            <span className="truncate text-sm text-muted-foreground">{r.preview}</span>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              {channel(r)}
              <span aria-hidden>·</span>
              {r.date}
            </span>
          </div>
        )}
      />
      <ConfirmDialog open={shown !== null} onOpenChange={(o) => !o && setShown(null)} title={shown?.title ?? "Message"} actions="none" size="md" slot="message-dialog">
        {shown && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              {shown.channel === "sms" ? "Text" : "Email"} to {shown.to} · {shown.date} · {shown.words}
            </p>
            <p className="whitespace-pre-wrap rounded-lg bg-stone p-3">{shown.message.body}</p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
