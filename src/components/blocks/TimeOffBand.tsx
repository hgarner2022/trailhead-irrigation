import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { personStyle, HATCH_STYLE } from "./time-grid-style"

// Time off on the clock (docs/plans/2026-11-25-scheduler-design.md, 7.9): a hatched band in the person's colour at low strength with its words
// ("Ryan off 12 to 2 pm"), in two forms. The hours form is placed over the clock by the grid (`style` gives top and height); the whole-day form
// covers the whole column, and its label sits at the top. Nothing is offered or booked into it. Decoration for the eye (a screen reader gets
// the label as text); with `onOpen` the label is a button. Pure props.

export interface TimeOffBandProps {
  label: string
  personIndex?: number
  /** the whole day: the band fills its parent and the label sits at the top */
  wholeDay?: boolean
  /** pressing the label goes to Settings, People, where time off is set; the band itself stays out of the way of a drag */
  onOpen?: () => void
  touch?: boolean
  /** top and height in px for the hours form */
  style?: CSSProperties
  className?: string
}

export function TimeOffBand({ label, personIndex = 0, wholeDay, onOpen, touch, style, className }: TimeOffBandProps) {
  const s = personStyle(personIndex)
  return (
    <div
      data-slot="time-off-band"
      title={label}
      data-form={wholeDay ? "day" : "hours"}
      style={{ ...HATCH_STYLE, ...style }}
      className={cn("pointer-events-none absolute inset-x-0 z-[1] overflow-hidden bg-navy/[0.03]", s.hatch, wholeDay && "inset-y-0", className)}
    >
      {onOpen ? (
        <button
          type="button"
          data-slot="time-off-open"
          onClick={onOpen}
          aria-label={`Time off, change it in Settings: ${label}`}
          className={cn("type-admin-dense pointer-events-auto m-1 inline-flex max-w-[calc(100%-0.5rem)] cursor-pointer items-center rounded-sm bg-background/85 px-1.5 text-left font-semibold text-navy-light underline-offset-2 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", touch ? "min-h-11" : "min-h-6")}
        >
          <span className="line-clamp-2 break-words">{label}</span>
        </button>
      ) : (
        <span className="type-admin-dense m-1 inline-block max-w-[calc(100%-0.5rem)] rounded-sm bg-background/85 px-1.5 py-0.5 font-semibold text-navy-light"><span className="line-clamp-2 break-words">{label}</span></span>
      )}
    </div>
  )
}
