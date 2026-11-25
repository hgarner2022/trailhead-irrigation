"use client"

import type { Person } from "@/lib/admin/types"
import { firstNameOf } from "@/lib/admin/people"
import { cn } from "@/lib/utils"
import { personStyle } from "./time-grid-style"

// The one person control of the Schedule, as Google Calendar's calendar list works (the owner, Nov 25 2026): a chip per person with their colour dot and first name, pressed = shown. Hiding a
// person is a view, not a rule: it takes their column, stops, pins and rows off the screen and nothing else. The last person shown cannot be turned off. With one person on the schedule there is
// nothing to choose and nothing is drawn. The Week and Day columns, Month, the Map, the List and the phone's day all read the same choice. Pure render; the host holds the set.

const CHIP = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 aria-disabled:cursor-not-allowed"

export interface PersonTogglesProps {
  /** everyone on the schedule, in colour order */
  people: readonly Person[]
  /** the ids that are hidden */
  hidden: readonly string[]
  onToggle: (personId: string) => void
  className?: string
}

export function PersonToggles({ people, hidden, onToggle, className }: PersonTogglesProps) {
  if (people.length < 2) return null
  const shownCount = people.filter((p) => !hidden.includes(p.id)).length
  return (
    <div role="group" aria-label="People shown" data-slot="person-toggles" className={cn("flex flex-wrap items-center gap-2", className)}>
      {people.map((p, i) => {
        const on = !hidden.includes(p.id)
        const last = on && shownCount === 1
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            aria-disabled={last || undefined}
            aria-label={`Show ${p.name}'s visits`}
            title={last ? "One person always stays on" : undefined}
            onClick={() => !last && onToggle(p.id)}
            className={cn(CHIP, on ? "border-navy bg-navy/5 text-navy" : "border-border bg-background text-muted-foreground")}
          >
            <span aria-hidden className={cn("size-3 rounded-full", personStyle(i).dot, !on && "opacity-40")} />
            {firstNameOf(p.name)}
          </button>
        )
      })}
    </div>
  )
}
