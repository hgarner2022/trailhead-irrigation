"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FindATime } from "@/components/blocks/FindATime"
import { FormRow } from "@/components/blocks/FormRow"
import { SidePanel } from "@/components/blocks/SidePanel"
import { CUSTOMERS, SERVICES } from "./schedule-prototype-data"
import type { Proto } from "./use-schedule-prototype"

// The prototype New job sheet (docs/plans/2026-11-25-scheduler-design.md, 7.7): Customer, Address, Service, then Find a time. Picking a row lights a dotted block on the grid and a pin on
// the map (the screen reads `newJob.ghost`); Add job places the visit, Add without a day leaves it in Unscheduled. Opened from an Unscheduled row it is Find a time for that job and the
// footer says Place. A docked panel from 1280, so the week stays in view; a sheet from the bottom on a phone. Fixtures only: no customer is saved.

const SELECT = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:text-sm"

export function ScheduleProtoNewJob({ p, className }: { p: Proto; className?: string }) {
  const nj = p.newJob
  const { draft } = nj
  const list = useRef<HTMLDivElement>(null)
  // The openings sit under the fields: when they arrive, and when one is chosen (the map opens beside it and the panel gets shorter), the panel's own body scrolls to
  // the top of the list, so the whole list stays in view with the chosen row marked. Only that region moves, never the page.
  useEffect(() => {
    const el = list.current
    const body = el?.closest<HTMLElement>("[role=region]")
    if (nj.findState === "results" && el && body) body.scrollTo?.({ top: body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 8 })
  }, [nj.findState, draft.pickId])
  const make = () => {
    const id = `n-${p.state.seq + 1}`
    if (nj.job && nj.pick) {
      p.dispatch({ type: "place", jobId: nj.job.id, to: { day: nj.pick.day, personId: nj.pick.personId, start: nj.ghost?.start ?? null } })
    } else {
      const made = nj.visit(id)
      if (made) p.dispatch({ type: "add", visit: made.visit, meta: made.meta })
    }
    nj.close()
  }
  const later = () => {
    const job = nj.unscheduledJob(`u-${p.state.seq + 5}`)
    if (job) p.dispatch({ type: "add-unscheduled", job })
    nj.close()
  }
  return (
    <SidePanel
      variant="docked"
      open={nj.open}
      onOpenChange={(o) => !o && nj.close()}
      title={nj.job ? "Find a time" : "New job"}
      className={className}
      footer={
        <>
          <Button type="button" className="min-h-11" disabled={!nj.canAdd} onClick={make}>
            {nj.job ? "Place" : "Add job"}
          </Button>
          {!nj.job && (
            <Button type="button" variant="outline" className="min-h-11" disabled={!nj.unscheduledJob("check")} onClick={later}>
              Add without a day
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {nj.job ? (
          <p className="text-sm text-foreground">
            <span className="block font-medium">{`${nj.job.customer} · ${nj.job.town}`}</span>
            <span className="block text-muted-foreground">{`${nj.job.service} · ${nj.job.length}`}</span>
          </p>
        ) : (
          <>
            <FormRow label="Customer">
              <select
                value={draft.customerId}
                className={SELECT}
                onChange={(e) => {
                  const c = CUSTOMERS.find((x) => x.id === e.target.value)
                  nj.set({ customerId: e.target.value, address: c?.address ?? draft.address, search: "idle", pickId: null })
                }}
              >
                <option value="">Choose a customer</option>
                {CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Address">
              <Input value={draft.address} className="min-h-11" autoComplete="off" onChange={(e) => nj.set({ address: e.target.value, search: "idle", pickId: null })} />
            </FormRow>
            <FormRow label="Service">
              <select value={draft.service} className={SELECT} onChange={(e) => nj.set({ service: e.target.value, search: "idle", pickId: null })}>
                {SERVICES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormRow>
          </>
        )}
        <div ref={list}>
          <FindATime
            state={nj.findState}
            openings={nj.found.openings}
            forced={nj.found.forced}
            sort={draft.sort}
            onSort={(sort) => nj.set({ sort })}
            selectedId={draft.pickId}
            onPick={(row) => p.pickRow(row.id)}
            estimated
            forcedTicked={draft.ticked}
            onForcedTicked={(ticked) => nj.set({ ticked })}
            noneBefore="Dec 7"
            onFind={nj.find}
          />
        </div>
      </div>
    </SidePanel>
  )
}
