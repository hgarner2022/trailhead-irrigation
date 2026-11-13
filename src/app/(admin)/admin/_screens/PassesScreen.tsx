"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid } from "@/components/blocks/DataGrid"
import { passColumns } from "@/components/blocks/data-grid-columns"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SidePanel, SidePanelLayout } from "@/components/blocks/SidePanel"
import { statusLabel } from "@/components/blocks/StatusPill"
import type { AdminData, Pass } from "@/lib/admin/types"
import type { Outcome } from "./action-types"
import type { PassesActions } from "./passes-actions"
import { CancelDialog, PassDetail } from "./PassPanel"
import { passName, passesContext } from "./passes-model"

export type { PassesActions }

// Every Season Pass started, as the one data grid, with the pass opening
// beside it from its name. A pending pass is an unpaid attempt and says
// Pending, never Active; the Pending filter finds them. Each visit column
// and the panel's jobs, charges and season line read the same visit rows.
// On a laptop the panel pushes the grid narrower; on a phone it covers it as
// a sheet. Client because the selected pass is state (its id; the pass
// itself is read from `data.passes`, so a refreshed `data` shows in the open
// panel); the route's page.tsx supplies `data` and `today`. The bulk actions
// and the panel's buttons only log in the catalog.

export interface PassesScreenProps {
  data: AdminData
  /** ISO datetime the season line's today marker is read from */
  today: string
  /** The pass open on first render; for the catalog, since the prototype has no URL state */
  defaultSelectedId?: string
  /** a tech reads the passes and changes nothing: no buttons in the panel, no bulk actions */
  readOnly?: boolean
  actions?: PassesActions
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const STATUSES = ["pending", "active", "cancelled", "lapsed"] as const
const option = (value: string, label = value) => ({ value, label })

const log = (action: string) => (rows: Pass[]) => console.info(action, rows.map((p) => p.number))

export function PassesScreen({ data, today, defaultSelectedId, readOnly = false, actions }: PassesScreenProps) {
  const passes = data.passes
  // Only the id is state; the pass is read from `data` each render. The id is
  // kept while the panel closes, so the sheet slides out with its content.
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  const [open, setOpen] = useState(() => passes.some((p) => p.id === defaultSelectedId))
  const [cancelling, setCancelling] = useState(false)
  const [pending, start] = useTransition()
  const [notice, setNotice] = useState("")
  /** Runs one action; its refusal is said under the page title, where a person looks after a click. */
  const run = (call: () => Promise<Outcome>, done = "") =>
    start(async () => {
      const out = await call()
      setNotice(out.ok ? done : out.message)
    })
  /** One action for every selected pass, stopping at the first refusal and saying whose it was. */
  const bulk = (name: string, each: (passId: string) => Promise<Outcome>, done: string) => (rows: Pass[]) =>
    start(async () => {
      for (const row of rows) {
        const out = await each(row.id)
        if (!out.ok) return setNotice(`${name} stopped at ${passName(row)}: ${out.message}`)
      }
      setNotice(done)
    })
  const bulkActions = readOnly
    ? undefined
    : [
        { label: "Send card update link", onClick: actions ? bulk("Sending", actions.sendCardUpdateLink, "Card update links sent.") : log("send card update link") },
        { label: "Resend confirmation", onClick: actions ? bulk("Resending", actions.resendConfirmation, "Confirmations sent.") : log("resend confirmation") },
      ]
  const pass = passes.find((p) => p.id === selectedId)
  const filters = useMemo(
    () => [
      { column: "town", label: "Town", options: TOWNS.map((t) => option(t)) },
      { column: "status", label: "Status", options: STATUSES.map((s) => option(s, statusLabel(s))) },
    ],
    [],
  )
  const show = (next: Pass) => {
    setSelectedId(next.id)
    setOpen(true)
  }
  // A pending pass is an unpaid attempt: a resend or a card link would go to someone who has not bought.
  const canAct = !readOnly && pass?.status !== "pending"

  return (
    <div data-slot="passes-screen">
      <PageHeader title="Passes" context={passesContext(passes)} />
      <p role="status" className="mb-4 text-sm text-muted-foreground empty:hidden">
        {pass && open ? "" : notice}
      </p>
      <SidePanelLayout
        panel={
          pass && (
            <SidePanel
              open={open}
              onOpenChange={setOpen}
              title={passName(pass)}
              description={`Season Pass ${pass.season}, ${pass.number}`}
              footer={
                canAct ? (
                  <>
                    <Button variant="outline" disabled={pending} onClick={() => (actions ? run(() => actions.resendConfirmation(pass.id), "Confirmation sent.") : console.info("resend confirmation", [pass.number]))}>
                      Resend confirmation
                    </Button>
                    <Button disabled={pending} onClick={() => (actions ? run(() => actions.sendCardUpdateLink(pass.id), "Card update link sent.") : console.info("send card update link", [pass.number]))}>
                      Send card update link
                    </Button>
                    <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => setCancelling(true)}>
                      Cancel pass
                    </Button>
                    <CancelDialog pass={pass} open={cancelling} onOpenChange={setCancelling} onCancel={actions?.cancel} />
                  </>
                ) : undefined
              }
            >
              <PassDetail pass={pass} today={today} readOnly={readOnly} actions={actions} run={run} notice={notice} />
            </SidePanel>
          )
        }
      >
        <DataGrid
          columns={passColumns}
          data={passes}
          getRowId={(p) => p.id}
          search={{ column: "name", placeholder: "Search by name" }}
          filters={filters}
          onOpen={show}
          bulkActions={bulkActions}
          exportName="passes"
          pageSize={25}
          emptyTitle="No passes yet"
          emptyLine="Passes appear here as customers reserve their season."
        />
      </SidePanelLayout>
    </div>
  )
}
