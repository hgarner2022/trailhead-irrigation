"use client"

import type { CSSProperties, Ref } from "react"
import { Check, Clock3 } from "lucide-react"
import { hoursWords } from "@/lib/admin/day-fill"
import { cn } from "@/lib/utils"
import { HOUR_PX, PHONE_HOUR_PX, minutesToPx, rangeWords, clockWords, type GridBlock } from "./time-grid-model"
import { personStyle } from "./time-grid-style"

// One visit on the clock (docs/plans/2026-11-25-scheduler-design.md, 7.1 and 7.5), and its short chip for the Any time strip.
// ONE treatment: a soft fill of the person's colour and a solid left edge, no border and no shadow at rest. It is set for reading small:
// the time (tabular, quiet) and the street (the one heavier weight) on the first line, the service and town under it when the block is
// tall enough; a line wraps at a word before it is cut, so no word is broken by an ellipsis. The person is said by the colour and the column,
// not by an avatar. States: selected (a navy ring), hovered (the fill a step stronger and a slight lift), an overlap (a thin red edge and a
// corner mark; the sentence is its title, is read aloud and is in the peek), waiting on the customer (a small clock), done (a grey fill and
// a small check), planned (dotted edge). The block is one button for the visit: a click or Enter opens the peek
// (docs/plans/2026-11-26-scheduler-review-research.md, point 2); there is no menu on it. Length changes by the bottom handle, or in Edit visit. Pure props; the grid
// owns the drag refs and the position.

export interface TimeBlockProps {
  block: GridBlock
  personIndex?: number
  /** "RG": kept for callers; the block draws no avatar (its colour and its column say who) */
  initials?: string
  /** the person's full name, in the block's own label */
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

/** Whole lines only: a block shows as many lines as its height holds and never half of one. */
const LINE_EM = 1.3

export function TimeBlock({ block: b, personIndex = 0, who, variant = "block", selected, hovered, conflict, dragging, style, className, rootRef, handleRef, touch, compact, narrow, order, onSelect, onHover, onResizeStart }: TimeBlockProps) {
  const s = personStyle(personIndex)
  const chip = variant === "chip"
  // how many lines fit: the grid gives the height in px; on its own (a story, the drag overlay) the block falls back to its length
  const px = typeof style?.height === "number" ? style.height : minutesToPx(b.minutes, touch ? PHONE_HOUR_PX : HOUR_PX)
  const lines = Math.max(1, Math.floor((px - 6) / ((touch ? 14 : 12) * LINE_EM)))
  const one = lines === 1
  // the Week's narrow column says when it starts (the gutter says am or pm); the Day's wide one says the whole span
  const lead = b.start === null ? "" : compact || one ? clockWords(b.start, true) : rangeWords(b.start, b.minutes)
  const mark = b.done ? <Check aria-hidden className="mt-px size-3 shrink-0 text-positive-deep" /> : b.waiting ? <Clock3 aria-hidden className="mt-px size-3 shrink-0 text-warning-ink" /> : null
  const clip = (n: number) => ({ maxHeight: `${n * LINE_EM}em` })
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
        "group @container relative min-w-0 overflow-hidden rounded-md bg-background text-left text-navy",
        b.planned && "border border-dotted border-navy/60",
        b.done && "text-navy-light",
        chip && (touch ? "min-h-11" : "min-h-6"),
        (hovered || undefined) && "z-10 -translate-y-px shadow-sm",
        !chip && "hover:z-10 hover:-translate-y-px hover:shadow-sm",
        selected && "z-10 ring-2 ring-navy ring-offset-1 ring-offset-background",
        conflict && !selected && "ring-1 ring-inset ring-destructive/60",
        dragging && "opacity-40",
        className,
      )}
    >
      {!b.planned && <span aria-hidden data-slot="time-block-fill" className={cn("pointer-events-none absolute inset-0 transition-colors duration-(--motion-fast) motion-reduce:transition-none", b.done ? "bg-stone" : cn(s.tint, s.hover, hovered && s.hot))} />}
      {!b.planned && <span aria-hidden data-slot="time-block-edge" className={cn("pointer-events-none absolute inset-y-0 left-0 w-[3px]", b.done ? "bg-muted/50" : s.dot)} />}
      {conflict && <span aria-hidden data-slot="overlap-mark" className="pointer-events-none absolute right-0 top-0 z-[1] size-2 rounded-bl-sm bg-destructive" />}
      <button
        ref={handleRef}
        type="button"
        data-slot="time-block-button"
        aria-label={`${order !== undefined ? `Stop ${order}, ` : ""}${blockLabel(b, conflict, who)}`}
        aria-pressed={selected || undefined}
        onClick={() => onSelect?.(b.id)}
        className={cn(
          "absolute inset-0 z-0 flex w-full cursor-pointer flex-col rounded-md pl-2 pr-0.5 text-left leading-[1.3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          touch ? "type-admin-body" : "type-admin-dense",
          chip || one ? "justify-center" : "py-[3px]",
        )}
      >
        {chip ? (
          <span className="flex min-w-0 items-start gap-1 leading-[1.3]">
            <span className="min-w-0 flex-1 overflow-hidden" style={clip(1)}>
              {order !== undefined && <span aria-hidden className="mr-1 tabular-nums text-navy-light">{order}</span>}
              <span className="font-semibold">{b.title}</span>
              <span className="inline-block max-w-full text-navy-light">{`, ${b.service.toLowerCase()}, ${hoursWords(b.minutes)}`}</span>
            </span>
            {mark}
          </span>
        ) : (
          <span aria-hidden className="flex min-w-0 flex-col overflow-hidden leading-[1.3]" style={clip(lines)}>
            <span className="flex min-w-0 items-start gap-0.5">
              <span className="min-w-0 flex-1 overflow-hidden" style={clip(lines >= 3 || narrow ? 2 : 1)}>
                {lead && <span className="whitespace-nowrap tabular-nums text-navy-light">{lead} </span>}
                <span className="font-semibold">{b.title}</span>
              </span>
              {one && mark}
            </span>
            {!one && !narrow && (
              <span className="text-navy-light">
                <span className="block @[9.5rem]:inline">{b.service}</span>
                <span className="hidden @[9.5rem]:inline">, </span>
                <span className="block @[9.5rem]:inline">{b.town}</span>
              </span>
            )}
          </span>
        )}
      </button>
      {!chip && !one && mark && <span className="pointer-events-none absolute bottom-1 right-1">{mark}</span>}
      {conflict && <span className="sr-only">{`Clash: ${conflict}`}</span>}
      {onResizeStart && !chip && b.start !== null && (
        <span
          data-slot="time-block-resize"
          aria-hidden
          onPointerDown={onResizeStart}
          className="absolute inset-x-0 bottom-0 z-10 flex h-2 cursor-ns-resize touch-none items-end justify-center"
        >
          <span className="mb-0.5 h-0.5 w-5 rounded-full bg-navy/40 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      )}
    </div>
  )
}
