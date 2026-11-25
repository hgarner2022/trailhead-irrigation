"use client"

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { cn } from "@/lib/utils"
import { rangeWords, shift, type View } from "./schedule-prototype-view"
import type { Proto } from "./use-schedule-prototype"

// The Schedule prototype's header (docs/plans/2026-11-25-scheduler-design.md, 7.1, with the reconciliation of Nov 25): the title and range and the one filled button, New job (the
// shell's New job sheet, with the best times); on a phone a More menu with the day, week or month arrows and the shortcuts; under it previous, Today and next, Week | Day | Month | List,
// and at the right "N customers not notified", Unscheduled and Map. Time off is set in Settings, People. Pure view over the hook.

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
        context={rangeWords(view, day)}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" aria-label="More actions" className="min-h-11 md:hidden">
                  <MoreHorizontal className="size-4" aria-hidden />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem className="min-h-11" onSelect={() => p.setDay(shift(view, day, -1))}>{`Previous ${UNIT[view]}`}</DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onSelect={() => p.setDay(shift(view, day, 1))}>{`Next ${UNIT[view]}`}</DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onSelect={() => p.keys.setHelpOpen(true)}>Keyboard shortcuts</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        primary={
          <Button type="button" className="min-h-11" onClick={p.onNewJob}>
            New job
          </Button>
        }
      />
      <div data-slot="schedule-toolbar" className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="group" aria-label={`Go to another ${UNIT[view]}`} className={cn("items-center gap-1", view === "day" ? "flex" : "hidden md:flex")}>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`Previous ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, -1))}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => p.setDay(p.today)}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`Next ${UNIT[view]}`} onClick={() => p.setDay(shift(view, day, 1))}>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
        <SegmentedControl label="Schedule view" options={VIEWS} value={view} onChange={(v) => p.setView(v as View)} />
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 md:ml-auto md:gap-x-2">
          {p.notNotifiedCount > 0 && (
            <Button type="button" variant="ghost" className="min-h-11 px-2 text-warning-ink hover:bg-warning/14 hover:text-warning-ink" onClick={p.openNotNotified} aria-label={`${p.notNotifiedCount} ${p.notNotifiedCount === 1 ? "customer" : "customers"} not notified`}>
              {/* the full phrase is the name; on a phone it is a compact chip so Unscheduled and Map stay on the row */}
              <span aria-hidden className="md:hidden">{`${p.notNotifiedCount} not notified`}</span>
              <span aria-hidden className="hidden md:inline">{`${p.notNotifiedCount} ${p.notNotifiedCount === 1 ? "customer" : "customers"} not notified`}</span>
            </Button>
          )}
          <Button type="button" variant="outline" className={toggle(p.panels.unscheduled)} aria-pressed={p.panels.unscheduled} onClick={() => p.togglePanel("unscheduled")}>
            {`Unscheduled (${p.state.unscheduled.length})`}
          </Button>
          <Button type="button" variant="outline" className={toggle(p.panels.map)} aria-pressed={p.panels.map} onClick={() => p.togglePanel("map")}>
            Map
          </Button>
        </div>
      </div>
    </>
  )
}
