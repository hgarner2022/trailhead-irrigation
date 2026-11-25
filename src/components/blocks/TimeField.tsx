"use client"

import { useState } from "react"
import { ChevronDown, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimeChips } from "@/components/blocks/TimeChips"
import { clock12, type StartOption } from "@/lib/booking/day-time"
import { cn } from "@/lib/utils"

// A plain time-of-day field (Settings' day hours): the same trigger as `DayPopoverField`, with the one chip style (`TimeChips`) in a popover under it, every half hour from `from` to `to`.
// It reads "9:00 am". Choosing a time closes it. No native time box anywhere. Pure props, client component.

export interface TimeFieldProps {
  id?: string
  /** names the button for a screen reader: "Ryan Garner day starts" */
  label: string
  /** "HH:MM" */
  value: string
  onChange: (value: string) => void
  /** the first and last half hour offered; default 5:00 am to 9:00 pm */
  from?: string
  to?: string
  className?: string
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

export function TimeField({ id, label, value, onChange, from = "05:00", to = "21:00", className }: TimeFieldProps) {
  const [open, setOpen] = useState(false)
  const options: StartOption[] = []
  for (let m = toMinutes(from); m <= toMinutes(to); m += 30) options.push({ start: hhmm(m) })
  // a stored time off the half hour (7:15) stays offered, so the field never shows a time that cannot be chosen again
  if (value && !options.some((o) => o.start === value)) options.push({ start: value }), options.sort((a, b) => a.start.localeCompare(b.start))
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`${label}, ${clock12(value)}`}
          className={cn("flex min-h-11 w-32 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-9 md:text-sm", className)}
        >
          <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate tabular-nums">{clock12(value)}</span>
          <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} data-slot="time-popover" className="max-h-[min(80svh,var(--radix-popover-content-available-height))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-3 data-[state=closed]:animate-none data-[state=open]:animate-none">
        <TimeChips options={options} value={value} onChange={(start) => start && (onChange(start), setOpen(false))} legend={label} hideLegend density="sheet" />
      </PopoverContent>
    </Popover>
  )
}
