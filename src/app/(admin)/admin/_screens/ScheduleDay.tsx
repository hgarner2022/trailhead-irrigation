"use client"

import type { DragEvent } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StopRow } from "@/components/blocks/StopRow"
import { areaIndexOf } from "@/components/blocks/area-colours"
import { personClass } from "@/components/blocks/day-map-helpers"
import { cn } from "@/lib/utils"
import type { AreaGroup, Person, Visit } from "@/lib/admin/types"
import { KIND_WORDS } from "@/lib/admin/format"
import { dayVisits, worksOn } from "@/lib/admin/calendar"
import { dayFill, fillWords, townsWords } from "@/lib/admin/day-fill"
import { stopTime } from "./home-model"
import { ScheduleDayMap } from "./ScheduleDayMap"

// The Schedule's Day view (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): the day's stops per person, in order, each person's list headed by their route colour and
// their count, beside one map that draws every route in its person's colour with the pins numbered per person. A stop is a `StopRow`; dragging it onto
// another person's list moves it to that person on this day (the Move path underneath, which texts), and a person's list on a day they do not work refuses the drop.
// The line under the day's name is the same fill and towns the week's header carries. Client because of the drops.

export interface ScheduleDayProps {
  day: string
  /** every visit; the day keeps its own */
  visits: Visit[]
  people: Person[]
  areas: AreaGroup[]
  timeZone: string
  selectedId?: string
  onSelect: (id: string | undefined) => void
  /** a drop on a person's list; without it the stops are not draggable (a tech reads the day) */
  onMove?: (visitId: string, personId: string, dayIso: string) => void
  className?: string
}

function PersonStops({ person, index, day, stops, areas, selectedId, onSelect, onMove }: { person: Person; index: number; day: string; stops: Visit[]; areas: AreaGroup[] } & Pick<ScheduleDayProps, "selectedId" | "onSelect" | "onMove">) {
  const working = worksOn(person, day)
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const id = event.dataTransfer.getData("text/plain")
    if (id) onMove?.(id, person.id, day)
  }
  return (
    <section
      data-slot="day-person"
      data-person={person.id}
      aria-label={person.name}
      onDragOver={working && onMove ? (event) => event.preventDefault() : undefined}
      onDrop={working && onMove ? onDrop : undefined}
      className={cn("space-y-2 rounded-lg", !working && "bg-stone p-2")}
    >
      <h3 className="flex items-center gap-2 text-sm font-medium text-navy">
        <span aria-hidden data-slot="person-colour" className={cn("size-2.5 shrink-0 rounded-full", personClass(index))} />
        {person.name}
        <span className="font-normal text-muted-foreground">{stops.length === 1 ? "1 stop" : `${stops.length} stops`}</span>
      </h3>
      {stops.length === 0 ? (
        <p className="text-sm text-muted-foreground">{working ? "No stops." : "Not a working day."}</p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {stops.map((v, i) => (
            <StopRow
              key={v.id}
              id={v.id}
              number={v.stopOrder ?? i + 1}
              time={stopTime(v)}
              name={v.clientName}
              town={v.town}
              service={KIND_WORDS[v.kind]}
              areaIndex={areaIndexOf(v.town, areas)}
              selected={v.id === selectedId}
              moved={Boolean(v.exception)}
              draggable={Boolean(onMove)}
              onOpen={onSelect}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

export function ScheduleDay({ day, visits, people, areas, timeZone, selectedId, onSelect, onMove, className }: ScheduleDayProps) {
  const stops = dayVisits(visits, day, undefined, timeZone)
  const fill = dayFill(visits, day, people, timeZone)
  const known = new Set(people.map((p) => p.id))
  const loose = stops.filter((v) => !v.personId || !known.has(v.personId))
  return (
    <div data-slot="schedule-day-view" className={cn("space-y-4", className)}>
      <p data-slot="day-fill" className="text-sm text-muted-foreground">{[fillWords(fill), townsWords(fill)].filter(Boolean).join(". ")}</p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <SectionHeading level={2}>Stops by person</SectionHeading>
          </CardHeader>
          <CardContent className="space-y-5">
            {people.map((person, i) => (
              <PersonStops key={person.id} person={person} index={i} day={day} stops={dayVisits(stops, day, person.id, timeZone)} areas={areas} selectedId={selectedId} onSelect={onSelect} onMove={onMove} />
            ))}
            {loose.length > 0 && (
              <section aria-label="No one yet" className="space-y-2">
                <h3 className="text-sm font-medium text-navy">No one yet</h3>
                <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {loose.map((v, i) => (
                    <StopRow key={v.id} id={v.id} number={i + 1} time={stopTime(v)} name={v.clientName} town={v.town} service={KIND_WORDS[v.kind]} areaIndex={areaIndexOf(v.town, areas)} selected={v.id === selectedId} draggable={Boolean(onMove)} onOpen={onSelect} />
                  ))}
                </ol>
              </section>
            )}
          </CardContent>
        </Card>
        <ScheduleDayMap className="min-w-0" stops={stops} people={people} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </div>
  )
}
