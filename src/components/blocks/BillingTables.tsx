"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Banknote, CreditCard, ExternalLink, FileCheck, FileText, MoreHorizontal, Receipt, Smartphone, Undo2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { ConfirmDialog } from "./ConfirmDialog"
import { DataGrid, type GridColumnDef } from "./DataGrid"
import type { GridCardSlots } from "./DataGridCard"
import { RecordChip } from "./RecordChip"
import { useMedia } from "./use-media"
import { StatusPill, type PillStatus } from "./StatusPill"

// The Payments and Invoices tables of a Billing section (Hannah, Nov 19 2026: "billing after a payment is lackluster"). They are the
// Message table's own grid (`DataGrid`: same header, same border, same cards on a phone) with no toolbar, because a table embedded in a
// record page has nothing to search, and they sit inside the Billing `SectionCard`, so they must fit it: at most five columns. Payments:
// Date, Method (the words over a quiet "Recorded by" line), Amount, Status (a dot pill), then one actions cell of icon buttons with
// tooltips: Receipt (our receipt page), Open in Stripe for a card payment (external-link icon) and More, where Refund lives. A refund is a
// negative row in grey and never a delete. Invoices: the invoice's chip (to its own page, with a note under it), Amount, Sent and due,
// Status, then Remind and an Open invoice icon. A phone shows each row as a card with its actions as a quiet line under it. Pure props. Client component.

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
  /** the check number or the Venmo handle, as the quiet line under the method in place of `by` ("@andrea-d", "#2210") */
  reference?: string
  /** a customer's page names the job each payment was for: its chip, on a quiet line under the method */
  job?: React.ReactNode
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
  /** a quiet line under the number: "Includes the visit report", or on a customer's page the job's chip */
  note?: React.ReactNode
  /** Remind is offered while the invoice is out and unpaid */
  canRemind?: boolean
}

const ICONS: Record<PaymentMethod, LucideIcon> = { card: CreditCard, check: FileCheck, venmo: Smartphone, cash: Banknote }
const LINK = "inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-primary-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
const ICON_BUTTON = "inline-flex size-11 items-center justify-center rounded-sm text-primary-dark hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

function statusOf(r: PaymentRowData): { status: PillStatus; label: string } {
  if (r.refund) return { status: "cancelled", label: "Refunded" }
  if (r.failed) return { status: "failed", label: "Failed" }
  return { status: "paid", label: "Paid" }
}

function IconLink({ href, label, external, children }: { href: string; label: string; external?: boolean; children: React.ReactNode }) {
  const link = external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} className={ICON_BUTTON}>
      {children}
    </a>
  ) : (
    <Link href={href} aria-label={label} className={ICON_BUTTON}>
      {children}
    </Link>
  )
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** The row's buttons as icons with tooltips (Receipt, Open in Stripe, More with Refund). */
function PaymentActions({ row, onRefund }: { row: PaymentRowData; onRefund?: (row: PaymentRowData) => void }) {
  return (
    <span className="flex items-center justify-end">
      <IconLink href={row.receiptHref} label="Receipt">
        <Receipt className="size-4" aria-hidden />
      </IconLink>
      {row.stripeHref && (
        <IconLink href={row.stripeHref} label="Open in Stripe" external>
          <ExternalLink className="size-4" aria-hidden />
        </IconLink>
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

/** On a phone the buttons are a quiet text line under the card, since a card is one button and cannot hold icon buttons. */
function PaymentLine({ row, onRefund }: { row: PaymentRowData; onRefund?: (row: PaymentRowData) => void }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4">
      {row.job && <span className="block w-full">{row.job}</span>}
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
        <button type="button" onClick={() => onRefund(row)} className={`${LINK} text-destructive`}>
          Refund {row.amount}
        </button>
      )}
    </span>
  )
}

/** The job chip under the method on a laptop; on a phone it moves to the line under the card (a card is one button). */
function MethodJob({ job }: { job: React.ReactNode }) {
  return useMedia("(max-width: 767px)") ? null : <span className="block">{job}</span>
}

/** A laptop row's buttons are icons with tooltips; a phone card's are a quiet text line under it. */
function RowButtons({ icons, line }: { icons: React.ReactNode; line: React.ReactNode }) {
  return useMedia("(max-width: 767px)") ? line : icons
}

const PAYMENT_CARD: GridCardSlots = { title: "date", line: ["method"], state: "status", money: "amount", actions: "actions" }
const INVOICE_CARD: GridCardSlots = { title: "label", line: ["amount"], state: "status", when: ["dates"], actions: "actions" }

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
            <span className="flex min-w-0 items-start gap-1.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                <span className="block whitespace-normal">{row.original.refund ? `Refund of ${row.original.methodLabel}` : row.original.methodLabel}</span>
                <span className="block text-xs text-muted-foreground">{row.original.reference ?? row.original.by}</span>
                {row.original.job && <MethodJob job={row.original.job} />}
              </span>
            </span>
          )
        },
      },
      { id: "amount", accessorKey: "amount", header: "Amount", meta: { align: "right" }, cell: ({ row }) => <span className={row.original.refund ? "text-muted-foreground" : "font-medium"}>{row.original.amount}</span> },
      { id: "status", accessorFn: (r) => statusOf(r).label, header: "Status", cell: ({ row }) => <StatusPill status={statusOf(row.original).status} label={statusOf(row.original).label} /> },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Buttons</span>,
        cell: ({ row }) => (
          <RowButtons icons={<PaymentActions row={row.original} onRefund={onRefund} />} line={<PaymentLine row={row.original} onRefund={onRefund} />} />
        ),
      },
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
            <PaymentLine row={open} onRefund={onRefund && ((r) => (setOpen(null), onRefund(r)))} />
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
            <RecordChip kind="invoice" name={row.original.number} href={row.original.href ?? `/admin/invoices?invoice=${row.original.id}`} className="text-sm font-medium md:min-h-8" />
            {row.original.note && <span className="whitespace-normal text-xs text-muted-foreground">{row.original.note}</span>}
          </span>
        ),
      },
      { id: "label", accessorKey: "number", header: "Invoice number", cell: ({ row }) => <span>{row.original.number}</span> },
      { id: "amount", accessorKey: "amount", header: "Amount", meta: { align: "right" } },
      { id: "dates", accessorFn: (r) => `${r.sent} ${r.due}`, header: "Sent and due", cell: ({ row: { original: r } }) => <span className="block">Sent {r.sent}<span className="block text-xs text-muted-foreground">due {r.due}</span></span> },
      { id: "status", accessorFn: (r) => r.statusLabel ?? r.status, header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} label={row.original.statusLabel} /> },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Buttons</span>,
        cell: ({ row }) => {
          const href = row.original.href ?? `/admin/invoices?invoice=${row.original.id}`
          return (
            <RowButtons
              icons={
                <span className="flex items-center justify-end">
                  {row.original.canRemind && onRemind && (
                    <button type="button" onClick={() => onRemind(row.original)} className={`${LINK} px-2`}>
                      Remind
                    </button>
                  )}
                  <IconLink href={href} label="Open invoice">
                    <FileText className="size-4" aria-hidden />
                  </IconLink>
                </span>
              }
              line={
                <span className="flex flex-wrap items-center gap-x-4">
                  {row.original.canRemind && onRemind && (
                    <button type="button" onClick={() => onRemind(row.original)} className={LINK}>
                      Remind
                    </button>
                  )}
                  <Link href={href} className={LINK}>
                    Open invoice
                  </Link>
                </span>
              }
            />
          )
        },
      },
    ],
    [onRemind],
  )
  return (
    <div data-slot="invoice-table">
      <DataGrid columns={columns} card={INVOICE_CARD} data={rows} getRowId={(r) => r.id} onOpen={setOpen} toolbar={false} hiddenColumns={["label"]} pageSize={10} emptyTitle="No invoices yet" emptyLine="Every invoice sent for this job shows here." />
      <ConfirmDialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={open ? `Invoice ${open.number}` : "Invoice"} actions="none" size="md" slot="invoice-dialog">
        {open && (
          <p className="text-sm">
            {open.amount}, sent {open.sent}, due {open.due}.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
