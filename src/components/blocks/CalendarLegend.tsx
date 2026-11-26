"use client"

import { useState } from "react"
import { Check, ChevronDown, Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HATCH_STYLE } from "./time-grid-style"

// One line under the calendar that names every mark a visit can carry, in the words the rest of the product uses (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 17): Done, Waiting
// on customer, Overlaps, Time off. The same on a laptop and a phone, and it folds to its one button when it is in the way. A person's colour is named by the head of each day, so
// it is not repeated here. Pure render; the open state is its own.

const MARKS: { key: string; mark: React.ReactNode; word: string }[] = [
  { key: "done", mark: <Check aria-hidden className="size-3.5 text-positive-deep" />, word: "Done" },
  { key: "waiting", mark: <Clock3 aria-hidden className="size-3.5 text-warning-ink" />, word: "Waiting on customer" },
  { key: "overlaps", mark: <span aria-hidden className="relative size-3.5 overflow-hidden rounded-sm bg-navy/10 ring-1 ring-inset ring-destructive/70"><span className="absolute right-0 top-0 size-1.5 rounded-bl-sm bg-destructive" /></span>, word: "Overlaps" },
  { key: "off", mark: <span aria-hidden className="size-3.5 rounded-sm bg-navy/[0.03] ring-1 ring-inset ring-border [--hatch:var(--color-navy)]" style={HATCH_STYLE} />, word: "Time off" },
]

export function CalendarLegend({ defaultOpen = true, className }: { defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div data-slot="calendar-legend" className={cn("type-admin-dense text-muted-foreground", className)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-1 font-semibold text-navy-light hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Legend
        <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-(--motion-fast) motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="-mt-1 flex flex-wrap gap-x-4 gap-y-1.5 pb-1">
          {MARKS.map((m) => (
            <li key={m.key} className="inline-flex items-center gap-1.5">
              {m.mark}
              {m.word}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
