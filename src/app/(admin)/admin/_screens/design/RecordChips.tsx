"use client"

import { RecordChip } from "@/components/blocks/RecordChip"
import { customerPreview, invoicePreview, jobPreview, recordHref } from "@/components/blocks/record-preview-model"
import type { PillStatus } from "@/components/blocks/StatusPill"

// The record chips of the prototype pages, each a `RecordChip` with the preview card wired from the same `record-preview-model` helpers, so a fact on a card cannot differ from
// the page. Since the link diet (Hannah, Nov 25 2026: "Too many links"; docs/plans/2026-11-25-admin-audit-customer.md, section 4) a chip is for a record named ON ITS OWN as a
// relation ("From quote Q-2026-0005", the Job card of an invoice, "Renewed as"), once per page. It is never in a table row: a row's one link is its own name, and every other
// record in it is text (`CustomerText` keeps the Do not service mark on a customer's name). A person, a day in a row and an address are not record links, so they have no chip.
// A payment has no page: its one address is its receipt (`receiptHref`). Pure props.

/** The one address of a payment: the receipt the customer has too. */
export const receiptHref = (id: string) => `/account/receipts/${encodeURIComponent(id)}`

/** A customer's name as text in a row that is not the customer's own, with the Do not service mark (a small red dot with the words for a screen reader and a tooltip). */
export const CustomerText = ({ name, doNotService }: { name: string; doNotService?: boolean }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    {name}
    {doNotService && (
      <span data-slot="do-not-service-dot" title="Do not service" className="inline-flex shrink-0 items-center">
        <span aria-hidden className="size-2 rounded-full bg-destructive" />
        <span className="sr-only">, Do not service</span>
      </span>
    )}
  </span>
)

type Size = "row" | "band"
/** In a table row a chip is a line of text, not a headline: 14px medium, 32px tall from md (44px on a phone), and a day or a person never wraps. */
const TABLE = "md:min-h-8 text-sm font-medium"
const tableCls = (table?: boolean, nowrap?: boolean) => (table ? `${TABLE}${nowrap ? " whitespace-nowrap" : ""}` : undefined)

export const CustomerChip = ({ id, name, phone, address, openJobs = 0, unpaid, size, table, doNotService }: { table?: boolean; doNotService?: boolean; id: string; name: string; phone?: string; address?: string; openJobs?: number; unpaid?: string; size?: Size }) => (
  <RecordChip kind="customer" name={name} flag={doNotService ? "Do not service" : undefined} href={recordHref.customer(id)} size={size} className={tableCls(table, true)} preview={customerPreview({ id, name, phone, address, openJobs, unpaid })} />
)

export const JobChip = ({ id, name, customer, status = "scheduled", next, total = "$0", size, table, noMark, href }: { table?: boolean; noMark?: boolean; id: string; name: string; customer: string; status?: PillStatus; next?: string; total?: string; size?: Size; /** where it opens when not the job itself (the Quotes list: the job at its Quote section) */ href?: string }) => (
  <RecordChip kind="job" name={name} noMark={noMark} href={href ?? recordHref.job(id)} size={size} className={tableCls(table)} preview={jobPreview({ id, name, customer, status, next, total })} />
)

export const InvoiceChip = ({ id, number, customer, status, statusLabel, total, balance, due, size, table }: { table?: boolean; id: string; number: string; customer: string; status: PillStatus; statusLabel: string; total: string; balance: string; due: string; size?: Size }) => (
  <RecordChip kind="invoice" name={number} href={recordHref.invoice(id)} size={size} className={tableCls(table, true)} preview={invoicePreview({ id, number, customer, status, statusLabel, total, balance, due })} />
)

/** A quote is its own record: the chip opens its page by its number. */
export const QuoteChip = ({ number, table }: { number: string; table?: boolean }) => <RecordChip kind="quote" name={number} href={recordHref.quote(number)} className={tableCls(table, true)} />

