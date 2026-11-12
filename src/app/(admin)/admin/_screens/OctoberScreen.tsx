"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import { EmptyState } from "@/components/blocks/EmptyState"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill } from "@/components/blocks/StatusPill"
import { WeekCard } from "@/components/blocks/WeekCard"
import type { AdminData, BlowoutWeek, Pass, PassStatus } from "@/lib/admin/types"
import { shortDate } from "@/lib/admin/format"
import { firstWeek, octoberContext, passesInWeek } from "./october-model"

// The blowout week planner: the season's weeks as cards, one selected, and
// the passes reserved for that week under them. "Edit capacity" turns the
// cards into their editable form; the change only logs in the prototype.
// Ryan places each blowout on a day in Jobber, so this page sets only how
// many pass blowouts fit in a week. Client because the selected week and
// the edit toggle are state; the route's page.tsx supplies `data`.

export interface OctoberScreenProps {
  data: AdminData
}

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

// The small grid under the week: name, town, zones, status. No bulk actions and no export.
const weekColumns: GridColumnDef<Pass>[] = [
  { id: "firstName", accessorKey: "firstName", header: "Name" },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "zones", accessorKey: "zones", header: "Zones", meta: { align: "right" } },
  { id: "status", accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusPill status={getValue() as PassStatus} /> },
]

const openPass = (pass: Pass) => console.info("open pass", pass.number)

// On a phone the cards are a horizontal snap row; from sm they are a grid, two across, then four.
const ROW = "flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4"
const CARD = "min-w-[220px] snap-start sm:min-w-0"

export function OctoberScreen({ data }: OctoberScreenProps) {
  const [weeks, setWeeks] = useState<BlowoutWeek[]>(data.blowoutWeeks)
  const [selected, setSelected] = useState<string | undefined>(() => firstWeek(data.blowoutWeeks))
  const [editing, setEditing] = useState(false)
  const week = weeks.find((w) => w.weekStart === selected)
  // Memoised because the grid rebuilds its models when its data changes identity.
  const inWeek = useMemo(() => (week ? passesInWeek(data.passes, week.weekStart) : []), [data.passes, week])

  const setCapacity = (weekStart: string, capacity: number) => {
    console.info("set capacity", weekStart, capacity)
    setWeeks((current) => current.map((w) => (w.weekStart === weekStart ? { ...w, capacity } : w)))
  }

  return (
    <div data-slot="october-screen" className="space-y-6">
      <PageHeader
        title="October"
        context={octoberContext(weeks)}
        actions={
          weeks.length > 0 && (
            <Button variant="outline" size="sm" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
              {editing ? "Done editing" : "Edit capacity"}
            </Button>
          )
        }
      />

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState title="No blowout weeks yet" line="The October weeks appear here once the season is set up." />
          </CardContent>
        </Card>
      ) : (
        <div data-slot="week-row" className={ROW}>
          {weeks.map((w) =>
            editing ? (
              <WeekCard key={w.weekStart} week={w} editable onCapacityChange={(capacity) => setCapacity(w.weekStart, capacity)} className={CARD} />
            ) : (
              <WeekCard key={w.weekStart} week={w} selected={w.weekStart === selected} onSelect={() => setSelected(w.weekStart)} className={CARD} />
            ),
          )}
        </div>
      )}

      {week && (
        <Card>
          <CardHeader>
            <Title>{`Week of ${shortDate(week.weekStart)}`}</Title>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataGrid
              columns={weekColumns}
              data={inWeek}
              getRowId={(p) => p.id}
              onOpen={openPass}
              pageSize={50}
              emptyTitle="No passes in this week yet"
              emptyLine="Passes with this blowout week appear here."
            />
            <p className="text-sm text-muted-foreground">Ryan places each blowout on a day in Jobber. This page only sets how many pass blowouts fit in a week.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
