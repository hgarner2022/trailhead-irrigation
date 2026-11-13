"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DataGrid } from "@/components/blocks/DataGrid"
import { passColumns } from "@/components/blocks/data-grid-columns"
import { PageHeader } from "@/components/blocks/PageHeader"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { SidePanel, SidePanelLayout } from "@/components/blocks/SidePanel"
import { StatusPill, statusLabel } from "@/components/blocks/StatusPill"
import type { AdminData, Pass } from "@/lib/admin/types"
import { formatMoney } from "@/lib/admin/metrics"
import { chargeRows, passesContext, weekLabel, weekOptions } from "./passes-model"

// Every Season Pass sold, as the one data grid, with the pass opening beside
// it from its name. On a laptop the panel pushes the grid narrower; on a
// phone it covers it as a sheet. Client because the selected pass is state
// (its id; the pass itself is read from `data.passes`, so a refreshed `data`
// shows in the open panel); the route's page.tsx supplies `data` and
// `today`. The bulk actions and the panel's buttons only log in the
// prototype. Wiring-phase gap: the panel links to the client in Jobber, since
// `Pass` carries one `jobberUrl` today; the three visits' own Jobber job
// links arrive once the pass holds a job id per visit.

export interface PassesScreenProps {
  data: AdminData
  /** ISO datetime the season line's today marker is read from */
  today: string
  /** The pass open on first render; for the catalog, since the prototype has no URL state */
  defaultSelectedId?: string
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const STATUSES = ["active", "cancelled", "lapsed"] as const
const option = (value: string, label = value) => ({ value, label })

const log = (action: string) => (rows: Pass[]) => console.info(action, rows.map((p) => p.number))
const BULK_ACTIONS = [
  { label: "Send card update link", onClick: log("send card update link") },
  { label: "Resend confirmation", onClick: log("resend confirmation") },
]

function Subtitle({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="font-display text-lg leading-tight text-navy">
      {children}
    </h3>
  )
}

function Facts({ pass }: { pass: Pass }) {
  const facts: [string, ReactNode][] = [
    ["Town", pass.town],
    ["Zones", pass.zones],
    ["Blowout week", weekLabel(pass.blowoutWeek)],
    ["Status", <StatusPill key="status" status={pass.status} />],
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

function Charges({ pass }: { pass: Pass }) {
  return (
    <ul className="mt-2 divide-y divide-border text-sm">
      {chargeRows(pass).map((row) => (
        <li key={row.kind} className="flex items-center gap-4 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{row.name}</span>
            <span className="block text-muted-foreground">{row.when}</span>
          </span>
          <span className="text-right">
            <span className="block tabular-nums">{formatMoney(row.amount)}</span>
            <span className="block text-muted-foreground">{row.charged}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function CancelDialog({ pass, open, onOpenChange }: { pass: Pass; open: boolean; onOpenChange: (open: boolean) => void }) {
  const cancel = () => {
    console.info("cancel pass", [pass.number])
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">Cancel this pass?</DialogTitle>
          <DialogDescription>Nothing further is charged and the blowout week is released.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep pass
          </Button>
          <Button onClick={cancel}>Cancel pass</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PassDetail({ pass, today }: { pass: Pass; today: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-5">
        <PassCard pass={pass} size="thumb" interactive={false} className="shrink-0" />
        <Facts pass={pass} />
      </div>
      <section aria-labelledby="pass-season">
        <Subtitle id="pass-season">Season</Subtitle>
        <SeasonLine mode="customer" season={pass.season} visits={pass.visits} today={today} className="mt-3" />
      </section>
      <section aria-labelledby="pass-charges">
        <Subtitle id="pass-charges">Charges</Subtitle>
        <Charges pass={pass} />
      </section>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={pass.jobberUrl} target="_blank" rel="noreferrer">
            Open in Jobber
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={pass.stripeUrl} target="_blank" rel="noreferrer">
            Open in Stripe
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </div>
    </div>
  )
}

export function PassesScreen({ data, today, defaultSelectedId }: PassesScreenProps) {
  const passes = data.passes
  // Only the id is state; the pass is read from `data` each render. The id is
  // kept while the panel closes, so the sheet slides out with its content.
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  const [open, setOpen] = useState(() => passes.some((p) => p.id === defaultSelectedId))
  const [cancelling, setCancelling] = useState(false)
  const pass = passes.find((p) => p.id === selectedId)
  const filters = useMemo(
    () => [
      { column: "town", label: "Town", options: TOWNS.map((t) => option(t)) },
      { column: "status", label: "Status", options: STATUSES.map((s) => option(s, statusLabel(s))) },
      { column: "blowoutWeek", label: "Blowout week", options: weekOptions(passes) },
    ],
    [passes],
  )
  const show = (next: Pass) => {
    setSelectedId(next.id)
    setOpen(true)
  }

  return (
    <div data-slot="passes-screen">
      <PageHeader title="Passes" context={passesContext(passes)} />
      <SidePanelLayout
        panel={
          pass && (
            <SidePanel
              open={open}
              onOpenChange={setOpen}
              title={pass.firstName}
              description={`Season Pass ${pass.season}, ${pass.number}`}
              footer={
                <>
                  <Button variant="outline" onClick={() => console.info("resend confirmation", [pass.number])}>
                    Resend confirmation
                  </Button>
                  <Button onClick={() => console.info("send card update link", [pass.number])}>Send card update link</Button>
                  <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => setCancelling(true)}>
                    Cancel pass
                  </Button>
                  <CancelDialog pass={pass} open={cancelling} onOpenChange={setCancelling} />
                </>
              }
            >
              <PassDetail pass={pass} today={today} />
            </SidePanel>
          )
        }
      >
        <DataGrid
          columns={passColumns}
          data={passes}
          getRowId={(p) => p.id}
          search={{ column: "firstName", placeholder: "Search by name" }}
          filters={filters}
          onOpen={show}
          bulkActions={BULK_ACTIONS}
          exportName="passes"
          pageSize={25}
          emptyTitle="No passes yet"
          emptyLine="Passes appear here as customers reserve their season."
        />
      </SidePanelLayout>
    </div>
  )
}
