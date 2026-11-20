"use client"

import { useMemo } from "react"
import { PaymentTable, type InvoiceRowData, type PaymentMethod, type PaymentRowData } from "@/components/blocks/BillingTables"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { MessageTable } from "@/components/blocks/MessageTable"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { StatusPill } from "@/components/blocks/StatusPill"
import { recordHref } from "@/components/blocks/record-preview-model"
import type { Message } from "@/lib/admin/types"
import { DayChip, JobChip, PersonChip, useRowOpen } from "./RecordChips"
import type { CustomerInvoiceRow, CustomerJobRow, CustomerPaymentRow } from "./customer-fixtures"

// The tables on a customer's page, all on `DataGrid` in its embedded mode (no toolbar; the same header, border and phone cards as every table
// of a record page), the job page's own `PaymentTable`, `InvoiceTable` and `MessageTable` for the money and the messages (Billing draws them through `BillingBody`; `toPaymentRows` and `toInvoiceRows` hand it the customer's rows), and one `JobsTable`
// here. A date, an amount, a chip and a button never wrap. Open work sorts first and each group is newest first. Money words are only Paid,
// Unpaid, Invoice sent, Past due and Failed. A phone shows each row as the grid's card: name, a quiet line, the pill, the day and the money
// word at the right. Pure props over the fixtures.

const QUIET = "block whitespace-normal text-xs text-muted-foreground"

/** Open jobs on top, then each group newest first. */
export const sortJobs = (rows: readonly CustomerJobRow[]): CustomerJobRow[] => [...rows].sort((a, b) => Number(b.open) - Number(a.open) || b.sortDay.localeCompare(a.sortDay))
/** Invoices still out first (Past due, then sent), then the paid and canceled, newest first. */
export const sortInvoices = (rows: readonly CustomerInvoiceRow[]): CustomerInvoiceRow[] => {
  const rank = (r: CustomerInvoiceRow) => (r.status === "overdue" ? 0 : r.status === "bill-sent" ? 1 : 2)
  return [...rows].sort((a, b) => rank(a) - rank(b) || b.sortDay.localeCompare(a.sortDay))
}
export const sortPayments = (rows: readonly CustomerPaymentRow[]): CustomerPaymentRow[] => [...rows].sort((a, b) => b.sortDay.localeCompare(a.sortDay))

const dayText = (r: CustomerJobRow) => (r.day ? `${r.day.label}, ${r.day.time}` : "No day yet")
const JOB_CARD: GridCardSlots = { title: "label", line: ["whoText"], state: "status", when: ["dayText"], money: "billing" }
const HIDDEN = ["label", "dayText", "whoText"]

export function JobsTable({ rows, customer }: { rows: readonly CustomerJobRow[]; customer: string }) {
  const open = useRowOpen()
  const data = useMemo(() => sortJobs(rows), [rows])
  const columns = useMemo<GridColumnDef<CustomerJobRow>[]>(
    () => [
      {
        id: "job",
        accessorFn: (r) => r.name,
        header: "Job",
        meta: { bare: true },
        cell: ({ row: { original: r } }) => <JobChip table noMark id={r.id} name={r.name} customer={customer} status={r.status} next={r.day ? dayText(r) : undefined} />,
      },
      { id: "label", accessorFn: (r) => r.name, header: "Job name" },
      { id: "dayText", accessorFn: dayText, header: "Day text" },
      { id: "whoText", accessorFn: (r) => r.who ?? "No one yet", header: "Person" },
      {
        id: "day",
        accessorFn: (r) => r.sortDay,
        header: "Day",
        cell: ({ row: { original: r } }) =>
          r.day ? (
            <span className="block">
              <DayChip table iso={r.day.iso} label={r.day.label} stops={r.day.stops} who={r.who ?? "No one yet"} />
              <span className={`${QUIET} -mt-1 pl-8`}>{r.day.time}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">No day yet</span>
          ),
      },
      { id: "who", accessorFn: (r) => r.who ?? "No one yet", header: "Who", cell: ({ row: { original: r } }) => (r.who ? <PersonChip table name={r.who.split(" ")[0]!} stopsToday={r.day?.stops ?? 0} /> : <span className="text-muted-foreground">No one yet</span>) },
      { id: "status", accessorFn: (r) => r.statusLabel, header: "Status", cell: ({ row: { original: r } }) => <StatusPill status={r.status} label={r.statusLabel} /> },
      {
        id: "billing",
        accessorFn: (r) => r.money?.word ?? "",
        header: "Billing",
        cell: ({ row: { original: r } }) => (
          <span className="block">
            <MoneyCell text={r.money?.word ?? null} tone={r.money?.tone} />
            {(r.money?.note || r.note) && <span className={QUIET}>{r.money?.note ?? r.note}</span>}
          </span>
        ),
      },
    ],
    [customer],
  )
  return <DataGrid columns={columns} card={JOB_CARD} data={data} getRowId={(r) => r.id} onOpen={(r) => open(r.name)} toolbar={false} inCard hiddenColumns={HIDDEN} pageSize={10} emptyTitle="No jobs yet" emptyLine="Every job for this customer shows here." />
}

const methodOf = (how: string): PaymentMethod => (how.startsWith("Check") ? "check" : how.startsWith("Venmo") ? "venmo" : how.startsWith("Cash") ? "cash" : "card")

/** The customer's payments in the Payments table's shape, newest first, with the job each was for as a chip under the method. A payment that settled an invoice carries `invoiceId`. */
export function toPaymentRows(rows: readonly CustomerPaymentRow[], customer: string, o: { cardWords?: string; omitJob?: boolean; canRefund?: boolean } = {}): PaymentRowData[] {
  const { cardWords = "Visa ending 4242", omitJob, canRefund } = o
  return sortPayments(rows).map((r) => {
    const method = methodOf(r.how)
    const [word, ...rest] = r.how.replace(", kept on file", "").split(" ")
    const handle = rest.join(" ")
    return {
      id: r.id,
      at: `${r.sortDay}T17:00:00Z`,
      method,
      methodLabel: method === "card" ? (r.how.includes("kept") ? `${cardWords}, kept on file` : cardWords) : handle ? `${word} ${/^[@#]/.test(handle) ? handle : `#${handle}`}` : word!,
      reference: r.refund ? "Recorded by Ryan" : r.note ? `${r.note} · Ryan` : method === "card" ? "Online" : undefined,
      amount: r.amount,
      by: method === "card" && !r.refund ? "online" : "Ryan",
      receiptHref: `/admin/payments?payment=${r.id}`,
      stripeHref: r.stripeUrl,
      refund: r.refund,
      refundOf: r.refundOf,
      invoiceId: r.invoiceId,
      canRefund: Boolean(canRefund) && !r.refund && !r.refunded,
      job: omitJob ? undefined : <JobChip table noMark id={r.jobId} name={r.jobName} customer={customer} />,
    }
  })
}

/** The customer's invoices in the Invoices table's shape, the ones still out first, with the job each is for as a chip under the number, and Remind while it is out. */
export function toInvoiceRows(rows: readonly CustomerInvoiceRow[], customer: string): InvoiceRowData[] {
  return sortInvoices(rows).map((r) => ({
    id: r.id,
    number: r.number,
    amount: r.amount,
    sent: r.sent,
    due: r.due,
    status: r.status,
    statusLabel: r.statusLabel,
    href: recordHref.invoice(r.id),
    note: (
      <span className="block">
        {r.note && <span className="block">{r.note}</span>}
        <span className="block"><JobChip table noMark id={r.jobId} name={r.jobName} customer={customer} /></span>
      </span>
    ),
    canRemind: r.status === "bill-sent" || r.status === "overdue",
  }))
}

/** The invoice page's Payments table, on the job page's own `PaymentTable`. */
export function PaymentsTable({ rows, customer, cardWords, omitJob, onRefund }: { rows: readonly CustomerPaymentRow[]; customer: string; cardWords?: string; omitJob?: boolean; onRefund?: (row: PaymentRowData) => void }) {
  const data = useMemo(() => toPaymentRows(rows, customer, { cardWords, omitJob, canRefund: Boolean(onRefund) }), [rows, customer, cardWords, omitJob, onRefund])
  return <PaymentTable rows={data} onRefund={onRefund} />
}

/** Everything the app sent the customer: the job page's Message table with no toolbar and no To column (the customer's number and address are in the Contact card). */
export function MessagesTable({ messages, to }: { messages: readonly Message[]; to: { sms: string; email: string } }) {
  return <MessageTable messages={[...messages]} to={to} toolbar={false} compact />
}
