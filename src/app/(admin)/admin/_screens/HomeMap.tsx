"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import type { Truck, Visit } from "@/lib/admin/types"
import { mapStops } from "./home-week"
import { ScheduleDayMap } from "./ScheduleDayMap"

// The map of the day Your week shows (Hannah: "maybe a map of where your things are"): the same DayMap the
// Schedule uses, a pin per stop in its truck's colour, a visit with no point at its town's centre. Client because
// the selected pin is state and the map draws in the browser.

export function HomeMap({ visits, trucks, className }: { visits: Visit[]; trucks: Truck[]; className?: string }) {
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const stops = useMemo(() => mapStops(visits), [visits])
  return (
    <Card data-slot="home-map" className={className}>
      <CardHeader>
        <CardTitleHeading>Map</CardTitleHeading>
      </CardHeader>
      <CardContent>
        <ScheduleDayMap className="h-80 min-w-0 lg:h-96" stops={stops} trucks={trucks} selectedId={selectedId} onSelect={setSelectedId} />
      </CardContent>
    </Card>
  )
}
