"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { CircleCheck, CircleX, Clock, Percent, TrendingUp } from "lucide-react"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { recordHref } from "@/components/blocks/record-preview-model"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CustomerChip, JobChip, QuoteChip, useRowOpen } from "../RecordChips"
import { QuoteReminderDialog } from "./QuoteDialogs"
import { QUOTE_TABS, closeRate, oldestWaitingDays, quoteRowsOf, quoteTotals, sortQuoteRows, tabCounts, type QuoteListRow, type QuoteTab } from "./quote-list-model"
import { QUOTE_PILL, STAGE_PILL, ago, dayOf, money, type Channel, type QuoteData, type QuoteJob } from "./quote-model"

// Quotes, a nav item after Jobs (Hannah, Nov 20 2026): every quote with its status, a second view of what the job already holds (the job still shows
// Needs a quote and Quote sent), laid out as a pipeline. From the top: a row of tiles by stage (Open pipeline, Waiting for an answer with how long the oldest
// has waited, Approved this month, Declined this month, and Close rate, which is shown only once a quote is decided and is only approved divided by approved
// plus declined); each tile that has something to show is also the filter, it sets the tab below. Then status tabs with live counts (All, Sent, Approved,
// Declined, Replaced: the quote's own states, no Draft because the draft is the job's live lines), then search and one `DataGrid` with the quote number,
// customer and job as chips, the amount, the deposit (a dollar figure or a dash), the day it was sent with its age, the status pill and a Next action: Remind
// on a Sent quote (the quote's own reminder dialog, once a day), Open on the others. The waiting ones come first. A click on the row, the quote chip or the
// job chip opens the job at its Quote section. On a phone the table is cards, the tiles two by two and the tabs a row that scrolls sideways. Pure props.

const TEXT_BUTTON = "inline-flex min-h-11 items-center whitespace-nowrap rounded-sm px-2 text-sm font-medium text-primary-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:text-muted-foreground disabled:no-underline"
const CARD: GridCardSlots = { title: "label", line: ["customerText", "jobText"], state: "status", when: ["datesText"], money: "amount", actions: "next" }
const TAB_WORDS: Record<QuoteTab, string> = { all: "All", sent: QUOTE_PILL.sent.label, approved: QUOTE_PILL.approved.label, declined: QUOTE_PILL.declined.label, replaced: QUOTE_PILL.replaced.label }
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`

/** Next action: Remind on a Sent quote (greyed once pressed today), Open on every other. */
function NextAction({ row, onRemind }: { row: QuoteListRow; onRemind: (r: QuoteListRow) => void }) {
  return (
    <span className="flex flex-nowrap items-center justify-end">
      {row.state === "sent" ? (
        <button type="button" className={TEXT_BUTTON} disabled={row.remindedToday} onClick={() => onRemind(row)}>
          {row.remindedToday ? "Reminded today" : "Remind"}
        </button>
      ) : (
        <Link href={recordHref.quote(row.jobId)} aria-label={`Open quote ${row.id}`} className={TEXT_BUTTON}>
          Open
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
  /** the tab that is open on first render (a link from Home: Sent; the no-match story) */
  initialTab?: QuoteTab
}

export function QuotesList({ jobs, now, onRemind, initialTab = "all" }: QuotesListProps) {
  const open = useRowOpen()
  const [tab, setTab] = useState<QuoteTab>(initialTab)
  const [remind, setRemind] = useState<QuoteListRow | null>(null)
  const rows = useMemo(() => quoteRowsOf(jobs, now), [jobs, now])
  const sorted = useMemo(() => sortQuoteRows(rows), [rows])
  const data = useMemo(() => (tab === "all" ? sorted : sorted.filter((r) => r.state === tab)), [sorted, tab])
  const t = quoteTotals(rows, now)
  const counts = tabCounts(rows)
  const oldest = oldestWaitingDays(rows, now)
  const rate = closeRate(rows)
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
      {
        id: "sent",
        accessorFn: (r) => r.sentOn,
        header: "Sent",
        meta: { csv: (r) => (r as QuoteListRow).sentOn },
        cell: ({ row: { original: r } }) => (
          <span className="flex flex-col whitespace-nowrap leading-tight">
            <span>{dayOf(r.sentOn)}</span>
            <span className="text-xs text-muted-foreground">{ago(r.sentOn, now)}</span>
          </span>
        ),
      },
      { id: "datesText", accessorFn: (r) => `Sent ${dayOf(r.sentOn)}, ${ago(r.sentOn, now)}`, header: "Sent and age" },
      { id: "status", accessorFn: (r) => r.state, header: "Status", meta: { csv: (r) => QUOTE_PILL[(r as QuoteListRow).state].label }, cell: ({ row: { original: r } }) => <StatusPill status={QUOTE_PILL[r.state].status} label={QUOTE_PILL[r.state].label} /> },
      {
        id: "next",
        enableSorting: false,
        enableHiding: false,
        header: "Next action",
        meta: { align: "right" },
        cell: ({ row: { original: r } }) => <NextAction row={r} onRemind={setRemind} />,
      },
    ],
    [now],
  )

  const plural = (n: number) => `${n} ${n === 1 ? "quote" : "quotes"}`
  const tile = (label: string, value: string, sub: ReactNode, icon: typeof Clock, to: QuoteTab | null, any: boolean) => ({
    label,
    value,
    sub,
    icon,
    tone: "plain" as const,
    ...(to && any ? { onClick: () => setTab(to) } : {}),
  })
  const band = [
    tile("Open pipeline", money(t.waiting.total), plural(t.waiting.count), TrendingUp, "sent", t.waiting.count > 0),
    tile("Waiting for an answer", String(t.waiting.count), oldest === null ? "Nothing waiting" : <span className="whitespace-nowrap">{`Oldest: ${days(oldest)}`}</span>, Clock, "sent", t.waiting.count > 0),
    tile("Approved this month", money(t.approved.total), `${plural(t.approved.count)} approved`, CircleCheck, "approved", t.approved.count > 0),
    tile("Declined this month", String(t.declined.count), t.declined.count ? money(t.declined.total) : "None declined", CircleX, "declined", t.declined.count > 0),
    ...(rate ? [tile("Close rate", `${rate.percent}%`, `${rate.approved} approved of ${rate.decided} decided`, Percent, null, false)] : []),
  ]

  return (
    <div data-slot="quotes-list" className="flex flex-col gap-4">
      <PageHeader title="Quotes" context={rows.length ? `${t.waiting.count} waiting, ${money(t.waiting.total)}.` : "No quotes yet."} />
      <SummaryBand
        items={band}
        className={band.length === 5 ? "lg:grid-cols-5 [&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-span-1" : undefined}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as QuoteTab)}>
        <TabsList variant="line" aria-label="Status" className="h-11! w-full max-w-full justify-start overflow-x-auto border-b border-border p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUOTE_TABS.map((value) => (
            <TabsTrigger key={value} value={value} aria-controls={undefined} className="min-h-11 flex-none px-3 after:bottom-0! data-[state=active]:font-semibold">
              {TAB_WORDS[value]}
              <span className="tabular-nums text-muted-foreground">{counts[value]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataGrid
        columns={columns}
        card={CARD}
        data={data}
        getRowId={(r) => r.id}
        search={{ column: "number", placeholder: "Search by number, name or street" }}
        hiddenColumns={["label", "customerText", "jobText", "datesText"]}
        onOpen={(r) => open(r.id)}
        exportName="quotes"
        pageSize={25}
        noMatchTitle="No quotes match."
        emptyTitle={rows.length ? "No quotes match." : "No quotes yet"}
        emptyLine={rows.length ? "" : "A quote shows here when you send one from a job."}
      />
      {remind && remindJob && remindQuote && <QuoteReminderDialog job={remindJob} quote={remindQuote} onClose={() => setRemind(null)} onSend={(o) => onRemind?.(remindJob, remindQuote, o)} />}
    </div>
  )
}
