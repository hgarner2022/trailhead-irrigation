"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid } from "@/components/blocks/DataGrid"
import { PageHeader } from "@/components/blocks/PageHeader"
import { MessageThread } from "@/components/blocks/MessageThread"
import { SidePanel, SidePanelLayout } from "@/components/blocks/SidePanel"
import { StatusPill, statusLabel } from "@/components/blocks/StatusPill"
import type { AdminData, Visit } from "@/lib/admin/types"
import { KIND_WORDS, TIME_ZONE, shortDate } from "@/lib/admin/format"
import { consentLine } from "./passes-model"
import { customerColumns } from "./customers-columns"
import { MARKETING_WORDS, NEXT_WORDS, customerRows, customersContext, type CustomerRow } from "./customers-model"

// Everyone Trailhead has worked for, with the pass layered on: the one data
// grid, each row saying what is next for that customer and whether it is
// booked or still to schedule (Hannah, 2026-11-12), the customer opening
// beside it from their name with their visits and the consent on record.
// Client because the selected customer is state; the route's page.tsx
// supplies `data` and `today`. The bulk action and the panel's buttons only
// log in the prototype; "Send pass offer" is the January pre-sell. The
// Messages section lists every email and text the app sent the customer
// with its state (one-way; Hannah, 2026-11-12 late).

export interface CustomersScreenProps {
  data: AdminData
  /** ISO datetime; a visit on or after this day is ahead */
  today: string
  /** The customer open on first render; for the catalog, since the prototype has no URL state */
  defaultSelectedId?: string
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const option = (value: string, label = value) => ({ value, label })
const log = (action: string) => (rows: CustomerRow[]) => console.info(action, rows.map((r) => r.firstName))
const BULK_ACTIONS = [{ label: "Send pass offer", onClick: log("send pass offer") }]
const RECENT = 5

function Subtitle({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="font-display text-lg leading-tight text-navy">
      {children}
    </h3>
  )
}

function Facts({ row, consent }: { row: CustomerRow; consent: string }) {
  const facts: [string, ReactNode][] = [
    ["Town", row.town],
    ["Pass", row.pass === "none" ? "None" : <StatusPill key="pass" status={row.pass} />],
    ["Next", row.nextState === "none" ? NEXT_WORDS.none : `${row.next}, ${NEXT_WORDS[row.nextState].toLowerCase()}`],
    ["Marketing", MARKETING_WORDS[row.marketing]],
    ["Consent", consent],
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {facts.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The customer's visits, newest first, the last few. */
function Visits({ visits }: { visits: Visit[] }) {
  const recent = [...visits].filter((v) => v.startAt).sort((a, b) => (b.startAt ?? "").localeCompare(a.startAt ?? "")).slice(0, RECENT)
  if (recent.length === 0) return <p className="mt-2 text-sm text-muted-foreground">No visits on record.</p>
  return (
    <ul className="mt-2 divide-y divide-border text-sm">
      {recent.map((v) => (
        <li key={v.id} className="flex items-center gap-4 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{KIND_WORDS[v.kind].charAt(0).toUpperCase() + KIND_WORDS[v.kind].slice(1)}</span>
            <span className="block text-muted-foreground">{shortDate(v.startAt!, TIME_ZONE)}</span>
          </span>
          <StatusPill status={v.status} label={statusLabel(v.status)} />
        </li>
      ))}
    </ul>
  )
}

export function CustomersScreen({ data, today, defaultSelectedId }: CustomersScreenProps) {
  const rows = useMemo(() => customerRows(data, today), [data, today])
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  const [open, setOpen] = useState(() => rows.some((r) => r.id === defaultSelectedId))
  const row = rows.find((r) => r.id === selectedId)
  const client = data.clients.find((c) => c.id === selectedId)
  const filters = useMemo(
    () => [
      { column: "town", label: "Town", options: TOWNS.map((t) => option(t)) },
      { column: "pass", label: "Pass", options: [option("active", "Active"), option("none", "None"), option("cancelled", "Cancelled"), option("lapsed", "Lapsed")] },
      { column: "nextState", label: "Ahead", options: (["booked", "to-schedule", "none"] as const).map((s) => option(s, NEXT_WORDS[s])) },
      { column: "marketing", label: "Marketing", options: (["yes", "no", "not-asked"] as const).map((m) => option(m, MARKETING_WORDS[m])) },
    ],
    [],
  )
  const show = (next: CustomerRow) => {
    setSelectedId(next.id)
    setOpen(true)
  }

  return (
    <div data-slot="customers-screen">
      <PageHeader title="Customers" context={customersContext(rows)} />
      <SidePanelLayout
        panel={
          row && (
            <SidePanel
              open={open}
              onOpenChange={setOpen}
              title={row.firstName}
              description={row.pass === "none" ? "Customer" : `Season Pass holder`}
              footer={
                <>
                  <Button variant="outline" onClick={() => console.info("send pass offer", [row.firstName])}>
                    Send pass offer
                  </Button>
                  <Button asChild variant="outline">
                    <a href={row.jobberUrl} target="_blank" rel="noreferrer">
                      Open in Jobber
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-6">
                <Facts row={row} consent={consentLine(client?.consent)} />
                <section aria-labelledby="customer-visits">
                  <Subtitle id="customer-visits">Visits</Subtitle>
                  <Visits visits={data.visits.filter((v) => v.clientId === row.id)} />
                </section>
                <section aria-labelledby="customer-messages">
                  <Subtitle id="customer-messages">Messages</Subtitle>
                  <MessageThread messages={data.messages.filter((m) => m.clientId === row.id)} className="mt-3" />
                </section>
              </div>
            </SidePanel>
          )
        }
      >
        <DataGrid
          columns={customerColumns}
          data={rows}
          getRowId={(r) => r.id}
          search={{ column: "firstName", placeholder: "Search by name" }}
          filters={filters}
          onOpen={show}
          bulkActions={BULK_ACTIONS}
          exportName="customers"
          pageSize={25}
          emptyTitle="No customers yet"
          emptyLine="Customers appear here from Jobber and from the first passes sold."
        />
      </SidePanelLayout>
    </div>
  )
}
