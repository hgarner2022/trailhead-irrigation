"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid } from "@/components/blocks/DataGrid"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SidePanel, SidePanelLayout } from "@/components/blocks/SidePanel"
import type { AdminData } from "@/lib/admin/types"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import type { Outcome } from "./action-types"
import { CustomerPanelBody } from "./CustomerPanel"
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
}

export interface CustomersActions {
  /** a customer who asked by phone not to get marketing: the newest consent record says so */
  recordMarketingOptOut: (customerId: string) => Promise<Outcome>
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const option = (value: string, label = value) => ({ value, label })
const log = (action: string) => (rows: CustomerRow[]) => console.info(action, rows.map((r) => r.name))
const BULK_ACTIONS = [{ label: "Send pass offer", onClick: log("send pass offer") }]

export function CustomersScreen({ data, today, defaultSelectedId, readOnly = false, actions }: CustomersScreenProps) {
  const rows = useMemo(() => customerRows(data, today), [data, today])
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  const [open, setOpen] = useState(() => rows.some((r) => r.id === defaultSelectedId))
  const row = rows.find((r) => r.id === selectedId)
  const client = data.clients.find((c) => c.id === selectedId)
  const [pending, start] = useTransition()
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
      { column: "pass", label: "Pass", options: [option("active", "Active"), option("pending", "Pending"), option("none", "None"), option("cancelled", "Cancelled"), option("lapsed", "Lapsed")] },
      { column: "nextState", label: "Scheduled", options: (["booked", "to-schedule", "none"] as const).map((s) => option(s, `${SCHEDULED_WORDS[s]}${s === "to-schedule" ? ", needs a day" : s === "none" ? ", nothing ahead" : ""}`)) },
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
              title={row.name}
              description={row.pass === "none" ? "Customer" : `Season Pass holder`}
              footer={
                <>
                  {offers && (
                    <Button variant="outline" onClick={() => console.info("send pass offer", [row.name])}>
                      Send pass offer
                    </Button>
                  )}
                  {actions && !readOnly && client?.consent?.marketingOptIn && (
                    <Button variant="outline" disabled={pending} onClick={() => optOut(row.id)}>
                      Record phone opt-out
                    </Button>
                  )}
                </>
              }
            >
              <div className="flex flex-col gap-6">
                <p role="status" className="text-sm text-muted-foreground empty:hidden">
                  {notice}
                </p>
                <CustomerPanelBody row={row} client={client} data={data} today={dayOf(today, TIME_ZONE)} />
              </div>
            </SidePanel>
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
    </div>
  )
}
