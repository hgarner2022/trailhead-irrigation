"use client"

import { useMemo } from "react"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { PageHeader } from "@/components/blocks/PageHeader"
import { RecordChip } from "@/components/blocks/RecordChip"
import { recordHref } from "@/components/blocks/record-preview-model"
import { StatusPill } from "@/components/blocks/StatusPill"
import { REQUEST_PILL, REQUEST_STATES, SERVICE_FILTER, cameIn, fullName, listOrder, matchOf, newCount, openRequests, serviceWords, stateOf, type RequestData, type RequestState } from "./request-model"

// The Requests list (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.2; Hannah's answers 1 and 2 of Nov 20 2026): one DataGrid shaped like Jobs,
// New first. A request is a held record of someone who is not a customer yet, so the row says who asked, which customer they match (a chip, or "No
// match"), what they asked for, the town, when it came in and a status pill: New, Seen or Archived. A request that became a job has left the list (Hannah, Nov 20 2026: it moves into the job). Search is by name, street, phone or
// service; Status and Service are the filters. The name opens the request. Pure props.

const CHIP = "text-sm font-medium md:min-h-8"
const STATE_WORDS: Record<RequestState, string> = { new: "New", seen: "Seen", archived: "Archived" }

interface Row extends RequestData {
  state: RequestState
  matchId: string
  matchName: string
  cameInWords: string
}

const columns: GridColumnDef<Row>[] = [
  { id: "name", accessorFn: (r) => `${fullName(r)} ${r.street} ${r.phone} ${r.service}`, header: "Request", cell: ({ row }) => fullName(row.original), meta: { csv: (r) => fullName(r as Row) } },
  {
    id: "match",
    accessorFn: (r) => r.matchName,
    header: "Customer",
    cell: ({ row }) => (row.original.matchId ? <RecordChip kind="customer" name={row.original.matchName} href={recordHref.customer(row.original.matchId)} className={CHIP} /> : <span className="text-muted-foreground">No match</span>),
    meta: { csv: (r) => (r as Row).matchName || "No match" },
  },
  { id: "service", accessorFn: (r) => serviceWords(r), header: "Asked for" },
  { id: "town", accessorFn: (r) => r.town || "Not given", header: "Town" },
  { id: "came", accessorKey: "receivedAt", header: "Came in", cell: ({ row }) => row.original.cameInWords, meta: { csv: (r) => (r as Row).receivedAt } },
  { id: "state", accessorKey: "state", header: "Status", cell: ({ row }) => <StatusPill status={REQUEST_PILL[row.original.state].status} label={REQUEST_PILL[row.original.state].label} />, meta: { csv: (r) => STATE_WORDS[(r as Row).state] } },
]

/** On a phone: who, what and where, the status, and when it came in. */
const card: GridCardSlots = { title: "name", line: ["service", "town"], state: "state", when: ["came"] }

export interface RequestsListProps {
  requests: readonly RequestData[]
  /** the moment "Came in" is counted from */
  now: string
  onOpen: (request: RequestData) => void
  /** Status chips already set on first render (a link from Home: New) */
  defaultFilters?: { column: string; values: string[] }[]
}

export function RequestsList({ requests, now, onOpen, defaultFilters }: RequestsListProps) {
  const rows = useMemo<Row[]>(
    () =>
      listOrder(openRequests(requests)).map((r) => {
        const m = matchOf(r)
        return { ...r, state: stateOf(r), matchId: m?.customer.id ?? "", matchName: m?.customer.name ?? "", cameInWords: cameIn(r, now) }
      }),
    [requests, now],
  )
  const open = openRequests(requests)
  const fresh = newCount(requests)
  return (
    <div data-slot="requests-list">
      <PageHeader title="Requests" context={open.length === 0 ? "No requests yet." : `${open.length} requests. ${fresh} new.`} />
      <DataGrid
        columns={columns}
        card={card}
        data={rows}
        getRowId={(r: Row) => r.id}
        search={{ column: "name", placeholder: "Search by name, street, phone or service" }}
        filters={[
          { column: "state", label: "Status", options: REQUEST_STATES.map((value) => ({ value, label: STATE_WORDS[value] })) },
          { column: "service", label: "Asked for", options: SERVICE_FILTER.map((s) => ({ value: s, label: s })) },
        ]}
        defaultFilters={defaultFilters}
        onOpen={(r) => onOpen(r)}
        exportName="requests"
        pageSize={25}
        noMatchTitle="No requests match."
        emptyTitle="No requests yet"
        emptyLine="A request from the website shows here until you make a job of it or archive it."
      />
    </div>
  )
}
