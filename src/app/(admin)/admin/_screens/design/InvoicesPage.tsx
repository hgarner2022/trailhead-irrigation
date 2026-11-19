"use client"

import { useMemo, useState } from "react"
import { CircleDollarSign, Clock, Receipt, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, type DataTableColumn } from "@/components/blocks/DataTable"
import { EmptyState } from "@/components/blocks/EmptyState"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { CollectDialog } from "./CustomerDialogs"
import { InvoiceChip, JobChip, CustomerChip, useRowOpen } from "./RecordChips"
import { ReminderDialog } from "./InvoiceReminderDialog"
import { INVOICE_PILL, INVOICE_STATUSES, dayWords, invoiceTotals, money, sortInvoiceRows, type InvoiceListRow, type InvoiceStatus } from "./invoice-fixtures"

// Invoices, the primary nav item (docs/plans/2026-11-19-job-object-design.md, Hannah's rules of Nov 19 2026): a summary band (Unpaid, Past due,
// Sent this month, Paid this month; each tile filters the table, and a tile with nothing is plain), then one table of every invoice, past due
// first: the invoice, the customer and the job as chips, the amount, the days, the status pill and the row's own actions (Remind and Collect
// payment while it is unpaid, Open always). Filters by Status and Who, search by number, name or street. Remind confirms with the exact text,
// Collect payment opens "How is this paid?"; a result is a toast. The whole row opens the invoice. Pure props: the rows come in.

const STATUS_ALL = "all"
type StatusFilter = typeof STATUS_ALL | InvoiceStatus | "unpaid"
const SELECT = "min-h-11 rounded-lg border border-input bg-background px-3 text-sm"

const contactOf = (r: InvoiceListRow) => ({ first: r.customer.split(" ")[0]!, channel: "text" as const, phone: "(970) 555-0123", email: `${r.customer.split(" ")[0]!.toLowerCase()}@example.com` })

export interface InvoicesPageProps {
  rows: InvoiceListRow[]
  /** filters set on first render, for the no-match story */
  initialStatus?: StatusFilter
  initialQuery?: string
}

export function InvoicesPage({ rows, initialStatus = STATUS_ALL, initialQuery = "" }: InvoicesPageProps) {
  const toast = useUndoToast()
  const open = useRowOpen()
  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const [who, setWho] = useState("all")
  const [query, setQuery] = useState(initialQuery)
  const [remind, setRemind] = useState<InvoiceListRow | null>(null)
  const [collect, setCollect] = useState<InvoiceListRow | null>(null)
  const t = invoiceTotals(rows)
  const people = [...new Set(rows.map((r) => r.who))].sort()
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortInvoiceRows(rows).filter((r) => (status === STATUS_ALL ? true : status === "unpaid" ? r.balance > 0 : r.status === status) && (who === "all" || r.who === who) && (!q || `${r.number} ${r.customer} ${r.street}`.toLowerCase().includes(q)))
  }, [rows, status, who, query])

  const tile = (label: string, value: string, sub: string, icon: typeof Receipt, to: StatusFilter, any: boolean, alert = false) => ({ label, value, sub, icon, tone: alert && any ? ("alert" as const) : ("plain" as const), ...(any ? { onClick: () => setStatus(to) } : {}) })
  const band = [
    tile("Unpaid", money(t.unpaid.total), `${t.unpaid.count} ${t.unpaid.count === 1 ? "invoice" : "invoices"} out`, Receipt, "unpaid", t.unpaid.count > 0),
    tile("Past due", money(t.pastDue.total), t.pastDue.count ? `${t.pastDue.count} ${t.pastDue.count === 1 ? "invoice" : "invoices"}` : "Nothing past due", Clock, "past-due", t.pastDue.count > 0, true),
    tile("Sent this month", money(t.sent.total), `${t.sent.count} ${t.sent.count === 1 ? "invoice" : "invoices"} in November`, Send, STATUS_ALL, t.sent.count > 0),
    tile("Paid this month", money(t.paid.total), `${t.paid.count} ${t.paid.count === 1 ? "invoice" : "invoices"} paid`, CircleDollarSign, "paid", t.paid.count > 0),
  ]

  const amount = (r: InvoiceListRow) => <span className="tabular-nums">{money(r.amount)}</span>
  const pill = (r: InvoiceListRow) => <StatusPill status={INVOICE_PILL[r.status].pill} label={INVOICE_PILL[r.status].label} />
  const chip = (r: InvoiceListRow) => <InvoiceChip id={r.id} number={r.number} customer={r.customer} status={INVOICE_PILL[r.status].pill} statusLabel={INVOICE_PILL[r.status].label} total={money(r.amount)} balance={money(r.balance)} due={dayWords(r.dueOn)} />
  const actions = (r: InvoiceListRow) => (
    <span className="flex flex-wrap items-center justify-end gap-1">
      {r.balance > 0 && (
        <>
          <Button type="button" variant="outline" className="min-h-11" disabled={r.remindedToday} onClick={() => setRemind(r)}>
            {r.remindedToday ? "Reminded today" : "Remind"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setCollect(r)}>
            Collect payment
          </Button>
        </>
      )}
      <Button type="button" variant="ghost" className="min-h-11 text-primary-dark" onClick={() => open(r.number)}>
        Open
      </Button>
    </span>
  )
  const columns: DataTableColumn<InvoiceListRow>[] = [
    { id: "number", header: "Invoice", cell: chip },
    { id: "customer", header: "Customer", cell: (r) => <CustomerChip id={r.customerId} name={r.customer} address={r.street} unpaid={money(r.balance)} /> },
    { id: "job", header: "Job", cell: (r) => <JobChip id={r.jobId} name={r.jobName} customer={r.customer} status="done" total={money(r.amount)} /> },
    { id: "amount", header: "Amount", align: "right", cell: amount },
    { id: "sent", header: "Sent", cell: (r) => dayWords(r.sentOn) },
    { id: "due", header: "Due", cell: (r) => dayWords(r.dueOn) },
    { id: "status", header: "Status", cell: pill },
    { id: "actions", header: "Actions", hideHeader: true, align: "right", cell: actions },
  ]

  const ctx = rows.length ? `${t.unpaid.count} out, ${money(t.unpaid.total)} unpaid.` : "No invoices yet."
  return (
    <div data-slot="invoices-page" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
      <PageHeader title="Invoices" context={ctx} />
      <SummaryBand items={band} />
      <SectionCard flush>
        <div data-slot="invoice-filters" className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={SELECT}>
            <option value={STATUS_ALL}>Status: all</option>
            <option value="unpaid">Unpaid</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{INVOICE_PILL[s].label}</option>
            ))}
          </select>
          <select aria-label="Who" value={who} onChange={(e) => setWho(e.target.value)} className={SELECT}>
            <option value="all">Who: everyone</option>
            {people.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <Input type="search" aria-label="Search invoices" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by number, name or street" className="min-h-11 min-w-0 flex-1 basis-56" />
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No invoices yet" line="An invoice shows here when a done job is sent to be paid." />
        ) : shown.length === 0 ? (
          <EmptyState title="No invoices match." line="Change the filters or the search." action={<Button type="button" variant="outline" className="min-h-11" onClick={() => (setStatus(STATUS_ALL), setWho("all"), setQuery(""))}>Clear filters</Button>} />
        ) : (
          <DataTable
            label="Invoices"
            columns={columns}
            rows={shown}
            getKey={(r) => r.id}
            onOpen={(r) => open(r.number)}
            card={(r) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  {chip(r)}
                  {pill(r)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <CustomerChip id={r.customerId} name={r.customer} address={r.street} unpaid={money(r.balance)} />
                  {amount(r)}
                </div>
                <JobChip id={r.jobId} name={r.jobName} customer={r.customer} status="done" total={money(r.amount)} />
                <span className="text-sm text-muted-foreground">Sent {dayWords(r.sentOn)}, due {dayWords(r.dueOn)}</span>
                {actions(r)}
              </div>
            )}
          />
        )}
      </SectionCard>
      {remind && <ReminderDialog who={contactOf(remind)} invoice={{ number: remind.number, amount: money(remind.amount), service: remind.jobName.toLowerCase(), dueOn: dayWords(remind.dueOn), pastDue: remind.status === "past-due" }} onClose={() => setRemind(null)} onSend={() => toast(`Reminder texted to ${remind.customer.split(" ")[0]}`)} />}
      {collect && <CollectDialog who={contactOf(collect)} amount={collect.balance} card={{ brand: "Visa", last4: "4242" }} invoice={{ number: collect.number, jobName: collect.jobName, amount: money(collect.balance) }} onClose={() => setCollect(null)} />}
    </div>
  )
}
