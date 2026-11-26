"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CircleDollarSign, Clock, FileText, Receipt, Send } from "lucide-react"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { recordHref } from "@/components/blocks/record-preview-model"
import { useToast } from "@/components/blocks/Toast"
import { useMedia } from "@/components/blocks/use-media"
import { CollectDialog } from "./CustomerDialogs"
import { CustomerChip, InvoiceChip, JobChip, useRowOpen } from "./RecordChips"
import { ReminderDialog } from "./ReminderDialog"
import type { Reach } from "./confirm-copy"
import { INVOICE_PILL, INVOICE_STATUSES, invoiceTotals, sortInvoiceRows, type InvoiceListRow } from "./invoice-fixtures"
import { shortDate, money } from "@/lib/admin/format"

// Invoices, the primary nav item (docs/plans/2026-11-19-job-object-design.md, Hannah's rules of Nov 19 2026), in the shape of the Jobs grid: a
// summary band (Unpaid, Past due, Sent this month, Paid this month; each tile sets the Status filter, and a tile with nothing is plain), then
// one `DataGrid` with its one toolbar row (Status and Who as chips, search by number, name or street), past due first. The invoice, the
// customer and the job are chips; a date or an amount never wraps; the row's actions are on one line, Remind and Collect payment as quiet text
// buttons and Open as an icon, and the invoice chip opens the invoice. Remind confirms with the exact text, Collect payment opens "How is this
// paid?"; a result is a toast. Pure props: the rows come in.

const TEXT_BUTTON = "inline-flex min-h-11 items-center whitespace-nowrap rounded-sm px-2 text-sm font-medium text-primary-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground disabled:no-underline"
const ICON_LINK = "inline-flex size-11 items-center justify-center rounded-sm text-primary-dark hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const reachOf = (r: InvoiceListRow): Reach => ({ first: r.customer.split(" ")[0]!, channel: "text", phone: "(970) 555-0123", email: `${r.customer.split(" ")[0]!.toLowerCase()}@example.com` })
const CARD: GridCardSlots = { title: "label", line: ["customerText", "jobText"], state: "status", when: ["datesText"], money: "amount", actions: "actions" }

type Preset = { key: string; filters: { column: string; values: string[] }[] }

function Actions({ row, onRemind, onCollect }: { row: InvoiceListRow; onRemind: (r: InvoiceListRow) => void; onCollect: (r: InvoiceListRow) => void }) {
  const phone = useMedia("(max-width: 767px)")
  const href = recordHref.invoice(row.id)
  return (
    <span className="flex flex-nowrap items-center justify-end gap-0.5">
      {row.balance > 0 && (
        <>
          <button type="button" className={TEXT_BUTTON} disabled={row.remindedToday} onClick={() => onRemind(row)}>
            {row.remindedToday ? "Reminded today" : "Remind"}
          </button>
          <button type="button" className={TEXT_BUTTON} onClick={() => onCollect(row)}>
            Collect payment
          </button>
        </>
      )}
      {phone ? (
        <Link href={href} className={TEXT_BUTTON}>
          Open invoice
        </Link>
      ) : (
        <Link href={href} aria-label="Open invoice" title="Open invoice" className={ICON_LINK}>
          <FileText className="size-4" aria-hidden />
        </Link>
      )}
    </span>
  )
}

export interface InvoicesPageProps {
  rows: InvoiceListRow[]
  /** filter chips set on first render (the no-match story) */
  initialFilters?: { column: string; values: string[] }[]
}

export function InvoicesPage({ rows, initialFilters = [] }: InvoicesPageProps) {
  const toast = useToast()
  const open = useRowOpen()
  const [preset, setPreset] = useState<Preset>({ key: "all", filters: initialFilters })
  const [remind, setRemind] = useState<InvoiceListRow | null>(null)
  const [collect, setCollect] = useState<InvoiceListRow | null>(null)
  const t = invoiceTotals(rows)
  const data = useMemo(() => sortInvoiceRows(rows), [rows])
  const people = useMemo(() => [...new Set(rows.map((r) => r.who))].sort().map((w) => ({ value: w, label: w })), [rows])

  const columns = useMemo<GridColumnDef<InvoiceListRow>[]>(
    () => [
      {
        id: "number",
        accessorFn: (r) => `${r.number} ${r.customer} ${r.street}`,
        header: "Invoice",
        meta: { bare: true, csv: (r) => (r as InvoiceListRow).number },
        cell: ({ row: { original: r } }) => <InvoiceChip table id={r.id} number={r.number} customer={r.customer} status={INVOICE_PILL[r.status].pill} statusLabel={INVOICE_PILL[r.status].label} total={money(r.amount)} balance={money(r.balance)} due={shortDate(r.dueOn)} />,
      },
      { id: "label", accessorFn: (r) => r.number, header: "Invoice number" },
      { id: "jobText", accessorFn: (r) => r.jobName, header: "Job name" },
      { id: "customerText", accessorFn: (r) => r.customer, header: "Customer name" },
      { id: "customer", accessorFn: (r) => r.customer, header: "Customer", cell: ({ row: { original: r } }) => <CustomerChip table doNotService={r.doNotService} id={r.customerId} name={r.customer} address={r.street} unpaid={money(r.balance)} /> },
      { id: "jobName", accessorFn: (r) => r.jobName, header: "Job", cell: ({ row: { original: r } }) => <JobChip table id={r.jobId} name={r.jobName} customer={r.customer} status="done" total={money(r.amount)} /> },
      { id: "amount", accessorFn: (r) => r.amount, header: "Amount", meta: { align: "right", csv: (r) => String((r as InvoiceListRow).amount) }, cell: ({ row: { original: r } }) => money(r.amount) },
      { id: "datesText", accessorFn: (r) => `Sent ${shortDate(r.sentOn)}, due ${shortDate(r.dueOn)}`, header: "Sent and due" },
      { id: "due", accessorFn: (r) => r.dueOn, header: "Due", cell: ({ row: { original: r } }) => shortDate(r.dueOn) },
      { id: "status", accessorFn: (r) => r.status, header: "Status", meta: { csv: (r) => INVOICE_PILL[(r as InvoiceListRow).status].label }, cell: ({ row: { original: r } }) => <StatusPill status={INVOICE_PILL[r.status].pill} label={INVOICE_PILL[r.status].label} /> },
      { id: "who", accessorFn: (r) => r.who, header: "Who" },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Buttons</span>,
        cell: ({ row: { original: r } }) => <Actions row={r} onRemind={setRemind} onCollect={setCollect} />,
      },
    ],
    [],
  )

  const tile = (label: string, value: string, sub: string, icon: typeof Receipt, key: string, values: string[] | null, any: boolean, alert = false) => ({
    label,
    value,
    sub,
    icon,
    tone: alert && any ? ("alert" as const) : ("plain" as const),
    ...(any ? { onClick: () => setPreset({ key, filters: values ? [{ column: "status", values }] : [] }) } : {}),
  })
  const plural = (n: number) => `${n} ${n === 1 ? "invoice" : "invoices"}`
  const band = [
    tile("Unpaid", money(t.unpaid.total), `${plural(t.unpaid.count)} out`, Receipt, "unpaid", ["sent", "past-due"], t.unpaid.count > 0),
    tile("Past due", money(t.pastDue.total), t.pastDue.count ? plural(t.pastDue.count) : "Nothing past due", Clock, "past-due", ["past-due"], t.pastDue.count > 0, true),
    tile("Sent this month", money(t.sent.total), `${plural(t.sent.count)} in November`, Send, "sent-month", null, t.sent.count > 0),
    tile("Paid this month", money(t.paid.total), `${plural(t.paid.count)} paid`, CircleDollarSign, "paid", ["paid"], t.paid.count > 0),
  ]

  return (
    <div data-slot="invoices-page" className="flex flex-col gap-4">
      <PageHeader title="Invoices" context={rows.length ? `${t.unpaid.count} out, ${money(t.unpaid.total)} unpaid.` : "No invoices yet."} />
      <SummaryBand items={band} />
      <DataGrid
        key={preset.key}
        columns={columns}
        card={CARD}
        data={data}
        getRowId={(r) => r.id}
        search={{ column: "number", placeholder: "Search by number, name or street" }}
        filters={[
          { column: "status", label: "Status", options: INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_PILL[s].label })) },
          { column: "who", label: "Who", options: people },
        ]}
        defaultFilters={preset.filters}
        hiddenColumns={["label", "customerText", "jobText", "datesText", "who"]}
        onOpen={(r) => open(r.number)}
        exportName="invoices"
        pageSize={25}
        noMatchTitle="No invoices match."
        emptyTitle="No invoices yet"
        emptyLine="An invoice shows here when a done job is sent to be paid."
      />
      {remind && <ReminderDialog who={reachOf(remind)} invoice={{ number: remind.number, amount: money(remind.amount), service: remind.jobName.toLowerCase(), dueOn: shortDate(remind.dueOn), pastDue: remind.status === "past-due" }} onClose={() => setRemind(null)} onSend={() => toast(`Reminder texted to ${remind.customer.split(" ")[0]}`)} />}
      {collect && <CollectDialog who={reachOf(collect)} amount={collect.balance} card={{ brand: "Visa", last4: "4242" }} invoice={{ number: collect.number, jobName: collect.jobName, amount: money(collect.balance) }} onClose={() => setCollect(null)} />}
    </div>
  )
}
