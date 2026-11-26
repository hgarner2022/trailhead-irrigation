"use client"

import { ArrowDownUp, ChevronLeft, ChevronRight, Inbox, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PeopleMenu } from "@/components/blocks/PeopleMenu"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { firstNameOf } from "@/lib/admin/people"
import { shortDay } from "@/lib/admin/format"
import { rangeWords, shift, type View } from "./schedule-prototype-view"
import type { Proto } from "./use-schedule-prototype"

// The Schedule prototype's header (docs/plans/2026-11-25-scheduler-design.md, 7.1, with the reconciliation of Nov 25): the shell's bar holds the screen's name and the one filled button, New job (the
// shell's New job sheet, with the best times). Under it ONE quiet row from `md`: previous, next and Today with the range as the row's title ("Week of Nov 16"), then Week | Day | Month | List and People
// as a quiet control, and at the right Reorder stops and the two panel toggles, Unscheduled with its count and Map, joined as one. Only Today, the view switch and the toggles carry an edge; everything is
// 40 px tall. On a phone two rows: the arrows, the date and Today, then the view, People, Reorder stops, Unscheduled and Map as 44 px targets. Time off is set in Settings, People. Pure view over the hook.

const VIEWS = [
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "list", label: "List" },
] as const
const UNIT: Record<View, string> = { week: "week", day: "day", month: "month", list: "week" }
/** One of the joined toggles at the right: no edge of its own (the pair shares one), a soft navy fill when its panel is open. */
const TOGGLE = "rounded-none border-0 max-md:min-w-11 max-md:gap-1 max-md:px-2 md:px-3.5 aria-pressed:bg-navy/8 aria-pressed:text-navy"

export function ScheduleProtoHeader({ p }: { p: Proto }) {
  const { view, day } = p
  const range = view === "day" ? shortDay(day) : rangeWords(view, day)
  const reorder = (
    <>
      <ArrowDownUp className="size-4 md:hidden" aria-hidden />
      <span className="max-md:hidden">Reorder stops</span>
    </>
  )
  return (
    <>
      <PageHeader
        title="Schedule"
        className="max-md:sr-only"
        primary={
          <Button type="button" size="touch" onClick={() => p.onNewJob?.(view === "day" ? day : undefined)}>
            New job
          </Button>
        }
      />
      <div data-slot="schedule-phone-date" className="flex items-center gap-1 md:hidden">
        <Button type="button" variant="ghost" size="touch-icon" className="shrink-0" aria-label={`Previous ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, -1))}>
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="touch-icon" className="shrink-0" aria-label={`Next ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, 1))}>
          <ChevronRight className="size-5" aria-hidden />
        </Button>
        <p aria-live="polite" className="type-admin-title min-w-0 flex-1 truncate px-1 text-navy">{range}</p>
        {day !== p.today && (
          <Button type="button" variant="outline" size="touch" className="shrink-0 px-4" onClick={() => p.setDay(p.today)}>
            Today
          </Button>
        )}
      </div>
      <div data-slot="schedule-toolbar" className="flex items-center gap-x-1 gap-y-2 max-md:mt-2 md:flex-wrap md:gap-x-2">
        <div role="group" aria-label={`Go to another ${UNIT[view]}`} className="flex items-center max-md:hidden">
          <Button type="button" variant="ghost" size="icon" className="text-navy-light hover:text-navy" aria-label={`Previous ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, -1))}>
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-navy-light hover:text-navy" aria-label={`Next ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, 1))}>
            <ChevronRight className="size-5" aria-hidden />
          </Button>
          <Button type="button" variant="outline" className="ml-1 px-4" onClick={() => p.setDay(p.today)}>
            Today
          </Button>
        </div>
        <p data-slot="schedule-range" aria-live="polite" className="type-admin-card mr-2 min-w-0 truncate pl-2 text-navy max-md:hidden">{view === "day" ? rangeWords(view, day) : range}</p>
        <SegmentedControl label="Schedule view" dense compact options={VIEWS} value={view} onChange={(v) => p.setView(v as View)} className="max-md:min-w-0 max-md:flex-1" />
        <PeopleMenu people={p.people} hidden={p.hidden} onToggle={p.togglePerson} compact quiet />
        <div className="flex items-center gap-x-1 gap-y-2 md:ml-auto md:gap-x-2">
          {p.orderable.length === 1 && (
            <Button type="button" variant="ghost" size="adaptive" aria-label="Reorder stops" className="max-md:min-w-11 max-md:px-2 md:px-3" onClick={() => p.setDialog({ kind: "order", personId: p.orderable[0]!.id })}>
              {reorder}
            </Button>
          )}
          {p.orderable.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="adaptive" aria-label="Reorder stops" className="max-md:min-w-11 max-md:px-2 md:px-3">
                  {reorder}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {p.orderable.map((x) => <DropdownMenuItem key={x.id} className="min-h-11" onSelect={() => p.setDialog({ kind: "order", personId: x.id })}>{firstNameOf(x.name)}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div role="group" aria-label="Panels" data-slot="schedule-panel-toggles" className="flex items-stretch divide-x divide-border overflow-hidden rounded-lg border border-border bg-background">
            <Button type="button" variant="ghost" size="adaptive" aria-label={`Unscheduled (${p.state.unscheduled.length})`} className={TOGGLE} aria-pressed={p.panels.unscheduled} onClick={() => p.togglePanel("unscheduled")}>
              <Inbox className="size-4 md:hidden" aria-hidden />
              <span aria-hidden className="tabular-nums md:hidden">{p.state.unscheduled.length}</span>
              <span aria-hidden className="tabular-nums max-md:hidden">{`Unscheduled (${p.state.unscheduled.length})`}</span>
            </Button>
            <Button type="button" variant="ghost" size="adaptive" aria-label="Map" className={TOGGLE} aria-pressed={p.panels.map} onClick={() => p.togglePanel("map")}>
              <MapPin className="size-4 md:hidden" aria-hidden />
              <span className="max-md:hidden">Map</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
