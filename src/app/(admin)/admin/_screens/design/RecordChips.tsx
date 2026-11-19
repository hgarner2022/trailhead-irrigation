"use client"

import { RecordChip } from "@/components/blocks/RecordChip"
import { customerPreview, dayPreview, invoicePreview, jobPreview, personPreview, recordHref } from "@/components/blocks/record-preview-model"
import { useUndoToast } from "@/components/blocks/UndoToast"
import type { PillStatus } from "@/components/blocks/StatusPill"

// Every record named on the customer page and the invoice page is one of these (Hannah, Nov 19 2026: every record name is a link; docs/plans/
// 2026-11-19-record-links-research.md): the customer, a job, an invoice, a payment's receipt, a person, the address and a scheduled day (to the
// Schedule). They are `RecordChip` with the preview card wired from the same `record-preview-model` helpers, so a fact on a card cannot differ
// from the page. A whole table row opens its record too (`useRowOpen`), and the chips inside keep their own links. Pure props.

const q = encodeURIComponent
export const paymentHref = (id: string) => `/admin/payments?payment=${q(id)}`
export const propertyHref = (customerId: string) => `/admin/customers?customer=${q(customerId)}#property-h`

type Size = "row" | "band"

export const CustomerChip = ({ id, name, phone, address, openJobs = 0, unpaid, size }: { id: string; name: string; phone?: string; address?: string; openJobs?: number; unpaid?: string; size?: Size }) => (
  <RecordChip kind="customer" name={name} href={recordHref.customer(id)} size={size} preview={customerPreview({ id, name, phone, address, openJobs, unpaid })} />
)

export const JobChip = ({ id, name, customer, status = "scheduled", next, total = "$0", size }: { id: string; name: string; customer: string; status?: PillStatus; next?: string; total?: string; size?: Size }) => (
  <RecordChip kind="job" name={name} href={recordHref.job(id)} size={size} preview={jobPreview({ id, name, customer, status, next, total })} />
)

export const InvoiceChip = ({ id, number, customer, status, statusLabel, total, balance, due, size }: { id: string; number: string; customer: string; status: PillStatus; statusLabel: string; total: string; balance: string; due: string; size?: Size }) => (
  <RecordChip kind="invoice" name={number} href={recordHref.invoice(id)} size={size} preview={invoicePreview({ id, number, customer, status, statusLabel, total, balance, due })} />
)

export const PaymentChip = ({ id, receipt }: { id: string; receipt: string }) => <RecordChip kind="payment" name={`Receipt ${receipt}`} href={paymentHref(id)} />

export const PersonChip = ({ name, role = "Technician", stopsToday = 0, size }: { name: string; role?: string; stopsToday?: number; size?: Size }) => (
  <RecordChip kind="person" name={name} href={recordHref.person()} size={size} preview={personPreview({ name, role, stopsToday })} />
)

export const DayChip = ({ iso, label, stops, who }: { iso: string; label: string; stops: number; who: string }) => (
  <RecordChip kind="day" name={label} href={recordHref.day(iso)} preview={dayPreview({ isoDay: iso, label, stops, who })} />
)

export const AddressChip = ({ customerId, street }: { customerId: string; street: string }) => <RecordChip kind="property" name={street} href={propertyHref(customerId)} />

/** What a click on a whole row does in a prototype: the record opens (here, a toast says which); in the app it is the record host. */
export function useRowOpen(): (what: string) => void {
  const toast = useUndoToast()
  return (what) => toast(`Opens ${what}`)
}
