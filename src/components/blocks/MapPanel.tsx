"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Person, Visit } from "@/lib/admin/types"
import { DayMap } from "./DayMap"
import { hoursWords } from "@/lib/admin/day-fill"
import { PeopleMenu } from "./PeopleMenu"
import { SidePanel } from "./SidePanel"
import type { UnscheduledJob } from "./scheduler-panels-types"

// The map beside the week (docs/plans/2026-11-25-scheduler-design.md, 7.6): the existing DayMap in a docked SidePanel, with the People control to show or hide a person's stops (the pin and
// the route keep that person's colour) and, when `unscheduled` is passed, a chip for the jobs with no day, drawn as hollow pins. `hoverId` lights one pin from outside (a row of the
// Unscheduled panel, a block on the week) and `onHover` reports a pin under the pointer back, so the three stay in step. Docked from 1280, a sheet from the bottom below. The map itself loads
// MapLibre on the client and shows DayMap's own fallback where there is no WebGL. Pure props, client component.

export interface MapPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the chosen day's stops, everyone's */
  stops: Visit[]
  people: Person[]
  /** jobs with no day; pass it to show the hollow pins and their chip */
  unscheduled?: readonly UnscheduledJob[]
  /** a place the office is looking at but has not booked (Find a time's chosen row), drawn as one more hollow pin whatever the chips say */
  ghost?: { id: string; lat: number; lng: number; name: string } | null
  /** the day the map shows, "Tue, Nov 24": the panel is titled with it */
  day?: string
  /** the days of the week, to choose which one the map shows (Week view); a day view passes none */
  days?: { day: string; label: string }[]
  dayValue?: string
  onDayChange?: (day: string) => void
  hoverId?: string | null
  onHover?: (id: string | null) => void
  selectedId?: string
  onSelect?: (id: string | undefined) => void
  /** each person's driving for the day shown, one line each at the bottom: "Ryan 1 h 12 min driving" */
  driving?: readonly { id: string; name: string; minutes: number }[]
  /** the People control for the map's own set of people: the Schedule draws its one People control in the toolbar instead, so it passes false */
  peopleMenu?: boolean
  className?: string
}

const CHIP = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

export function MapPanel({ open, onOpenChange, stops, people, unscheduled, ghost, day, days, dayValue, onDayChange, hoverId, onHover, selectedId, onSelect, driving, peopleMenu = true, className }: MapPanelProps) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [showUnscheduled, setShowUnscheduled] = useState(true)
  const toggle = (id: string) => setHidden((h) => (h.has(id) ? new Set([...h].filter((x) => x !== id)) : people.length - h.size > 1 ? new Set([...h, id]) : h))
  const shown = stops.filter((s) => !hidden.has(s.personId ?? ""))
  const jobPins = unscheduled && showUnscheduled ? unscheduled.filter((u) => typeof u.lat === "number" && typeof u.lng === "number").map((u) => ({ id: u.id, lat: u.lat!, lng: u.lng!, name: u.customer })) : []
  const hollow = ghost ? [...jobPins, ghost] : jobPins
  const empty = shown.every((s) => typeof s.lat !== "number") && hollow.length === 0
  return (
    <SidePanel variant="docked" open={open} onOpenChange={onOpenChange} title={day ? `Map, ${day}` : "Map"} className={className}>
      <div className="flex flex-col gap-3">
        {days && days.length > 0 && (
          <div role="group" aria-label="Day on the map" data-slot="map-days" className="flex flex-wrap gap-2">
            {days.map((d) => (
              <button key={d.day} type="button" aria-pressed={d.day === dayValue} onClick={() => onDayChange?.(d.day)} className={cn(CHIP, "px-3", d.day === dayValue ? "border-navy bg-navy text-white" : "border-border bg-background text-navy")}>
                {d.label}
              </button>
            ))}
          </div>
        )}
        <div role="group" aria-label="Show on the map" data-slot="map-chips" className="flex flex-wrap gap-2">
          {peopleMenu && <PeopleMenu people={people} hidden={[...hidden]} onToggle={toggle} />}
          {unscheduled && (
            <button type="button" aria-pressed={showUnscheduled} onClick={() => setShowUnscheduled((v) => !v)} className={cn(CHIP, showUnscheduled ? "border-navy bg-navy/5 text-navy" : "border-border bg-background text-muted-foreground")}>
              <span aria-hidden className="size-3 rounded-full border-2 border-dashed border-navy bg-background" />
              Unscheduled
            </button>
          )}
        </div>
        <DayMap
          stops={shown}
          people={people}
          hollow={hollow}
          hoverId={hoverId ?? undefined}
          onHover={(id) => onHover?.(id ?? null)}
          selectedId={selectedId}
          onSelect={(id) => onSelect?.(id)}
          className="h-72 lg:h-80"
        />
        {driving && driving.some((d) => d.minutes > 0) && (
          <ul data-slot="map-driving" aria-label="Driving" className="space-y-0.5 text-sm text-navy-light">
            {driving.filter((d) => d.minutes > 0).map((d) => <li key={d.id}>{`${d.name} ${hoursWords(d.minutes)} driving`}</li>)}
          </ul>
        )}
        {empty && (
          <p role="status" className="text-sm text-muted-foreground">
            No visits on this day.
          </p>
        )}
      </div>
    </SidePanel>
  )
}
