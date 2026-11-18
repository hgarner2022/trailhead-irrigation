"use client"

import Link from "next/link"
import { useState, useSyncExternalStore } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AREA_SWATCHES } from "@/components/blocks/area-colours"
import { TodayGroup } from "@/components/blocks/TodayGroup"
import { TodayVisitRow } from "@/components/blocks/TodayVisitRow"
import { cn } from "@/lib/utils"
import type { AreaGroup } from "@/lib/admin/types"
import { useOpenVisit } from "./VisitPanelHost"
import type { TodayRow, TodayView } from "./today-model"

// Today's visits (owner, 17 Nov 2026, after Jobber's "Today's appointments": "today's visits in our language"): a By visit /
// By person toggle over the same rows. By visit is three groups, Past its window, Ahead today and Done today; By person is
// each person's day under their name and initials, in route order, the number the map pin carries. The choice is kept per
// browser. Every row opens the visit panel. The area legend sits above the rows because the bar on a row is the area.
// Client component: the toggle, the stored choice and the click.

type View = "visit" | "person"
const STORE = "trailhead.home.today-view"

// The stored choice is read as an external store, so the server and the first client render both say By visit and the stored choice
// follows. A change is held in the component as well, so a blocked or private browser still switches for the page.
function readStored(): View {
  try {
    return window.localStorage.getItem(STORE) === "person" ? "person" : "visit"
  } catch {
    return "visit"
  }
}
const subscribe = () => () => {}

function Row({ row, byPerson, onOpen }: { row: TodayRow; byPerson?: boolean; onOpen: (id: string) => void }) {
  return <TodayVisitRow {...row} route={byPerson ? row.route : undefined} onOpen={onOpen} />
}

function AreaLegend({ areas }: { areas: AreaGroup[] }) {
  if (areas.length === 0) return null
  return (
    <ul data-slot="today-area-legend" aria-label="Areas" className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      {areas.map((area, i) => (
        <li key={area.id} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", AREA_SWATCHES[i % AREA_SWATCHES.length])} />
          {area.name}
        </li>
      ))}
    </ul>
  )
}

export interface TodayVisitsProps {
  view: TodayView
  areas: AreaGroup[]
  /** the next day with visits when today has none, as a link to it on the Schedule */
  next?: { day: string; heading: string }
  className?: string
}

export function TodayVisits({ view, areas, next, className }: TodayVisitsProps) {
  const open = useOpenVisit()
  const stored = useSyncExternalStore(subscribe, readStored, () => "visit" as View)
  const [picked, setPicked] = useState<View | undefined>()
  const choice = picked ?? stored
  const change = (value: string) => {
    const next: View = value === "person" ? "person" : "visit"
    setPicked(next)
    try {
      window.localStorage.setItem(STORE, next)
    } catch {
      // private window or blocked storage: the choice just is not kept past this page
    }
  }
  const onOpen = (id: string) => open?.(id)
  const { groups, people } = view
  return (
    <div data-slot="today-visits" className={cn("space-y-4", className)}>
      <Tabs value={choice} onValueChange={change}>
        <TabsList aria-label="Group today's visits" className="w-full sm:w-fit">
          <TabsTrigger value="visit" className="flex-1 sm:flex-none">
            By visit
          </TabsTrigger>
          <TabsTrigger value="person" className="flex-1 sm:flex-none">
            By person
          </TabsTrigger>
        </TabsList>
        <div className="mt-2">
          <AreaLegend areas={areas} />
        </div>
        <TabsContent value="visit" className="space-y-5">
          {(["past", "ahead", "done"] as const).map((group) => (
            <TodayGroup key={group} group={group} count={groups[group].length}>
              {groups[group].map((row) => (
                <Row key={row.id} row={row} onOpen={onOpen} />
              ))}
            </TodayGroup>
          ))}
        </TabsContent>
        <TabsContent value="person" className="space-y-5">
          {people.length === 0 && <p className="text-sm text-muted-foreground">Nothing here</p>}
          {people.map((person) => (
            <section key={person.personId} data-slot="today-person" aria-labelledby={`today-person-${person.personId}`} className="space-y-2">
              <h3 id={`today-person-${person.personId}`} className="text-sm font-medium text-navy">
                {person.name}
                <span className="ml-2 font-normal text-muted-foreground">{person.rows.length === 1 ? "1 visit" : `${person.rows.length} visits`}</span>
              </h3>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {person.rows.map((row) => (
                  <Row key={row.id} row={row} byPerson onOpen={onOpen} />
                ))}
              </ul>
            </section>
          ))}
        </TabsContent>
      </Tabs>
      {next && view.rows.length === 0 && (
        <p data-slot="today-next" className="text-sm text-muted-foreground">
          Next up:{" "}
          <Link href={`/admin/schedule?day=${next.day}`} className="rounded-sm text-foreground underline underline-offset-4 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            {next.heading}
          </Link>
        </p>
      )}
    </div>
  )
}
