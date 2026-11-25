"use client"

import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { hoursWords } from "@/lib/admin/day-fill"
import { clockWords, type GridBlock } from "@/components/blocks/time-grid-model"
import { drivingOf, type Calendar } from "./schedule-engine"
import type { OrderPlan } from "./schedule-order"

// Order the day, the preview before it happens (the same ConfirmDialog as Schedule all): the day as it is and as it would be, each stop with its time and the minutes of driving to it from the one
// before, the minutes saved, and the stops that fit nowhere. Stops with a time stay where they are. Nothing is told: an Any time stop was only ever promised a day. Pure render over a plan.

function Route({ title, route, meta, moved }: { title: string; route: readonly GridBlock[]; meta: Calendar["meta"]; moved?: ReadonlySet<string> }) {
  const legs = new Map(drivingOf(route, meta).legs.map((l) => [l.toId, l.minutes]))
  return (
    <section aria-label={title} className="min-w-0">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <ol className="divide-y divide-border rounded-lg border border-border text-sm">
        {route.map((b, i) => (
          <li key={b.id} className="px-3 py-1.5">
            {legs.get(b.id) ? <span className="block text-xs text-muted-foreground">{`${legs.get(b.id)} min drive`}</span> : null}
            <span className={moved?.has(b.id) ? "flex justify-between gap-2 font-semibold text-foreground" : "flex justify-between gap-2 text-foreground"}>
              <span className="min-w-0 truncate">{`${i + 1}. ${b.title}, ${b.town}`}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{b.start === null ? "Any time" : clockWords(b.start)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function OrderDayDialog({ plan, meta, who, onClose, onConfirm }: { plan: OrderPlan; meta: Calendar["meta"]; who: string; onClose: () => void; onConfirm: () => void }) {
  const n = plan.moves.length
  const moved = new Set(plan.moves.map((m) => m.id))
  return (
    <ConfirmDialog
      open
      size="md"
      slot="order-day-dialog"
      onOpenChange={(o) => !o && onClose()}
      title="Order the day"
      message={n ? `${who}: moves ${n} ${n === 1 ? "stop" : "stops"} with no set time into the gaps.${plan.saved > 0 ? ` Saves ${hoursWords(plan.saved)} of driving.` : ""} Stops with a time stay.` : `${who}'s day is already in order.`}
      confirmLabel="Order the day"
      confirmDisabled={n === 0}
      onConfirm={async () => (onConfirm(), { ok: true })}
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3">
          <Route title="Now" route={plan.before.route} meta={meta} />
          <Route title="Ordered" route={plan.after.route} meta={meta} moved={moved} />
        </div>
        {plan.doesNotFit.length > 0 && (
          <section aria-label="Doesn't fit today" data-slot="does-not-fit">
            <h3 className="mb-1 text-sm font-semibold text-foreground">{"Doesn't fit today"}</h3>
            <ul className="list-disc pl-5 text-sm text-foreground">
              {plan.doesNotFit.map((b) => <li key={b.id}>{`${b.title}, ${b.town}`}</li>)}
            </ul>
          </section>
        )}
      </div>
    </ConfirmDialog>
  )
}
