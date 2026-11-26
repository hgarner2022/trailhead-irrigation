"use client"

import type { CSSProperties, Ref } from "react"
import { Check, Clock3 } from "lucide-react"
import { hoursWords } from "@/lib/admin/day-fill"
import { cn } from "@/lib/utils"
import { detailFor, rangeWords, clockWords, type GridBlock } from "./time-grid-model"
import { personStyle } from "./time-grid-style"

// One visit on the clock (docs/plans/2026-11-25-scheduler-design.md, 7.1 and 7.5), and its short chip for the Any time strip.
// A rounded block as tall as the visit is long, a soft tint of the person's colour with a left bar, a small initials avatar, the
// street, the time; how much it says follows its height (30 minutes one line, 45 adds the time, 60 and up the service and town).
// States: selected (2px navy ring), hovered (lifts a little), in conflict (red outline, the words in a title and read aloud), waiting on the
// customer, done (grey with a check), planned (dotted edge). The block is one button for the visit: a click or Enter opens the peek
// (docs/plans/2026-11-26-scheduler-review-research.md, point 2); there is no menu on it. Length changes by the bottom handle, or in Edit visit. Pure props; the grid
// owns the drag refs and the position.

export interface TimeBlockProps {
  block: GridBlock
  personIndex?: number
  /** "RG", the avatar */
  initials?: string
  /** the person's full name: the avatar is initials only, so the name is in the block's own label and visible in the Day view's head */
  who?: string
  variant?: "block" | "chip"
  selected?: boolean
  hovered?: boolean
  /** the words of a clash; the outline and the title */
  conflict?: string
  dragging?: boolean
  /** absolute placement from the grid */
  style?: CSSProperties
  className?: string
  rootRef?: Ref<HTMLDivElement>
  handleRef?: Ref<HTMLButtonElement>
  /** a 44px menu button and bigger text for a phone */
  touch?: boolean
  /** a narrow column (the Week): no avatar, the start time alone */
  compact?: boolean
  /** two overlapping blocks side by side on a phone: street over time, always two lines */
  narrow?: boolean
  /** an Any time chip's place in the order the day is driven: 1, 2, 3 */
  order?: number
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  /** shows the bottom handle and gives the pointer down; the grid does the dragging */
  onResizeStart?: (e: React.PointerEvent<HTMLElement>) => void
}

export function blockLabel(b: GridBlock, conflict?: string, who?: string): string {
  const when = b.start === null ? "Any time" : rangeWords(b.start, b.minutes)
  return [b.title, b.service, b.town, when, who && `with ${who}`, b.done && "done", b.waiting && "waiting on customer", b.planned && "proposed", conflict].filter(Boolean).join(", ")
}

export function TimeBlock({ block: b, personIndex = 0, initials, who, variant = "block", selected, hovered, conflict, dragging, style, className, rootRef, handleRef, touch, compact, narrow, order, onSelect, onHover, onResizeStart }: TimeBlockProps) {
  const s = personStyle(personIndex)
  const chip = variant === "chip"
  const detail = narrow ? "two" : detailFor(b.minutes)
  const time = b.start === null ? "Any time" : rangeWords(b.start, b.minutes)
  const lead = b.start === null ? "" : clockWords(b.start, true)
  return (
    <div
      ref={rootRef}
      data-slot={chip ? "time-chip" : "time-block"}
      data-id={b.id}
      data-conflict={conflict ? "true" : undefined}
      title={conflict}
      style={style}
      onPointerEnter={() => onHover?.(b.id)}
      onPointerLeave={() => onHover?.(null)}
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-lg border-l-4 text-left text-navy transition-shadow motion-safe:transition-transform",
        b.done ? "border-l-muted bg-stone text-navy-light" : cn(s.tint, s.bar),
        b.planned && "border border-dotted border-navy/60 bg-background",
        chip ? (touch ? "min-h-11" : "min-h-7") : "shadow-sm",
        (hovered || undefined) && "z-10 -translate-y-px shadow-md",
        !chip && "hover:z-10 hover:-translate-y-px hover:shadow-md",
        selected && "z-10 ring-2 ring-navy",
        conflict && "outline outline-2 -outline-offset-1 outline-destructive",
        dragging && "opacity-40",
        className,
      )}
    >
      <button
        ref={handleRef}
        type="button"
        data-slot="time-block-button"
        aria-label={`${order !== undefined ? `Stop ${order}, ` : ""}${blockLabel(b, conflict, who)}`}
        aria-pressed={selected || undefined}
        onClick={() => onSelect?.(b.id)}
        className={cn("absolute inset-0 z-0 flex w-full cursor-pointer flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy", chip || detail === "line" ? "justify-center px-1.5" : "px-1.5 py-1", touch && "text-sm")}
      >
        {chip ? (
          <span className={cn("block truncate text-xs font-semibold", touch && "text-sm")}>
            {order !== undefined && <span aria-hidden className="mr-1.5 inline-flex size-4 items-center justify-center rounded-full bg-card text-[10px] font-semibold tabular-nums ring-1 ring-navy/20">{order}</span>}
            {b.title}
            <span className="font-normal text-navy-light">{`, ${b.service.toLowerCase()}, ${hoursWords(b.minutes)}`}</span>
          </span>
        ) : detail === "line" ? (
          <span aria-hidden className="block truncate text-xs">
            {lead && <span className="tabular-nums">{lead} </span>}
            <span className="font-semibold">{b.title}</span>
          </span>
        ) : (
          <span aria-hidden className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              {initials && !compact && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-semibold leading-none text-navy ring-1 ring-navy/20">{initials}</span>}
              <span className="truncate text-xs font-semibold leading-tight">{b.title}</span>
            </span>
            <span className="mt-0.5 block truncate text-xs tabular-nums text-navy-light">{`${compact && b.start !== null ? clockWords(b.start) : time}${detail === "two" && !narrow ? `, ${b.town}` : ""}`}</span>
            {detail === "full" && <span className="block truncate text-xs text-navy-light">{`${b.service}, ${b.town}`}</span>}
          </span>
        )}
      </button>
      {b.done && <Check aria-hidden className="pointer-events-none absolute bottom-1 right-1 size-3.5 text-positive-deep" />}
      {b.waiting && <Clock3 aria-hidden className="pointer-events-none absolute bottom-1 right-1 size-3.5 text-warning-ink" />}
      {conflict && <span className="sr-only">{`Clash: ${conflict}`}</span>}
      {onResizeStart && !chip && b.start !== null && (
        <span
          data-slot="time-block-resize"
          aria-hidden
          onPointerDown={onResizeStart}
          className="absolute inset-x-0 bottom-0 z-10 flex h-2 cursor-ns-resize touch-none items-end justify-center"
        >
          <span className="mb-0.5 h-0.5 w-6 rounded-full bg-navy/30 opacity-0 group-hover:opacity-100" />
        </span>
      )}
    </div>
  )
}
