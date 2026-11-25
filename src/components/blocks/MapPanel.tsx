"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Person, Visit } from "@/lib/admin/types"
import { DayMap } from "./DayMap"
import { personClass } from "./day-map-helpers"
import { SidePanel } from "./SidePanel"
import type { UnscheduledJob } from "./scheduler-panels-types"

// The map beside the week (docs/plans/2026-11-25-scheduler-design.md, 7.6): the existing DayMap in a docked SidePanel, with a chip per person to show or hide their stops (the pin and
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
  /** the day the map shows, "Tue, Nov 24" */
  day?: string
  hoverId?: string | null
  onHover?: (id: string | null) => void
  selectedId?: string
  onSelect?: (id: string | undefined) => void
  className?: string
}

const CHIP = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

export function MapPanel({ open, onOpenChange, stops, people, unscheduled, ghost, day, hoverId, onHover, selectedId, onSelect, className }: MapPanelProps) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [showUnscheduled, setShowUnscheduled] = useState(true)
  const toggle = (id: string) => setHidden((h) => (h.has(id) ? new Set([...h].filter((x) => x !== id)) : new Set([...h, id])))
  const shown = stops.filter((s) => !hidden.has(s.personId ?? ""))
  const jobPins = unscheduled && showUnscheduled ? unscheduled.filter((u) => typeof u.lat === "number" && typeof u.lng === "number").map((u) => ({ id: u.id, lat: u.lat!, lng: u.lng!, name: u.customer })) : []
  const hollow = ghost ? [...jobPins, ghost] : jobPins
  const empty = shown.every((s) => typeof s.lat !== "number") && hollow.length === 0
  return (
    <SidePanel variant="docked" open={open} onOpenChange={onOpenChange} title="Map" description={day} className={className}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Show on the map" data-slot="map-chips" className="flex flex-wrap gap-2">
          {people.map((p, i) => {
            const on = !hidden.has(p.id)
            return (
              <button key={p.id} type="button" aria-pressed={on} onClick={() => toggle(p.id)} className={cn(CHIP, on ? "border-navy bg-navy/5 text-navy" : "border-border bg-background text-muted-foreground")}>
                <span aria-hidden className={cn("size-3 rounded-full", personClass(i), !on && "opacity-40")} />
                {p.name}
              </button>
            )
          })}
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
        {empty && (
          <p role="status" className="text-sm text-muted-foreground">
            No stops on this day.
          </p>
        )}
      </div>
    </SidePanel>
  )
}
