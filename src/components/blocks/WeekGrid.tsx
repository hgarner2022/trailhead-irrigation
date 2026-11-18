"use client"

import { useState, type DragEvent } from "react"
import { ChevronLeft, ChevronRight, Plus, TriangleAlert, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AreaGroup, Person, Visit } from "@/lib/admin/types"
import { addDays, dayLabel, dayVisits, weekDays, weekOf, weekVisits, worksOn } from "@/lib/admin/calendar"
import { EmptyState } from "./EmptyState"
import { areaBorder, areaIndexOf, areaSwatch } from "./area-colours"
import { KIND_WORDS } from "@/lib/admin/format"

// The week by person: one row per person on the schedule, Monday to Sunday across in seven equal columns after a fixed,
// narrow Who column. The week is never narrower than 56rem: below that the table scrolls sideways inside its own box,
// and the side panel, an overlay, never changes its width. Every visit is a one-line block ("Hannah · Erie · turn-on",
// cut with an ellipsis and the full words in its title when the column is tight) with a bar in its area's colour, marked when Ryan moved it. A block is a button: click or Enter selects
// it, and it can be dragged to another cell, which calls `onMove`; a cell on
// a day the person does not work refuses the drop. Under `md` the same data
// is one day at a time with the people stacked, stepped by the day buttons.
// Both layouts are in the DOM and CSS picks one, so the block renders the
// same on the server. The week's actions (Schedule) belong to the page
// header, not the grid. Client because the filters and the phone's day
// are state.

export interface WeekGridProps {
  /** the people on the schedule, a row each */
  people: Person[]
  areas: AreaGroup[]
  /** every visit; the grid keeps the week's */
  visits: Visit[]
  /** the Monday, YYYY-MM-DD */
  weekStart: string
  /** YYYY-MM-DD, marked in the header */
  today: string
  timeZone: string
  selectedId?: string
  onSelect: (visitId: string | undefined) => void
  /** a drop on a cell; without it the visits are not draggable (a tech reads the week) */
  onMove?: (visitId: string, personId: string, dayIso: string) => void
  onWeekChange: (weekStart: string) => void
  /** "New job" on a day's column header: opens the sheet with that day filled; without it the columns have no button (a tech reads the week) */
  onNewJob?: (day: string) => void
  className?: string
}

const areaIndex = (visit: Visit, areas: AreaGroup[]) => areaIndexOf(visit.town, areas)

function VisitBlock({ visit, areas, selected, onSelect, draggable }: { visit: Visit; areas: AreaGroup[]; selected: boolean; onSelect: (id: string | undefined) => void; draggable: boolean }) {
  const index = areaIndex(visit, areas)
  const onDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("text/plain", visit.id)
    event.dataTransfer.effectAllowed = "move"
  }
  return (
    <button
      type="button"
      data-slot="week-grid-visit"
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      aria-pressed={selected}
      onClick={() => onSelect(selected ? undefined : visit.id)}
      className={cn(
        "relative flex w-full items-center gap-1 overflow-hidden rounded-lg border border-border border-l-4 bg-background px-2 py-1.5 text-left text-xs leading-tight transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        areaBorder(index),
        selected && "ring-2 ring-primary/50",
        draggable && "cursor-grab",
      )}
    >
      <span className="relative block min-w-0 flex-1 truncate" title={`${visit.clientName} · ${visit.town} · ${KIND_WORDS[visit.kind]}`}>
        <span className="font-medium text-foreground">{visit.clientName}</span>
        <span className="text-muted-foreground">{` · ${visit.town} · ${KIND_WORDS[visit.kind]}`}</span>
      </span>
      {visit.exception && (
        <>
          <TriangleAlert className="relative size-3.5 shrink-0 text-warning" aria-hidden />
          <span className="sr-only">, moved</span>
        </>
      )}
    </button>
  )
}

function Cell({ person, day, visits, areas, selectedId, onSelect, onMove }: { person: Person; day: string; visits: Visit[]; areas: AreaGroup[]; selectedId?: string; onSelect: WeekGridProps["onSelect"]; onMove: WeekGridProps["onMove"] }) {
  const working = worksOn(person, day)
  const onDrop = (event: DragEvent<HTMLTableCellElement>) => {
    event.preventDefault()
    const id = event.dataTransfer.getData("text/plain")
    if (id) onMove?.(id, person.id, day)
  }
  return (
    <td
      data-slot="week-grid-cell"
      data-day={day}
      data-person={person.id}
      onDragOver={working ? (event) => event.preventDefault() : undefined}
      onDrop={working && onMove ? onDrop : undefined}
      className={cn("h-24 space-y-1 overflow-hidden border-l border-border p-1.5 align-top", !working && "bg-stone")}
    >
      {!working && visits.length === 0 && <span className="sr-only">Not a working day</span>}
      {visits.map((visit) => (
        <VisitBlock key={visit.id} visit={visit} areas={areas} selected={visit.id === selectedId} onSelect={onSelect} draggable={Boolean(onMove)} />
      ))}
    </td>
  )
}

/** The "+" on a day's column header: New job with that day filled in. */
function NewJobOnDay({ day, onNewJob }: { day: string; onNewJob: (day: string) => void }) {
  return (
    <button
      type="button"
      data-slot="week-grid-new-job"
      aria-label={`New job on ${dayLabel(day)}`}
      title="New job"
      onClick={() => onNewJob(day)}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-cream hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <Plus className="size-4" aria-hidden />
    </button>
  )
}

function Legend({ areas }: { areas: AreaGroup[] }) {
  return (
    <ul data-slot="week-grid-legend" className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      {areas.map((area, i) => (
        <li key={area.id} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", areaSwatch(i))} />
          {area.name}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <TriangleAlert className="size-3 text-warning" aria-hidden />
        Moved
      </li>
    </ul>
  )
}

function Stepper({ label, onPrevious, onNext, onToday, children }: { label: string; onPrevious: () => void; onNext: () => void; onToday: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label={`Previous ${label}`} onClick={onPrevious}>
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <Button variant="outline" onClick={onToday}>
        Today
      </Button>
      <Button variant="outline" size="icon" aria-label={`Next ${label}`} onClick={onNext}>
        <ChevronRight className="size-4" aria-hidden />
      </Button>
      {children}
    </div>
  )
}

export function WeekGrid({ people, areas, visits, weekStart, today, timeZone, selectedId, onSelect, onMove, onWeekChange, onNewJob, className }: WeekGridProps) {
  const [personFilter, setPersonFilter] = useState("all")
  const [areaFilter, setAreaFilter] = useState("all")
  const [dayChoice, setDayChoice] = useState<string | null>(null)
  if (people.length === 0) {
    return <EmptyState className={className} icon={Users} title="No people yet" line="Add a person with a truck in Settings and the week fills in from the calendar." />
  }
  const days = weekDays(weekStart)
  const area = areas.find((a) => a.id === areaFilter)
  const shown = weekVisits(visits, weekStart, timeZone).filter((v) => !area || area.towns.includes(v.town))
  const rows = people.filter((p) => personFilter === "all" || p.id === personFilter)
  const phoneDay = dayChoice && days.includes(dayChoice) ? dayChoice : days.includes(today) ? today : weekStart
  const stepDay = (n: number) => {
    const next = addDays(phoneDay, n)
    if (!days.includes(next)) onWeekChange(addDays(weekStart, 7 * n))
    setDayChoice(next)
  }
  const goToday = () => {
    onWeekChange(weekOf(today, timeZone))
    setDayChoice(today)
  }
  const filters = (
    <>
      <Select value={personFilter} onValueChange={setPersonFilter}>
        <SelectTrigger aria-label="Who" className="ml-auto bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={areaFilter} onValueChange={setAreaFilter}>
        <SelectTrigger aria-label="Area" className="bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All areas</SelectItem>
          {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  )
  return (
    <div data-slot="week-grid" className={cn("space-y-3", className)}>
      <div className="hidden md:block">
        <Stepper label="week" onPrevious={() => onWeekChange(addDays(weekStart, -7))} onNext={() => onWeekChange(addDays(weekStart, 7))} onToday={goToday}>
          {filters}
        </Stepper>
        <div role="region" aria-label="Week by person" tabIndex={0} className="mt-3 overflow-x-auto rounded-lg border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-28 px-3 py-2 text-left font-display text-sm uppercase tracking-wide text-muted-foreground">Who</th>
                {days.map((day) => (
                  <th key={day} scope="col" aria-current={day === today ? "date" : undefined} className={cn("border-l border-border px-2 py-2 text-left font-display text-sm uppercase tracking-wide", day === today ? "bg-primary/10 text-primary-deep" : "text-muted-foreground")}>
                    <span className="flex items-center justify-between gap-1">
                      <span>
                        {dayLabel(day)}
                        {day === today && <span className="sr-only">, today</span>}
                      </span>
                      {onNewJob && <NewJobOnDay day={day} onNewJob={onNewJob} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr key={person.id} className="border-b border-border last:border-0">
                  <th scope="row" className="truncate px-3 py-2 text-left align-top font-medium text-foreground">{person.name}</th>
                  {days.map((day) => (
                    <Cell key={day} person={person} day={day} visits={dayVisits(shown, day, person.id, timeZone)} areas={areas} selectedId={selectedId} onSelect={onSelect} onMove={onMove} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="md:hidden" data-slot="week-grid-day">
        <Stepper label="day" onPrevious={() => stepDay(-1)} onNext={() => stepDay(1)} onToday={goToday} />
        <div className="mt-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl text-navy">{dayLabel(phoneDay)}{phoneDay === today && <span className="text-muted-foreground"> · today</span>}</h2>
          {onNewJob && (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onNewJob(phoneDay)}>
              New job
            </Button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">{filters}</div>
        {rows.map((person) => {
          const list = dayVisits(shown, phoneDay, person.id, timeZone)
          return (
            <section key={person.id} aria-label={person.name} className="mt-4">
              <h3 className="font-display text-sm uppercase tracking-wide text-muted-foreground">{person.name}</h3>
              {list.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">{worksOn(person, phoneDay) ? "No visits." : "Not a working day."}</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {list.map((visit) => (
                    <li key={visit.id}><VisitBlock visit={visit} areas={areas} selected={visit.id === selectedId} onSelect={onSelect} draggable={false} /></li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
      <Legend areas={areas} />
    </div>
  )
}
