"use client"

import { useMemo, useState } from "react"
import { Banknote, CreditCard, FileCheck, Smartphone, Undo2, type LucideIcon } from "lucide-react"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { ActionLine, RowActions, type RowActionsSpec } from "./BillingActions"
import { groupRefunds, invoiceDetail, invoiceListRows, refundDetail, type InvoiceListRow, type InvoiceRowData, type PaymentMethod, type PaymentRowData } from "./billing-model"
import { ConfirmDialog } from "./ConfirmDialog"
import { DataGrid, type GridColumnDef } from "./DataGrid"
import type { GridCardSlots } from "./DataGridCard"
import { RecordChip } from "./RecordChip"
import { StatusPill, type PillStatus } from "./StatusPill"
import { useMedia } from "./use-media"

// The two tables of a Billing card (Hannah, Nov 19 and 20 2026), on the Message table's own grid (`DataGrid` in a card: same header, same 56px
// row, same cards on a phone, no toolbar, no sort arrows under six rows). They fit the card they sit in: at most five columns.
// `InvoiceTable` is "Invoices and payments": an invoice that was paid is ONE row (the chip with how it was paid under it, the amount, the Paid
// pill, the buttons) and a refund of that payment is a grey negative row under it; an invoice still out is a row with Remind.
// `PaymentTable` is only the payments with no invoice (a check, Venmo, cash, a card charged directly), each with its refunds under it.
// Buttons are `RowActions`: icons with tooltips and labels on a laptop, a quiet line of words under the card on a phone. Pure props.

export type { InvoiceRowData, PaymentMethod, PaymentRowData } from "./billing-model"

const ICONS: Record<PaymentMethod, LucideIcon> = { card: CreditCard, check: FileCheck, venmo: Smartphone, cash: Banknote }
const QUIET = "block whitespace-normal text-xs text-muted-foreground"

function statusOf(r: PaymentRowData): { status: PillStatus; label: string } {
  if (r.refund) return { status: "cancelled", label: "Refunded" }
  if (r.failed) return { status: "failed", label: "Failed" }
  return { status: "paid", label: "Paid" }
}

/** The quiet line under a payment: when it was recorded, then the reference or who recorded it. */
const paymentDetail = (r: PaymentRowData) => `${shortDate(r.at, TIME_ZONE)} · ${r.reference ?? r.by}`

const paymentSpec = (row: PaymentRowData, onRefund?: (row: PaymentRowData) => void): RowActionsSpec => ({
  receiptHref: row.receiptHref,
  stripeHref: row.stripeHref,
  ...(row.canRefund && onRefund ? { refund: { amount: row.amount, onRefund: () => onRefund(row) } } : {}),
})

/** The job chip under the method on a laptop; on a phone it moves to the line under the card (a card is one button). */
function MethodJob({ job }: { job: React.ReactNode }) {
  return useMedia("(max-width: 767px)") ? null : <span className="block">{job}</span>
}

/** Both tables of a card give Amount, Status and the buttons the same width, so the two line up under each other. */
const AMOUNT = "w-20"
const STATUS = "w-[120px]"
const ACTIONS = "w-36"
const PAYMENT_CARD: GridCardSlots = { title: "label", line: ["detail"], state: "status", money: "amount", actions: "actions" }
const INVOICE_CARD: GridCardSlots = { title: "label", line: ["detail"], state: "status", money: "amount", actions: "actions" }

export function PaymentTable({ rows, onRefund }: { rows: PaymentRowData[]; onRefund?: (row: PaymentRowData) => void }) {
  const [open, setOpen] = useState<PaymentRowData | null>(null)
  const columns = useMemo<GridColumnDef<PaymentRowData>[]>(
    () => [
      {
        id: "method",
        accessorKey: "methodLabel",
        header: "Method",
        meta: { bare: true },
        cell: ({ row }) => {
          const Icon = row.original.refund ? Undo2 : ICONS[row.original.method]
          return (
            <span className="flex min-w-0 items-start gap-1.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                <span className="block whitespace-normal">{row.original.refund ? `Refund of ${row.original.methodLabel}` : row.original.methodLabel}</span>
                <span className="block text-xs text-muted-foreground">{paymentDetail(row.original)}</span>
                {row.original.job && <MethodJob job={row.original.job} />}
              </span>
            </span>
          )
        },
      },
      { id: "label", accessorFn: (r) => (r.refund ? `Refund of ${r.methodLabel}` : r.methodLabel), header: "Payment" },
      { id: "detail", accessorFn: paymentDetail, header: "Detail" },
      { id: "amount", accessorKey: "amount", header: "Amount", meta: { align: "right", width: AMOUNT }, cell: ({ row }) => <span className={row.original.refund ? "text-muted-foreground" : "font-medium"}>{row.original.amount}</span> },
      { id: "status", accessorFn: (r) => statusOf(r).label, header: "Status", meta: { width: STATUS }, cell: ({ row }) => <StatusPill status={statusOf(row.original).status} label={statusOf(row.original).label} /> },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        meta: { width: ACTIONS },
        header: () => <span className="sr-only">Buttons</span>,
        cell: ({ row }) => <RowActions spec={paymentSpec(row.original, onRefund)} lead={row.original.job} />,
      },
    ],
    [onRefund],
  )
  // a refund sits right under its payment; the grid sorts only from six rows and a refund is a reason not to
  const grouped = rows.some((r) => r.refund)
  const data = useMemo(() => groupRefunds(rows), [rows])
  const cols = useMemo(() => (grouped ? columns.map((c) => ({ ...c, enableSorting: false })) : columns), [columns, grouped])
  return (
    <div data-slot="payment-table">
      <DataGrid columns={cols} card={PAYMENT_CARD} data={data} getRowId={(r) => r.id} onOpen={setOpen} toolbar={false} inCard hiddenColumns={["label", "detail"]} pageSize={10} emptyTitle="No payments yet" emptyLine="Every payment and refund on this job shows here." />
      <ConfirmDialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={open ? `${open.refund ? "Refund" : "Payment"}, ${shortDate(open.at, TIME_ZONE)}` : "Payment"} actions="none" size="md" slot="payment-dialog">
        {open && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {open.amount} by {open.methodLabel}, recorded by {open.by}.
            </p>
            <ActionLine spec={paymentSpec(open, onRefund && ((r) => (setOpen(null), onRefund(r))))} lead={open.job} />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}

const hrefOf = (i: InvoiceRowData) => i.href ?? `/admin/invoices?invoice=${i.id}`
const invoiceSpec = (i: InvoiceRowData, onRemind?: (row: InvoiceRowData) => void, onRefund?: (row: PaymentRowData) => void): RowActionsSpec => ({
  ...(i.canRemind && onRemind && !i.paidBy ? { onRemind: () => onRemind(i) } : {}),
  ...(i.paidBy ? paymentSpec(i.paidBy, onRefund) : {}),
  invoiceHref: hrefOf(i),
})
const rowSpec = (r: InvoiceListRow, onRemind?: (row: InvoiceRowData) => void, onRefund?: (row: PaymentRowData) => void): RowActionsSpec =>
  r.kind === "invoice" ? invoiceSpec(r.invoice, onRemind, onRefund) : { receiptHref: r.payment.receiptHref }
const rowLabel = (r: InvoiceListRow) => (r.kind === "invoice" ? r.invoice.number : `Refund of ${r.payment.methodLabel}`)
const rowDetail = (r: InvoiceListRow) => (r.kind === "invoice" ? invoiceDetail(r.invoice) : refundDetail(r.payment))
const rowStatus = (r: InvoiceListRow): { status: PillStatus; label?: string } => (r.kind === "invoice" ? { status: r.invoice.status, label: r.invoice.statusLabel } : { status: "cancelled", label: "Refunded" })

export function InvoiceTable({ rows, onRemind, onRefund }: { rows: InvoiceRowData[]; onRemind?: (row: InvoiceRowData) => void; onRefund?: (row: PaymentRowData) => void }) {
  const [open, setOpen] = useState<InvoiceListRow | null>(null)
  const data = useMemo(() => invoiceListRows(rows), [rows])
  const columns = useMemo<GridColumnDef<InvoiceListRow>[]>(
    () => [
      {
        id: "number",
        accessorFn: rowLabel,
        header: "Invoice",
        enableSorting: false,
        meta: { bare: true },
        cell: ({ row: { original: r } }) =>
          r.kind === "refund" ? (
            <span className="flex min-w-0 items-start gap-1.5">
              <Undo2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                <span className="block whitespace-normal text-muted-foreground">{rowLabel(r)}</span>
                <span className={QUIET}>{rowDetail(r)}</span>
              </span>
            </span>
          ) : (
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <RecordChip kind="invoice" name={r.invoice.number} href={hrefOf(r.invoice)} className="text-sm font-medium md:min-h-8" />
              <span className={QUIET}>{rowDetail(r)}</span>
              {r.invoice.note && <span className={QUIET}>{r.invoice.note}</span>}
            </span>
          ),
      },
      { id: "label", accessorFn: rowLabel, header: "Invoice number", enableSorting: false },
      { id: "detail", accessorFn: rowDetail, header: "Detail", enableSorting: false },
      { id: "amount", accessorFn: (r) => (r.kind === "invoice" ? r.invoice.amount : r.payment.amount), header: "Amount", enableSorting: false, meta: { align: "right", width: AMOUNT }, cell: ({ row: { original: r } }) => <span className={r.kind === "refund" ? "text-muted-foreground" : "font-medium"}>{r.kind === "invoice" ? r.invoice.amount : r.payment.amount}</span> },
      { id: "status", accessorFn: (r) => rowStatus(r).label ?? rowStatus(r).status, header: "Status", enableSorting: false, meta: { width: STATUS }, cell: ({ row: { original: r } }) => <StatusPill status={rowStatus(r).status} label={rowStatus(r).label} /> },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        meta: { width: ACTIONS },
        header: () => <span className="sr-only">Buttons</span>,
        cell: ({ row: { original: r } }) => <RowActions spec={rowSpec(r, onRemind, onRefund)} />,
      },
    ],
    [onRemind, onRefund],
  )
  const note = open?.kind === "invoice" ? open.invoice.note : undefined
  return (
    <div data-slot="invoice-table">
      <DataGrid columns={columns} card={INVOICE_CARD} data={data} getRowId={(r) => r.id} onOpen={setOpen} toolbar={false} inCard hiddenColumns={["label", "detail"]} pageSize={10} emptyTitle="No invoices yet" emptyLine="Every invoice sent for this job shows here." />
      <ConfirmDialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={open ? (open.kind === "invoice" ? `Invoice ${open.invoice.number}` : "Refund") : "Invoice"} actions="none" size="md" slot="invoice-dialog">
        {open && (
          <div className="flex flex-col gap-3 text-sm">
            <p>{open.kind === "invoice" ? `${open.invoice.amount}, sent ${open.invoice.sent}, due ${open.invoice.due}. ${open.invoice.paidBy ? invoiceDetail(open.invoice) + "." : ""}` : `${open.payment.amount}. ${refundDetail(open.payment)}.`}</p>
            <ActionLine spec={rowSpec(open, onRemind && ((i) => (setOpen(null), onRemind(i))), onRefund && ((p) => (setOpen(null), onRefund(p))))} lead={note} />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
