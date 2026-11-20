"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CircleCheck, CircleX, Clock, FileText } from "lucide-react"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { recordHref } from "@/components/blocks/record-preview-model"
import { useMedia } from "@/components/blocks/use-media"
import { CustomerChip, JobChip, QuoteChip, useRowOpen } from "../RecordChips"
import { QuoteReminderDialog } from "./QuoteDialogs"
import { QUOTE_STATES, quoteRowsOf, quoteTotals, sortQuoteRows, type QuoteListRow } from "./quote-list-model"
import { QUOTE_PILL, STAGE_PILL, ago, dayOf, money, type Channel, type QuoteData, type QuoteJob } from "./quote-model"

// Quotes, a nav item after Jobs (Hannah, Nov 20 2026): every quote with its status, a second view of what the job already holds (the job still shows
// Needs a quote and Quote sent). The Invoices list's shape: a summary band whose tiles set the Status filter (Waiting, Approved this month, Declined this
// month; a tile with nothing is plain), then one `DataGrid` with the quote number, the customer and the job as chips, the amount, the deposit (a dollar
// figure or a dash), the day it was sent and its age, and the status pill, the waiting ones first. Remind is a quiet text button on a Sent quote only and opens
// the quote's own reminder dialog; Open (an icon, "Open quote" on a phone) and a click on the row or the job chip land on the job's Quote section. Status
// is the filter; search is by number, name or street. Pure props: the jobs come in.

const TEXT_BUTTON = "inline-flex min-h-11 items-center whitespace-nowrap rounded-sm px-2 text-sm font-medium text-primary-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:text-muted-foreground disabled:no-underline"
const ICON_LINK = "inline-flex size-11 items-center justify-center rounded-sm text-primary-dark hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
const CARD: GridCardSlots = { title: "label", line: ["customerText", "jobText"], state: "status", when: ["datesText"], money: "amount", actions: "actions" }

type Preset = { key: string; filters: { column: string; values: string[] }[] }

function Actions({ row, onRemind }: { row: QuoteListRow; onRemind: (r: QuoteListRow) => void }) {
  const phone = useMedia("(max-width: 767px)")
  const href = recordHref.quote(row.jobId)
  return (
    <span className="flex flex-nowrap items-center justify-end gap-0.5">
      {row.state === "sent" && (
        <button type="button" className={TEXT_BUTTON} disabled={row.remindedToday} onClick={() => onRemind(row)}>
          {row.remindedToday ? "Reminded today" : "Remind"}
        </button>
      )}
      {phone ? (
        <Link href={href} className={TEXT_BUTTON}>
          Open quote
        </Link>
      ) : (
        <Link href={href} aria-label="Open quote" title="Open quote" className={ICON_LINK}>
          <FileText className="size-4" aria-hidden />
        </Link>
      )}
    </span>
  )
}

export interface QuotesListProps {
  jobs: readonly QuoteJob[]
  /** the moment ages are counted from */
  now: string
  /** the reminder the dialog sent: the store's `remind`, and the toast */
  onRemind?: (job: QuoteJob, quote: QuoteData, o: { via: Channel; line: string }) => void
  /** Status chips already set on first render (a link from Home: Sent; the no-match story) */
  initialFilters?: { column: string; values: string[] }[]
}

export function QuotesList({ jobs, now, onRemind, initialFilters = [] }: QuotesListProps) {
  const open = useRowOpen()
  const [preset, setPreset] = useState<Preset>({ key: "all", filters: initialFilters })
  const [remind, setRemind] = useState<QuoteListRow | null>(null)
  const rows = useMemo(() => quoteRowsOf(jobs, now), [jobs, now])
  const data = useMemo(() => sortQuoteRows(rows), [rows])
  const t = quoteTotals(rows, now)
  const remindJob = remind ? jobs.find((j) => j.jobId === remind.jobId) : undefined
  const remindQuote = remindJob?.quotes.find((q) => q.id === remind?.id)

  const columns = useMemo<GridColumnDef<QuoteListRow>[]>(
    () => [
      {
        id: "number",
        accessorFn: (r) => `${r.id} ${r.customer} ${r.street}`,
        header: "Quote",
        meta: { bare: true, csv: (r) => (r as QuoteListRow).id },
        cell: ({ row: { original: r } }) => <QuoteChip table jobId={r.jobId} number={r.id} />,
      },
      { id: "label", accessorFn: (r) => r.id, header: "Quote number" },
      { id: "jobText", accessorFn: (r) => r.jobName, header: "Job name" },
      { id: "customerText", accessorFn: (r) => r.customer, header: "Customer name" },
      { id: "customer", accessorFn: (r) => r.customer, header: "Customer", cell: ({ row: { original: r } }) => <CustomerChip table id={r.customerId} name={r.customer} address={r.street} /> },
      {
        id: "jobName",
        accessorFn: (r) => r.jobName,
        header: "Job",
        cell: ({ row: { original: r } }) => <JobChip table href={recordHref.quote(r.jobId)} id={r.jobId} name={r.jobName} customer={r.customer} status={STAGE_PILL[r.jobStage].status} total={money(r.amount)} />,
      },
      { id: "amount", accessorFn: (r) => r.amount, header: "Amount", meta: { align: "right", csv: (r) => String((r as QuoteListRow).amount) }, cell: ({ row: { original: r } }) => money(r.amount) },
      {
        id: "deposit",
        accessorFn: (r) => r.deposit ?? 0,
        header: "Deposit",
        meta: { align: "right", csv: (r) => String((r as QuoteListRow).deposit ?? "") },
        cell: ({ row: { original: r } }) =>
          r.deposit ? (
            money(r.deposit)
          ) : (
            <span className="text-muted-foreground">
              <span aria-hidden>{"—"}</span>
              <span className="sr-only">No deposit</span>
            </span>
          ),
      },
      { id: "sent", accessorFn: (r) => r.sentOn, header: "Sent", cell: ({ row: { original: r } }) => dayOf(r.sentOn), meta: { csv: (r) => (r as QuoteListRow).sentOn } },
      { id: "age", accessorFn: (r) => r.sentOn, header: "Age", cell: ({ row: { original: r } }) => ago(r.sentOn, now), meta: { csv: (r) => ago((r as QuoteListRow).sentOn, now) } },
      { id: "datesText", accessorFn: (r) => `Sent ${dayOf(r.sentOn)}, ${ago(r.sentOn, now)}`, header: "Sent and age" },
      { id: "status", accessorFn: (r) => r.state, header: "Status", meta: { csv: (r) => QUOTE_PILL[(r as QuoteListRow).state].label }, cell: ({ row: { original: r } }) => <StatusPill status={QUOTE_PILL[r.state].status} label={QUOTE_PILL[r.state].label} /> },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Buttons</span>,
        cell: ({ row: { original: r } }) => <Actions row={r} onRemind={setRemind} />,
      },
    ],
    [now],
  )

  const tile = (label: string, value: string, sub: string, icon: typeof Clock, key: string, values: string[], any: boolean) => ({
    label,
    value,
    sub,
    icon,
    tone: "plain" as const,
    ...(any ? { onClick: () => setPreset({ key, filters: [{ column: "status", values }] }) } : {}),
  })
  const plural = (n: number) => `${n} ${n === 1 ? "quote" : "quotes"}`
  const band = [
    tile("Waiting", money(t.waiting.total), t.waiting.count ? `${plural(t.waiting.count)} out` : "Nothing waiting", Clock, "waiting", ["sent"], t.waiting.count > 0),
    tile("Approved this month", money(t.approved.total), `${plural(t.approved.count)} approved`, CircleCheck, "approved", ["approved"], t.approved.count > 0),
    tile("Declined this month", money(t.declined.total), `${plural(t.declined.count)} declined`, CircleX, "declined", ["declined"], t.declined.count > 0),
  ]

  return (
    <div data-slot="quotes-list" className="flex flex-col gap-4">
      <PageHeader title="Quotes" context={rows.length ? `${t.waiting.count} waiting, ${money(t.waiting.total)}.` : "No quotes yet."} />
      <SummaryBand items={band} className="sm:grid-cols-3 lg:grid-cols-3 [&>:last-child]:col-span-2 sm:[&>:last-child]:col-span-1" />
      <DataGrid
        key={preset.key}
        columns={columns}
        card={CARD}
        data={data}
        getRowId={(r) => r.id}
        search={{ column: "number", placeholder: "Search by number, name or street" }}
        filters={[{ column: "status", label: "Status", options: QUOTE_STATES.map((s) => ({ value: s, label: QUOTE_PILL[s].label })) }]}
        defaultFilters={preset.filters}
        hiddenColumns={["label", "customerText", "jobText", "datesText"]}
        onOpen={(r) => open(r.id)}
        exportName="quotes"
        pageSize={25}
        noMatchTitle="No quotes match."
        emptyTitle="No quotes yet"
        emptyLine="A quote shows here when you send one from a job."
      />
      {remind && remindJob && remindQuote && <QuoteReminderDialog job={remindJob} quote={remindQuote} onClose={() => setRemind(null)} onSend={(o) => onRemind?.(remindJob, remindQuote, o)} />}
    </div>
  )
}
