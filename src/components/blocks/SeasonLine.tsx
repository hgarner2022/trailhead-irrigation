import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PassVisit } from "@/lib/admin/types"
import { formatMoney, visitMonth } from "@/lib/admin/metrics"
import {
  SEASON_MONTHS,
  listJoin,
  markerAlign,
  monthName,
  monthShort,
  reservedWeek,
  seasonPhase,
  seasonPosition,
  writtenDate,
} from "./season-line-math"

// The April to November arc as one horizontal line. In business mode the
// committed Season Pass revenue stands above each month as a column, charged
// money filling it from the bottom in orange; in customer mode one pass's
// three visits sit on the line as dots. The track and the month row are the
// same in both modes, so the two read as one thing. Pure render, no hooks;
// nothing moves, the sheen belongs to PassCard. `today` and the stored dates
// are read as UTC date prefixes until the wiring phase converts to Mountain time.

export interface SeasonBar {
  month: number
  committed: number
  charged: number
}

export interface SeasonLineProps {
  season: number
  /** ISO date; defaults to now */
  today?: string
  mode: "business" | "customer"
  /** business mode: one entry per month, as `committedByMonth` builds it; a second entry for the same month is ignored */
  bars?: SeasonBar[]
  /** customer mode: the pass's three visits; two in the same month share that column */
  visits?: PassVisit[]
  /** one line under the track, read into the description as well */
  caption?: string
  className?: string
}

const BAR_MAX_PX = 72
const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Turn-on", inspection: "Inspection", blowout: "Blowout" }

const visitState = (v: PassVisit) => (v.completedAt ? "completed" : v.scheduledAt ? "scheduled" : "window")
const isReserved = (v: PassVisit) => v.kind === "blowout" && !v.completedAt && reservedWeek(v.window) !== null

function describeVisit(v: PassVisit): string {
  if (v.completedAt) return `${v.kind} done on ${writtenDate(v.completedAt)}`
  if (v.scheduledAt) return `${v.kind} scheduled for ${writtenDate(v.scheduledAt)}`
  if (isReserved(v)) return `blowout reserved for the week of ${reservedWeek(v.window)}`
  return `${v.kind} in ${v.window}`
}

function describe(props: SeasonLineProps, bars: SeasonBar[], visits: PassVisit[]): string {
  const { season, mode, caption } = props
  let sentence: string
  if (mode === "customer") {
    sentence = visits.length ? `Your ${season} season: ${visits.map(describeVisit).join(", ")}.` : `Your ${season} season has no visits yet.`
  } else if (bars.length) {
    const committed = bars.reduce((s, b) => s + b.committed, 0)
    const charged = bars.reduce((s, b) => s + b.charged, 0)
    const months = listJoin(bars.map((b) => monthName(b.month)))
    sentence = `Season ${season}: ${formatMoney(committed)} committed across ${months}, ${formatMoney(charged)} charged so far.`
  } else {
    sentence = `Season ${season}: nothing committed yet.`
  }
  return caption ? `${sentence} ${caption}` : sentence
}

function BarCell({ bar, max }: { bar?: SeasonBar; max: number }) {
  if (!bar) return <div />
  const height = Math.max(4, Math.round((BAR_MAX_PX * bar.committed) / max))
  const charged = bar.committed > 0 ? Math.round((height * bar.charged) / bar.committed) : 0
  return (
    <div className="flex flex-col items-center justify-end">
      <span className="mb-1 font-display text-sm leading-tight tabular-nums text-navy @max-[400px]:hidden">{formatMoney(bar.committed)}</span>
      <div
        data-slot="season-bar"
        data-month={bar.month}
        className="relative w-2/5 max-w-14 overflow-hidden rounded-t-sm bg-chart-2"
        style={{ height }}
      >
        {charged > 0 && (
          <div className={cn("absolute inset-x-0 bottom-0 bg-chart-1", charged >= height && "rounded-t-sm")} style={{ height: charged }} />
        )}
      </div>
    </div>
  )
}

function Dot({ visit, crowded }: { visit: PassVisit; crowded: boolean }) {
  const state = visitState(visit)
  const reserved = isReserved(visit)
  const blowout = visit.kind === "blowout"
  const name = VISIT_NAMES[visit.kind]
  return (
    <div className="relative flex flex-col items-center pb-5 text-center">
      <span className={cn("text-xs leading-tight text-foreground", crowded && "@max-[400px]:hidden")}>{name}</span>
      {crowded && <span className="hidden text-xs leading-tight text-foreground @max-[400px]:inline">{name[0]}</span>}
      {reserved && <span className="text-xs font-medium leading-tight text-primary-dark">Reserved</span>}
      <span
        data-slot="season-dot"
        data-state={state}
        data-month={visitMonth(visit) ?? undefined}
        data-reserved={reserved || undefined}
        className={cn(
          "absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-[calc(50%+1px)] items-center justify-center rounded-full",
          blowout ? "size-[18px]" : "size-3.5",
          state === "completed" && "bg-positive",
          state === "scheduled" && "bg-primary",
          state === "window" && "border-2 border-navy bg-background",
          reserved && "ring-2 ring-primary/40 ring-offset-2",
        )}
      >
        {state === "completed" && <Check className="size-2.5 text-white" strokeWidth={3} aria-hidden />}
      </span>
    </div>
  )
}

// Two visits in one month sit side by side in that column, each with its own label.
function DotCell({ visits }: { visits: PassVisit[] }) {
  if (!visits.length) return <div />
  return (
    <div className="flex items-end justify-center gap-4">
      {visits.map((v, i) => (
        <Dot key={`${v.kind}-${i}`} visit={v} crowded={visits.length > 1} />
      ))}
    </div>
  )
}

export function SeasonLine(props: SeasonLineProps) {
  const { season, mode, caption, className } = props
  const today = props.today ?? new Date().toISOString().slice(0, 10)
  const bars = SEASON_MONTHS.flatMap((m) => (props.bars ?? []).filter((b) => b.month === m).slice(0, 1))
  // Visits grouped by column, in month order; the picture and the description both read this list.
  const byMonth = SEASON_MONTHS.map((m) => (props.visits ?? []).filter((v) => visitMonth(v) === m))
  const visits = byMonth.flat()
  const max = Math.max(1, ...bars.map((b) => b.committed))

  const phase = seasonPhase(today, season)
  const position = seasonPosition(today, season)
  const align = markerAlign(position)
  const pinned = phase === "before" ? "start" : phase === "after" ? "end" : undefined
  const todayLabel = phase === "before" ? "Before the season" : phase === "after" ? "After the season" : "Today"
  const markerStyle = align === "end" ? { right: 0 } : { left: `${position * 100}%` }

  return (
    <figure data-slot="season-line" role="img" aria-label={describe(props, bars, visits)} className={cn("@container w-full", className)}>
      <div className="relative">
        <div className="relative h-5">
          <span
            data-slot="season-today"
            data-pinned={pinned}
            className={cn("absolute top-0 whitespace-nowrap text-xs font-medium leading-tight text-primary-dark", align === "center" && "-translate-x-1/2")}
            style={markerStyle}
          >
            {todayLabel}
          </span>
        </div>
        <div className={cn("relative z-10 grid grid-cols-8 border-b-2 border-border", mode === "business" ? "h-24" : "h-14")}>
          {SEASON_MONTHS.map((month, i) =>
            mode === "business" ? (
              <BarCell key={month} bar={bars.find((b) => b.month === month)} max={max} />
            ) : (
              <DotCell key={month} visits={byMonth[i]} />
            ),
          )}
        </div>
        <span aria-hidden className={cn("absolute top-5 -bottom-1 z-0 w-px bg-primary", align === "end" && "-translate-x-px")} style={markerStyle} />
      </div>
      <div className="grid grid-cols-8 pt-1.5">
        {SEASON_MONTHS.map((month, i) => (
          <div key={month} data-slot="season-month" className="relative text-center font-display text-xs uppercase tracking-wide text-muted-foreground">
            <span aria-hidden className="absolute left-0 -top-1.5 h-1.5 w-px bg-border" />
            {i === SEASON_MONTHS.length - 1 && <span aria-hidden className="absolute right-0 -top-1.5 h-1.5 w-px bg-border" />}
            <span className="@max-[400px]:hidden">{monthShort(month)}</span>
            <span className="hidden @max-[400px]:inline">{monthShort(month)[0]}</span>
          </div>
        ))}
      </div>
      {caption && <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  )
}
