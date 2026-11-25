"use client"

import { NotTold } from "@/components/blocks/NotTold"
import { RecordFooter } from "@/components/blocks/RecordFooter"
import { SidePanel } from "@/components/blocks/SidePanel"
import { firstNameOf } from "@/lib/admin/people"
import { visitWhen } from "./schedule-prototype-model"
import type { Proto } from "./use-schedule-prototype"

// A small summary of the selected visit (docs/plans/2026-11-25-scheduler-design.md, 7.1): the customer, the service, the time, the person and, when the customer was not told, the
// notice with Notify and Don't tell. The real visit panel is not rebuilt here; the live Schedule opens it through RecordHost.

export function ScheduleProtoVisit({ p }: { p: Proto }) {
  const b = p.state.visits.find((v) => v.id === p.selectedId)
  const meta = b ? p.state.meta[b.id] : undefined
  const who = b ? p.people.find((x) => x.id === b.personId) : undefined
  const facts: [string, string][] = b ? [["Service", b.service], ["When", visitWhen(b)], ["Person", firstNameOf(who?.name) ?? "No one yet"], ["Town", b.town]] : []
  return (
    <SidePanel
      open={Boolean(b)}
      onOpenChange={(o) => !o && p.setSelectedId(undefined)}
      title={meta?.customer ?? b?.name ?? "Visit"}
      description={b ? `${b.title}, ${b.town}` : undefined}
      footer={b ? <RecordFooter primary={{ label: "Move", onClick: () => p.setDialog({ kind: "move", id: b.id }) }} /> : undefined}
    >
      {b && (
        <div className="flex flex-col gap-4">
          {b.notTold && <NotTold variant="notice" onNotify={() => p.notify([b.id])} onDontTell={() => p.told([b.id])} />}
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </SidePanel>
  )
}
