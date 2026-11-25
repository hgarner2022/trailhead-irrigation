"use client"

import { useRef, useState, type KeyboardEvent } from "react"
import { Check, MapPinOff, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"
import { SegmentedControl } from "./SegmentedControl"
import { shortDay } from "@/emails/format"
import { recommendedId, sortOpenings, timeRange, type OpeningSort } from "./find-a-time-model"
import type { Opening } from "./scheduler-panels-types"

// The office's ranked list of openings, inside New job (docs/plans/2026-11-25-scheduler-design.md, 7.7). Ryan types an address and a service and sees the best few
// times, each with the minutes it adds to his driving. Picking a row selects it (the screen lights the calendar and the map from `onPick`). Rows that break a rule
// are behind "Show all times", greyed with the engine's own words, and need one tick, "Book it anyway". The drive times are estimates until a road lookup answers, and the
// grey note says so. Controlled: the screen holds the sort, the pick and the tick. Pure props, client component.

/** `ready`: an address is in and the search has not run; the button is on and nothing else is drawn */
export type FindATimeState = "no-address" | "ready" | "searching" | "results" | "none" | "outside"

export interface FindATimeProps {
  state: FindATimeState
  /** the openings that break no rule, in any order: the block sorts them */
  openings?: readonly Opening[]
  /** the openings that break a rule, each with its `conflict` words */
  forced?: readonly Opening[]
  sort: OpeningSort
  onSort: (sort: OpeningSort) => void
  selectedId?: string | null
  onPick: (row: Opening) => void
  /** the drive times are the straight-line estimate */
  estimated?: boolean
  /** "Book it anyway" is ticked for the chosen forced row */
  forcedTicked?: boolean
  onForcedTicked?: (ticked: boolean) => void
  /** the day the search looked as far as, for "No open day before Nov 30": already worded */
  noneBefore?: string
  /** the Find a time button; the block draws it off before an address */
  onFind?: () => void
  /** inside the Schedule dialog: the list is just its sort control and its rows, no button and no title (the section is named for a screen reader only) */
  bare?: boolean
  /** one day's openings: the rows that break a rule are listed greyed with their words, and the sort is left out */
  oneDay?: boolean
  className?: string
}

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "soonest", label: "Soonest" },
  { value: "least-driving", label: "Least driving" },
] as const

const ROW = "flex min-h-14 w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:flex-row sm:items-center sm:gap-3"

function Row({ row, picked, recommended, forced, index, focusable, onPick, onKey, setRef }: { row: Opening; picked: boolean; recommended: boolean; forced: boolean; index: number; focusable: boolean; onPick: () => void; onKey: (e: KeyboardEvent<HTMLButtonElement>, i: number) => void; setRef: (el: HTMLButtonElement | null) => void }) {
  return (
    <button
      ref={setRef}
      type="button"
      role="radio"
      aria-checked={picked}
      tabIndex={focusable ? 0 : -1}
      data-slot="opening"
      data-recommended={recommended || undefined}
      data-forced={forced || undefined}
      onClick={onPick}
      onKeyDown={(e) => onKey(e, index)}
      className={cn(ROW, picked ? "border-navy bg-navy/5" : "border-border bg-background hover:border-navy/40", forced && !picked && "bg-stone text-muted-foreground")}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={cn("font-semibold", forced ? "text-muted-foreground" : "text-navy")}>{shortDay(row.day)}</span>
          <span className="tabular-nums">{timeRange(row.start, row.end)}</span>
          <span className={forced ? "" : "text-muted-foreground"}>{row.personName}</span>
          {recommended && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-deep">Recommended</span>}
        </span>
        {row.conflict ? <span className="text-sm">{row.conflict}</span> : row.nextTo ? <span className="text-sm text-muted-foreground">{row.nextTo}</span> : null}
      </span>
      {!forced && <span className="shrink-0 tabular-nums text-foreground">{`adds ${row.addedMinutes} min driving`}</span>}
      {picked && <Check className="hidden size-4 shrink-0 text-navy sm:block" aria-hidden />}
    </button>
  )
}

export function FindATime({ state, openings = [], forced = [], sort, onSort, selectedId, onPick, estimated, forcedTicked = false, onForcedTicked, noneBefore, onFind, bare = false, oneDay = false, className }: FindATimeProps) {
  const [showAll, setShowAll] = useState(false)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const ranked = sortOpenings(openings, sort)
  const star = recommendedId(openings)
  const visible = [...ranked, ...(showAll || oneDay ? forced : [])]
  const chosen = visible.find((r) => r.id === selectedId) ?? null
  const move = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (from + step + visible.length) % visible.length
    onPick(visible[next]!)
    refs.current[next]?.focus()
  }
  const tabIndex = Math.max(0, visible.findIndex((r) => r.id === selectedId))
  return (
    <section data-slot="find-a-time" data-state={state} aria-label={oneDay ? "Times that day" : bare ? "Best times" : "Find a time"} className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {!bare && (
          <Button type="button" variant="outline" className="min-h-11" disabled={state === "no-address" || state === "searching"} onClick={onFind}>
            <Search className="size-4" aria-hidden />
            Find a time
          </Button>
        )}
        {state === "results" && !oneDay && (
          <div className="max-w-full overflow-x-auto">
            <SegmentedControl label="Sort" options={SORTS} value={sort} onChange={(v) => onSort(v as OpeningSort)} />
          </div>
        )}
        {state === "results" && estimated && <p className="text-sm text-muted-foreground">Estimated drive times</p>}
      </div>

      {state === "no-address" && <p className="text-sm text-muted-foreground">Add an address to find a time</p>}

      {state === "searching" && (
        <div role="status" aria-busy="true" data-slot="find-a-time-searching" className="flex flex-col gap-2">
          <span className="sr-only">Finding times</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {state === "none" && <EmptyState title={noneBefore ? `No open day before ${noneBefore}.` : "No time open."} line="Pick a day yourself." className="py-6" />}

      {state === "outside" && <EmptyState icon={MapPinOff} title="Outside the six towns." line="Pick a day yourself." className="py-6" />}

      {state === "results" && (
        <>
          <div role="radiogroup" aria-label={oneDay ? "Openings that day" : "Openings"} className="flex flex-col gap-2">
            {visible.map((row, i) => (
              <Row
                key={row.id}
                row={row}
                index={i}
                picked={row.id === selectedId}
                recommended={row.id === star}
                forced={Boolean(row.conflict)}
                focusable={i === tabIndex}
                onPick={() => onPick(row)}
                onKey={move}
                setRef={(el) => {
                  refs.current[i] = el
                }}
              />
            ))}
          </div>
          {chosen?.conflict && onForcedTicked && (
            <div className="flex min-h-11 items-center gap-3 text-sm font-medium text-foreground">
              <span className="flex size-11 items-center justify-center">
                <Checkbox checked={forcedTicked} onCheckedChange={(c) => onForcedTicked(c === true)} aria-labelledby="book-anyway-text" />
              </span>
              <span id="book-anyway-text" className="cursor-pointer" onClick={() => onForcedTicked(!forcedTicked)}>
                Book it anyway
              </span>
            </div>
          )}
          {forced.length > 0 && !oneDay && (
            <Button type="button" variant="ghost" className="min-h-11 self-start px-2 text-primary-deep" aria-expanded={showAll} onClick={() => setShowAll((s) => !s)}>
              {showAll ? "Show fewer times" : `Show all times (${forced.length} more)`}
            </Button>
          )}
        </>
      )}
    </section>
  )
}
