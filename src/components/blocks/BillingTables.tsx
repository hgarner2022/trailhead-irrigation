"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Banknote, CreditCard, ExternalLink, FileCheck, MoreHorizontal, Smartphone, Undo2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { ConfirmDialog } from "./ConfirmDialog"
import { DataGrid, type GridColumnDef } from "./DataGrid"
import type { GridCardSlots } from "./DataGridCard"
import { RecordChip } from "./RecordChip"
import { StatusPill, type PillStatus } from "./StatusPill"

// The Payments and Invoices tables of a Billing section (Hannah, Nov 19 2026: "billing after a payment is lackluster"). They are the
// Message table's own grid (`DataGrid`: same header, same border, same cards on a phone), so the three tables on a job page look alike.
// Payments: Date, Method (a small icon and the words), Amount, Recorded by, Status (a dot pill), then the row's buttons: Receipt (our
// receipt page), Open in Stripe for a card payment (with the external-link icon) and More, where Refund lives. A refund is a negative row in
// grey and never a delete. Invoices: Invoice number, Amount, Sent, Due, Status, then Remind and Open invoice. A row's date or number opens
// its details in a dialog (the Message table's way); on a phone each row is a card that opens the same dialog. Pure props. Client component.

export type PaymentMethod = "card" | "check" | "venmo" | "cash"

export interface PaymentRowData {
  id: string
  /** ISO time the money was recorded */
  at: string
  method: PaymentMethod
  /** "Check #1042", "Visa ending 4242", "Venmo @andrea-d" */
  methodLabel: string
  /** "$145", or "-$145" for a refund */
  amount: string
  /** who recorded it: "Ryan", or "Andrea, online" */
  by: string
  /** a refund row: negative, grey, status Refunded; it has no buttons but Receipt */
  refund?: boolean
  failed?: boolean
  /** our receipt page for this payment */
  receiptHref: string
  /** the payment in Stripe's dashboard, a card payment only */
  stripeHref?: string
  /** Refund is offered under More while the payment has not been refunded */
  canRefund?: boolean
}

export interface InvoiceRowData {
  id: string
  /** "INV-2026-0001" */
  number: string
  amount: string
  /** "Nov 18" */
  sent: string
  /** "Dec 2" */
  due: string
  status: PillStatus
  statusLabel?: string
  /** the invoice's own page: `/admin/invoices?invoice=<id>` */
  href?: string
  /** a quiet line under the number: "Includes the visit report" */
  note?: string
  /** Remind is offered while the invoice is out and unpaid */
  canRemind?: boolean
}

const ICONS: Record<PaymentMethod, LucideIcon> = { card: CreditCard, check: FileCheck, venmo: Smartphone, cash: Banknote }
const LINK = "inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-primary-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

function statusOf(r: PaymentRowData): { status: PillStatus; label: string } {
  if (r.refund) return { status: "cancelled", label: "Refunded" }
  if (r.failed) return { status: "failed", label: "Failed" }
  return { status: "paid", label: "Paid" }
}

function PaymentActions({ row, onRefund }: { row: PaymentRowData; onRefund?: (row: PaymentRowData) => void }) {
  return (
    <span className="flex items-center justify-end gap-3">
      <Link href={row.receiptHref} className={LINK}>
        Receipt
      </Link>
      {row.stripeHref && (
        <a href={row.stripeHref} target="_blank" rel="noopener noreferrer" className={LINK}>
          Open in Stripe
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      {row.canRefund && onRefund && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`More for the ${row.amount} payment`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => onRefund(row)}>
              <Undo2 aria-hidden /> Refund {row.amount}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </span>
  )
}

const PAYMENT_CARD: GridCardSlots = { title: "date", line: ["method"], state: "status", when: ["by"], money: "amount" }
const INVOICE_CARD: GridCardSlots = { title: "label", line: ["amount"], state: "status", when: ["sent", "due"] }

export function PaymentTable({ rows, onRefund }: { rows: PaymentRowData[]; onRefund?: (row: PaymentRowData) => void }) {
  const [open, setOpen] = useState<PaymentRowData | null>(null)
  const columns = useMemo<GridColumnDef<PaymentRowData>[]>(
    () => [
      { id: "date", accessorKey: "at", header: "Date", cell: ({ row }) => shortDate(row.original.at, TIME_ZONE), meta: { csv: (r) => shortDate((r as PaymentRowData).at, TIME_ZONE) } },
      {
        id: "method",
        accessorKey: "methodLabel",
        header: "Method",
        cell: ({ row }) => {
          const Icon = row.original.refund ? Undo2 : ICONS[row.original.method]
          return (
            <span className="inline-flex items-center gap-1.5">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {row.original.refund ? `Refund of ${row.original.methodLabel}` : row.original.methodLabel}
            </span>
          )
        },
      },
      { id: "amount", accessorKey: "amount", header: "Amount", meta: { align: "right" }, cell: ({ row }) => <span className={row.original.refund ? "text-muted-foreground" : "font-medium"}>{row.original.amount}</span> },
      { id: "by", accessorKey: "by", header: "Recorded by" },
      { id: "status", accessorFn: (r) => statusOf(r).label, header: "Status", cell: ({ row }) => <StatusPill status={statusOf(row.original).status} label={statusOf(row.original).label} /> },
      { id: "actions", enableSorting: false, enableHiding: false, header: () => <span className="sr-only">Buttons</span>, cell: ({ row }) => <PaymentActions row={row.original} onRefund={onRefund} /> },
    ],
    [onRefund],
  )
  return (
    <div data-slot="payment-table">
      <DataGrid columns={columns} card={PAYMENT_CARD} data={rows} getRowId={(r) => r.id} onOpen={setOpen} toolbar={false} pageSize={10} emptyTitle="No payments yet" emptyLine="Every payment and refund on this job shows here." />
      <ConfirmDialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={open ? `${open.refund ? "Refund" : "Payment"}, ${shortDate(open.at, TIME_ZONE)}` : "Payment"} actions="none" size="md" slot="payment-dialog">
        {open && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {open.amount} by {open.methodLabel}, recorded by {open.by}.
            </p>
            <PaymentActions row={open} onRefund={onRefund && ((r) => (setOpen(null), onRefund(r)))} />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}

export function InvoiceTable({ rows, onRemind }: { rows: InvoiceRowData[]; onRemind?: (row: InvoiceRowData) => void }) {
  const [open, setOpen] = useState<InvoiceRowData | null>(null)
  const columns = useMemo<GridColumnDef<InvoiceRowData>[]>(
    () => [
      {
        id: "number",
        accessorKey: "number",
        header: "Invoice",
        meta: { bare: true },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <RecordChip kind="invoice" name={row.original.number} href={row.original.href ?? `/admin/invoices?invoice=${row.original.id}`} />
            {row.original.note && <span className="text-xs text-muted-foreground">{row.original.note}</span>}
          </span>
        ),
      },
      { id: "label", accessorKey: "number", header: "Invoice number", cell: ({ row }) => <span>{row.original.number}</span> },
      { id: "amount", accessorKey: "amount", header: "Amount", meta: { align: "right" } },
      { id: "sent", accessorKey: "sent", header: "Sent" },
      { id: "due", accessorKey: "due", header: "Due" },
      { id: "status", accessorFn: (r) => r.statusLabel ?? r.status, header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} label={row.original.statusLabel} /> },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Buttons</span>,
        cell: ({ row }) => <InvoiceActions row={row.original} onRemind={onRemind} />,
      },
    ],
    [onRemind],
  )
  return (
    <div data-slot="invoice-table">
      <DataGrid columns={columns} card={INVOICE_CARD} data={rows} getRowId={(r) => r.id} onOpen={setOpen} toolbar={false} hiddenColumns={["label"]} pageSize={10} emptyTitle="No invoices yet" emptyLine="Every invoice sent for this job shows here." />
      <ConfirmDialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={open ? `Invoice ${open.number}` : "Invoice"} actions="none" size="md" slot="invoice-dialog">
        {open && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {open.amount}, sent {open.sent}, due {open.due}.
            </p>
            <InvoiceActions row={open} onRemind={onRemind && ((r) => (setOpen(null), onRemind(r)))} />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}

function InvoiceActions({ row, onRemind }: { row: InvoiceRowData; onRemind?: (row: InvoiceRowData) => void }) {
  return (
    <span className="flex items-center justify-end gap-3">
      {row.canRemind && onRemind && (
        <button type="button" onClick={() => onRemind(row)} className={LINK}>
          Remind
        </button>
      )}
      <Link href={row.href ?? `/admin/invoices?invoice=${row.id}`} className={LINK}>
        Open invoice
      </Link>
    </span>
  )
}
