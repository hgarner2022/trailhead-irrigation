"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { PERSON_CLASSES } from "@/components/blocks/day-map-helpers"
import { cn } from "@/lib/utils"
import type { Person, Visit } from "@/lib/admin/types"
import { mapStops } from "./home-week"
import { ScheduleDayMap } from "./ScheduleDayMap"
import { useOpenVisit } from "./RecordHost"

// The map of today (Hannah: "maybe a map of where your things are"): the same DayMap the Schedule uses, a pin per stop numbered
// in its person's route and coloured by that person, a visit with no point at its town's centre.
// A pin opens the same visit panel the rows do. The legend names each person by their pin colour. Client because the selected pin is state and the map
// draws in the browser.

export function HomeMap({ visits, people, className }: { visits: Visit[]; people: Person[]; className?: string }) {
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const open = useOpenVisit()
  const stops = useMemo(() => mapStops(visits), [visits])
  const select = (id: string | undefined) => {
    setSelectedId(id)
    if (id) open?.(id)
  }
  // every stop done (or none booked): a blank map with no pins reads as broken, so the card says it instead
  const left = stops.some((v) => v.status !== "completed")
  return (
    <Card data-slot="home-map" className={className}>
      <CardHeader>
        <SectionHeading level={2}>Map</SectionHeading>
      </CardHeader>
      <CardContent className="space-y-3">
        {left ? (
          <>
            <ScheduleDayMap className="h-80 min-w-0 lg:h-96" stops={stops} people={people} selectedId={selectedId} onSelect={select} />
            <ul data-slot="home-map-legend" aria-label="People on the map" className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              {people.map((person, i) => (
                <li key={person.id} className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2.5 rounded-full", PERSON_CLASSES[i % PERSON_CLASSES.length])} />
                  {person.name}
                </li>
              ))}
              <li>Numbers are the order of each person&rsquo;s day.</li>
            </ul>
          </>
        ) : (
          <p data-slot="home-map-empty" className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-cream text-sm text-muted-foreground">
            No stops left today
          </p>
        )}
      </CardContent>
    </Card>
  )
}
