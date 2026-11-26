"use client"

import { ArrowDownUp, ChevronLeft, ChevronRight, Inbox, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PeopleMenu } from "@/components/blocks/PeopleMenu"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { firstNameOf } from "@/lib/admin/people"
import { cn } from "@/lib/utils"
import { shortDay } from "@/emails/format"
import { rangeWords, shift, type View } from "./schedule-prototype-view"
import type { Proto } from "./use-schedule-prototype"

// The Schedule prototype's header (docs/plans/2026-11-25-scheduler-design.md, 7.1, with the reconciliation of Nov 25): the title and range and the one filled button, New job (the
// shell's New job sheet, with the best times); on a phone four rows at most (title, People, view, Unscheduled and Map) with the arrows and Today in a More menu; under it previous, Today and next, Week | Day | Month | List,
// and at the right People, Reorder stops, Unscheduled and Map. Time off is set in Settings, People. Pure view over the hook.

const VIEWS = [
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "list", label: "List" },
] as const
const UNIT: Record<View, string> = { week: "week", day: "day", month: "month", list: "week" }
const TOGGLE = "min-h-11"

export function ScheduleProtoHeader({ p }: { p: Proto }) {
  const { view, day } = p
  const toggle = (on: boolean) => cn(TOGGLE, on && "border-navy bg-navy/5")
  return (
    <>
      <PageHeader
        title="Schedule"
        className="max-md:sr-only"
        context={rangeWords(view, day)}
        primary={
          <Button type="button" className="min-h-11" onClick={() => p.onNewJob?.(view === "day" ? day : undefined)}>
            New job
          </Button>
        }
      />
      <div data-slot="schedule-phone-date" className="flex items-center gap-1 md:hidden">
        <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label={`Previous ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, -1))}>
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label={`Next ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, 1))}>
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <p aria-live="polite" className="type-admin-title min-w-0 flex-1 truncate px-1 text-navy">{view === "day" ? shortDay(day) : rangeWords(view, day)}</p>
        {day !== p.today && (
          <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => p.setDay(p.today)}>
            Today
          </Button>
        )}
      </div>
      <div data-slot="schedule-toolbar" className="flex items-center gap-x-1 gap-y-2 max-md:mt-2 md:flex-wrap md:gap-x-3">
        <div role="group" aria-label={`Go to another ${UNIT[view]}`} className="flex items-center gap-1 max-md:hidden">
          <Button type="button" variant="outline" size="icon" className={cn("size-11", view !== "day" && "hidden md:inline-flex")} aria-label={`Previous ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, -1))}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" className={cn("min-h-11", (view === "week" || view === "day") && "hidden md:inline-flex")} onClick={() => p.setDay(p.today)}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" className={cn("size-11", view !== "day" && "hidden md:inline-flex")} aria-label={`Next ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, 1))}>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
        <SegmentedControl label="Schedule view" dense options={VIEWS} value={view} onChange={(v) => p.setView(v as View)} className="max-md:min-w-0 max-md:flex-1 md:order-2" />
        <PeopleMenu people={p.people} hidden={p.hidden} onToggle={p.togglePerson} compact className="md:order-1" />
        <div className="flex items-center gap-x-1 gap-y-2 md:order-3 md:ml-auto md:flex-wrap md:gap-x-2">
          {p.orderable.length === 1 && (
            <Button type="button" variant="outline" aria-label="Reorder stops" className="min-h-11 max-md:min-w-11 max-md:px-2" onClick={() => p.setDialog({ kind: "order", personId: p.orderable[0]!.id })}>
              <ArrowDownUp className="size-4 md:hidden" aria-hidden />
              <span className="max-md:hidden">Reorder stops</span>
            </Button>
          )}
          {p.orderable.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" aria-label="Reorder stops" className="min-h-11 max-md:min-w-11 max-md:px-2">
                  <ArrowDownUp className="size-4 md:hidden" aria-hidden />
                  <span className="max-md:hidden">Reorder stops</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {p.orderable.map((x) => <DropdownMenuItem key={x.id} className="min-h-11" onSelect={() => p.setDialog({ kind: "order", personId: x.id })}>{firstNameOf(x.name)}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button type="button" variant="outline" aria-label={`Unscheduled (${p.state.unscheduled.length})`} className={cn(toggle(p.panels.unscheduled), "max-md:min-w-11 max-md:gap-1 max-md:px-2")} aria-pressed={p.panels.unscheduled} onClick={() => p.togglePanel("unscheduled")}>
            <Inbox className="size-4 md:hidden" aria-hidden />
            <span aria-hidden className="md:hidden">{p.state.unscheduled.length}</span>
            <span aria-hidden className="max-md:hidden">{`Unscheduled (${p.state.unscheduled.length})`}</span>
          </Button>
          <Button type="button" variant="outline" aria-label="Map" className={cn(toggle(p.panels.map), "max-md:min-w-11 max-md:px-2")} aria-pressed={p.panels.map} onClick={() => p.togglePanel("map")}>
            <MapPin className="size-4 md:hidden" aria-hidden />
            <span className="max-md:hidden">Map</span>
          </Button>
        </div>
      </div>
    </>
  )
}
