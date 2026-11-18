"use client"

import { useCallback, useMemo, useRef, useState, useTransition } from "react"
import { DataGrid } from "@/components/blocks/DataGrid"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SidePanelLayout } from "@/components/blocks/SidePanel"
import type { AdminData } from "@/lib/admin/types"
import type { Outcome } from "./action-types"
import { CustomerPanel } from "./CustomerPanel"
import type { VisitActions } from "./visit-actions-types"
import { VisitPanelHost } from "./VisitPanelHost"
import { customerColumns } from "./customers-columns"
import { MARKETING_WORDS, SCHEDULED_WORDS, customerRows, customersContext, type CustomerRow } from "./customers-model"

// Everyone Trailhead has worked for, with the pass layered on: the one data
// grid with the normal data (full name, street, town, email, phone), each
// row saying what is next and whether it is scheduled (Hannah, 2026-11-12),
// the customer opening beside it from their name with the same data plus
// the access note, their jobs, the consent history and every message the
// app sent (one-way; Hannah, 2026-11-12 late). Client because the selected
// customer is state; the route's page.tsx supplies `data` and `today`. The
// bulk action only logs in the catalog; "Send pass offer" is the January
// pre-sell. Address, email and phone are there for the admin session and
// absent for a read key, following the API's scope rule.

export interface CustomersScreenProps {
  data: AdminData
  /** ISO datetime; a visit on or after this day is ahead */
  today: string
  /** The customer open on first render; for the catalog, since the prototype has no URL state */
  defaultSelectedId?: string
  /** a tech reads the customers and changes nothing */
  readOnly?: boolean
  /** the panel's actions; server actions in the app. Without them the catalog's pass-offer buttons only log. */
  actions?: CustomersActions
  /** the visit panel and New visit; server actions in the app */
  visitActions?: VisitActions
}

export interface CustomersActions {
  /** a customer who asked by phone not to get marketing: the newest consent record says so */
  recordMarketingOptOut: (customerId: string) => Promise<Outcome>
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const option = (value: string, label = value) => ({ value, label })
const log = (action: string) => (rows: CustomerRow[]) => console.info(action, rows.map((r) => r.name))
const BULK_ACTIONS = [{ label: "Send pass offer", onClick: log("send pass offer") }]

export function CustomersScreen({ data, today, defaultSelectedId, readOnly = false, actions, visitActions }: CustomersScreenProps) {
  const rows = useMemo(() => customerRows(data, today), [data, today])
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  const [open, setOpen] = useState(() => rows.some((r) => r.id === defaultSelectedId))
  const row = rows.find((r) => r.id === selectedId)
  const client = data.clients.find((c) => c.id === selectedId)
  const [, start] = useTransition()
  const [notice, setNotice] = useState("")
  const optOut = (customerId: string) =>
    start(async () => {
      const out = await actions!.recordMarketingOptOut(customerId)
      setNotice(out.ok ? "Marketing opt-out recorded." : out.message)
    })
  // "Send pass offer" is the January pre-sell and has no API behind it yet, so the live page leaves it out.
  const offers = !actions && !readOnly
  const filters = useMemo(
    () => [
      { column: "town", label: "Town", options: TOWNS.map((t) => option(t)) },
      { column: "pass", label: "Pass", options: [option("active", "Active"), option("pending", "Pending"), option("none", "None"), option("cancelled", "Canceled"), option("lapsed", "Expired")] },
      { column: "nextState", label: "Scheduled", options: (["booked", "to-schedule", "none"] as const).map((s) => option(s, `${SCHEDULED_WORDS[s]}${s === "to-schedule" ? ", unscheduled" : s === "none" ? ", nothing ahead" : ""}`)) },
      { column: "marketing", label: "Marketing", options: (["yes", "no", "not-asked"] as const).map((m) => option(m, MARKETING_WORDS[m])) },
    ],
    [],
  )
  // One panel at a time: a customer opening closes the visit panel, and a visit opening (the host's `onShow`) closes the customer's.
  const closeVisit = useRef<(() => void) | null>(null)
  const closeCustomer = useCallback(() => setOpen(false), [])
  const show = (next: CustomerRow) => {
    closeVisit.current?.()
    setSelectedId(next.id)
    setOpen(true)
  }

  return (
    <div data-slot="customers-screen">
      <VisitPanelHost data={data} today={today} readOnly={readOnly} actions={visitActions} onShow={closeCustomer} closeRef={closeVisit}>
      <PageHeader title="Customers" context={customersContext(rows)} />
      <SidePanelLayout
        panel={
          row && (
            <CustomerPanel
              open={open}
              onOpenChange={setOpen}
              row={row}
              client={client}
              data={data}
              today={today}
              readOnly={readOnly}
              actions={visitActions}
              notice={notice}
              offers={offers}
              onOptOut={actions && !readOnly ? () => optOut(row.id) : undefined}
            />
          )
        }
      >
        <DataGrid
          columns={customerColumns}
          data={rows}
          getRowId={(r) => r.id}
          search={{ column: "name", placeholder: "Search by name" }}
          filters={filters}
          onOpen={show}
          bulkActions={offers ? BULK_ACTIONS : undefined}
          exportName="customers"
          pageSize={25}
          emptyTitle="No customers yet"
          emptyLine="Customers appear here as passes are sold and work is booked."
        />
      </SidePanelLayout>
      </VisitPanelHost>
    </div>
  )
}
