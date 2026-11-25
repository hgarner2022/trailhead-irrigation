"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { PlanMove } from "./scheduler-panels-types"

// Jev's proposal for a week (docs/plans/2026-11-25-scheduler-design.md, 7.11). The strip sits under the Schedule's header: "Jev's plan, week of Nov 30", the summary ("11 moves, 94 fewer driving
// minutes"), Throw away and Accept all (Accept N when some are unticked), and a row per move with a tick, the visit, from and to, and one plain reason. A row that changed since the plan was drawn
// says so, is unticked and cannot be ticked; a row where the customer picked the day is unticked and waits for the office's call. States: drafting (Jev is working, with Cancel), failed (Jev is
// resting), empty (Jev found nothing to change). `onHover(moveId | null)` lights the move's block on the week. Accept runs the ticked moves; the screen shows one toast and the moved visits join
// Not told. Our code does every sum; this block shows what it was given. Pure props, client component.

export type PlanStatus = "drafting" | "ready" | "failed" | "empty"

export interface PlanStripProps {
  status: PlanStatus
  /** "Nov 30" */
  weekLabel: string
  moves?: readonly PlanMove[]
  /** driving minutes the plan saves, for the summary */
  savedMinutes?: number
  onAccept: (ids: string[]) => void
  onDiscard: () => void
  /** Cancel while Jev is drafting */
  onCancel?: () => void
  onHover?: (moveId: string | null) => void
  className?: string
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function PlanStrip({ status, weekLabel, moves = [], savedMinutes = 0, onAccept, onDiscard, onCancel, onHover, className }: PlanStripProps) {
  // A plain move starts ticked, a customer-picked row and a stale one start unticked; `flipped` holds the ones the office changed, so a new plan's rows start from their own default.
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set())
  const isTicked = (m: PlanMove) => m.kind !== "stale" && (m.kind === "move") !== flipped.has(m.id)
  const toggle = (id: string) => setFlipped((t) => (t.has(id) ? new Set([...t].filter((x) => x !== id)) : new Set([...t, id])))
  const title = `Jev's plan, week of ${weekLabel}`
  const frame = "flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3"
  if (status === "drafting")
    return (
      <section data-slot="plan-strip" data-state="drafting" aria-label={title} className={cn(frame, "sm:flex-row sm:items-center", className)}>
        <p role="status" className="flex flex-1 items-center gap-2 text-sm text-foreground">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Jev is working
        </p>
        {onCancel && (
          <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </section>
    )
  if (status === "failed" || status === "empty")
    return (
      <section data-slot="plan-strip" data-state={status} aria-label={title} className={cn(frame, "sm:flex-row sm:items-center", className)}>
        <p role="status" className="flex-1 text-sm text-foreground">
          {status === "failed" ? "Jev is resting. Try again later" : "Jev found nothing to change"}
        </p>
        <Button type="button" variant="outline" className="min-h-11" onClick={onDiscard}>
          Close
        </Button>
      </section>
    )
  const live = moves.filter((m) => m.kind !== "stale")
  const all = live.length > 0 && live.every(isTicked)
  const chosen = live.filter(isTicked).length
  return (
    <section data-slot="plan-strip" data-state="ready" aria-labelledby="plan-strip-title" className={cn(frame, className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 id="plan-strip-title" className="font-display text-lg font-semibold leading-tight text-navy">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{`${plural(moves.length, "move", "moves")}, ${plural(savedMinutes, "fewer driving minute", "fewer driving minutes")}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={onDiscard}>
            Throw away
          </Button>
          <Button type="button" className="min-h-11" disabled={chosen === 0} onClick={() => onAccept(live.filter(isTicked).map((m) => m.id))}>
            {all ? "Accept all" : `Accept ${chosen}`}
          </Button>
        </div>
      </div>
      <ul data-slot="plan-moves" className="max-h-52 divide-y divide-border overflow-y-auto border-t border-border">
        {moves.map((m) => {
          const stale = m.kind === "stale"
          return (
            <li key={m.id} data-move={m.id} data-kind={m.kind} onMouseEnter={() => onHover?.(m.id)} onMouseLeave={() => onHover?.(null)} onFocus={() => onHover?.(m.id)} onBlur={() => onHover?.(null)} className="flex items-start gap-1 py-1">
              <span className="flex size-11 shrink-0 items-center justify-center">
                <Checkbox checked={isTicked(m)} disabled={stale} onCheckedChange={() => toggle(m.id)} aria-label={`Move ${m.visit}`} />
              </span>
              <span className={cn("min-w-0 flex-1 py-2 text-sm", stale && "text-muted-foreground")}>
                <span className="block">
                  <span className="font-medium text-foreground">{m.visit}</span>
                  {`  ${m.from} to ${m.to}`}
                </span>
                <span className={cn("block", m.kind === "customer-picked" ? "font-medium text-warning-ink" : "text-muted-foreground")}>{m.reason}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
