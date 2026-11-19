"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MoneyCell, type MoneyTone } from "./MoneyCell"
import { RECORD_ROW, RecordRowEnd, RecordRowText } from "./RecordPanel"
import type { FooterAction } from "./RecordFooter"

// One trip to the house as a row (docs/DESIGN.md, "The recipe"), for a job that has more than one: a Season Pass's Spring turn-on and Fall
// blowout, or a repair's return trip. The title is the service, the detail is "Tue, Apr 14 · Ryan · Any time", the pills sit at the right
// over the money word ("Charged after this visit", "Paid, card"). A trip with `onToggle` opens in place (Hannah, Nov 19 2026: a pass job is one
// job with its trips, and each trip carries what a one-trip job carries): the header is one button with a chevron, `aria-expanded`, and the
// trip's own content (`children`: When and Who, its checklist, photos, notes and actions, the same blocks as the job page) shows under it,
// one open at a time by the caller. A trip without it keeps its action buttons under the text. It goes in a `RecordList`. Pure props.

export interface TripRowProps {
  title: string
  detail?: string
  /** `StatusPill`s */
  pills?: ReactNode
  /** the visit's money word from `words.ts`; null before it is done */
  money?: string | null
  moneyTone?: MoneyTone
  /** the actions this trip allows now, at most two (a trip that does not open) */
  actions?: readonly FooterAction[]
  /** makes the row open in place; `open` says whether it is */
  open?: boolean
  onToggle?: () => void
  /** the trip's own content, shown while it is open */
  children?: ReactNode
  className?: string
}

export function TripRow({ title, detail, pills, money, moneyTone, actions = [], open, onToggle, children, className }: TripRowProps) {
  const head = (
    <>
      <RecordRowText title={title} detail={detail} strong />
      <RecordRowEnd>
        <span className="flex flex-col items-end gap-1">
          {pills}
          {money !== undefined && <MoneyCell text={money} tone={moneyTone} className="text-xs text-muted-foreground" />}
        </span>
      </RecordRowEnd>
      {onToggle && <ChevronDown aria-hidden className={cn("ml-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
    </>
  )
  return (
    <li data-slot="trip-row" data-open={onToggle ? Boolean(open) : undefined} className={cn("flex flex-col py-2", className)}>
      {onToggle ? (
        <button type="button" aria-expanded={Boolean(open)} onClick={onToggle} className={cn("flex w-full items-start rounded-sm text-left hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", RECORD_ROW)}>
          {head}
        </button>
      ) : (
        <div className={cn("flex items-start", RECORD_ROW)}>{head}</div>
      )}
      {onToggle && open && (
        <div data-slot="trip-body" className="mt-3 flex flex-col gap-4 border-t border-border pt-4">
          {children}
        </div>
      )}
      {!onToggle && actions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {actions.slice(0, 2).map((a) => (
            <Button key={a.label} type="button" variant="outline" className="min-h-11" disabled={a.disabled} onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </li>
  )
}
