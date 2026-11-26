"use client"

import { useMemo, useState } from "react"
import { CircleDollarSign, Clock, Receipt, Send } from "lucide-react"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { TextLink } from "@/components/blocks/TextLink"
import { recordHref } from "@/components/blocks/record-preview-model"
import { useToast } from "@/components/blocks/Toast"
import { RowMore } from "@/components/blocks/RowMore"
import { CollectDialog } from "./CustomerDialogs"
import { CustomerText } from "./RecordChips"
import { ReminderDialog } from "./ReminderDialog"
import type { Reach } from "./confirm-copy"
import { INVOICE_PILL, INVOICE_STATUSES, invoiceTotals, sortInvoiceRows, type InvoiceListRow } from "./invoice-fixtures"
import { shortDate, money } from "@/lib/admin/format"

// Invoices, the primary nav item (docs/plans/2026-11-19-job-object-design.md, Hannah's rules of Nov 19 2026), in the shape of the Jobs grid: a
// summary band (Unpaid, Past due, Sent this month, Paid this month; each tile sets the Status filter, and a tile with nothing is plain), then
// one `DataGrid` with its one toolbar row (Status and Who as chips, search by number, name or street), past due first. One link a row (Hannah,
// Nov 25 2026: "Too many links"): the invoice's number is the row's link and the whole row opens the invoice; the customer and the job are plain
// text (the invoice's page links each once). A date or an amount never wraps. A row shows ONE action, Remind, while the invoice is out; Collect
// payment is under its More. Remind confirms with the exact text, Collect payment opens "How is this paid?"; a result is a toast. Pure props: the rows come in.

/** a row action: a quiet text link that never wraps (Remind) */
const ROW_ACTION = "whitespace-nowrap px-2 text-sm"

const reachOf = (r: InvoiceListRow): Reach => ({ first: r.customer.split(" ")[0]!, channel: "text", phone: "(970) 555-0123", email: `${r.customer.split(" ")[0]!.toLowerCase()}@example.com` })
const CARD: GridCardSlots = { line: ["customer", "jobName"], state: "status", when: ["datesText"], money: "amount", actions: "actions" }

type Preset = { key: string; filters: { column: string; values: string[] }[] }

function Actions({ row, onRemind, onCollect }: { row: InvoiceListRow; onRemind: (r: InvoiceListRow) => void; onCollect: (r: InvoiceListRow) => void }) {
  if (row.balance <= 0) return null
  return (
    <span className="flex flex-nowrap items-center justify-end gap-0.5">
      <TextLink weight="medium" className={ROW_ACTION} disabled={row.remindedToday} onClick={() => onRemind(row)}>
        {row.remindedToday ? "Reminded today" : "Remind"}
      </TextLink>
      <RowMore label={`More for ${row.number}`} items={[{ label: "Collect payment", onSelect: () => onCollect(row) }]} />
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
        meta: { href: (r) => recordHref.invoice((r as InvoiceListRow).id), csv: (r) => (r as InvoiceListRow).number },
        cell: ({ row: { original: r } }) => <span className="whitespace-nowrap">{r.number}</span>,
      },
      { id: "customer", accessorFn: (r) => r.customer, header: "Customer", cell: ({ row: { original: r } }) => <CustomerText name={r.customer} doNotService={r.doNotService} /> },
      { id: "jobName", accessorFn: (r) => r.jobName, header: "Job" },
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
        hiddenColumns={["datesText", "who"]}
        rowOpens
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
