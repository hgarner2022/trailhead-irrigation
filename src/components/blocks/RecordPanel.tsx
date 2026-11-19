"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SidePanel } from "./SidePanel"
import { FooterSlotContext } from "./record-slot"

// The one panel every record opens in (docs/DESIGN.md, "The recipe"): Customer, Job and Visit pass data, never markup. From top to
// bottom: the header (the name in the display face, a muted one-line subtitle that never repeats a pill, the pills under it, Close at
// the right), the facts (a label column fixed at 112px, no heading), the sections each under its SectionHeading, and the footer
// (`RecordFooter`). It is the SidePanel underneath, so the width, the scrim, the focus and the phone sheet are as built. Side padding
// 24, 24 between sections, 8 under a heading. Replaces the pieces of PanelParts and the three hand-built footers.

export type RecordFact = [label: string, value: ReactNode]

/** A label and its value per line; the label column is 112px, the label grey and the value medium weight and free to wrap. `divided` puts a hairline between the rows (the aside cards and the invoice panel). */
export function RecordFacts({ rows, className, divided }: { rows: readonly RecordFact[]; className?: string; divided?: boolean }) {
  if (divided)
    return (
      <dl data-slot="record-facts" data-divided="true" className={cn("divide-y divide-border text-sm", className)}>
        {rows.map(([term, value]) => (
          <div key={term} className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="min-w-0 break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    )
  return (
    <dl data-slot="record-facts" className={cn("mt-2 grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm", className)}>
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="min-w-0 break-words font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The list a section's rows go in: 44px rows with a hairline between. */
export function RecordList({ children, className, ...rest }: { children: ReactNode; className?: string } & Record<`data-${string}`, string>) {
  return (
    <ul className={cn("mt-2 divide-y divide-border text-sm", className)} {...rest}>
      {children}
    </ul>
  )
}

/** The classes of a row's clickable box: one gap, one vertical rhythm, 44px at least. */
export const RECORD_ROW = "min-h-11 gap-3 py-1.5"

/** The left of a row: a title over a detail, each on one line with an ellipsis. */
export function RecordRowText({ title, detail, strong }: { title: string; detail?: string; strong?: boolean }) {
  return (
    <span className="block min-w-0 flex-1">
      <span className={cn("block truncate", strong ? "font-semibold" : "font-medium")} title={title}>
        {title}
      </span>
      {detail ? (
        <span className="block truncate text-muted-foreground" title={detail}>
          {detail}
        </span>
      ) : null}
    </span>
  )
}

/** The right of a row: a pill or an amount, which shrinks last (never). */
export function RecordRowEnd({ children }: { children: ReactNode }) {
  return <span className="shrink-0 text-right">{children}</span>
}

export interface RecordPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** one muted line; says what the record is, never what a pill says */
  subtitle?: string
  /** the status pills under the subtitle */
  pills?: ReactNode
  /** the record this one was opened from, as a crumb above the title that goes back to it */
  back?: { label: string; onClick: () => void }
  /** the facts directly under the header, in order */
  facts?: readonly RecordFact[]
  /** a line of status or a refusal above the facts */
  notice?: ReactNode
  /** the sections, each with its SectionHeading */
  children?: ReactNode
  /** a `RecordFooter`; nothing when the person may only read */
  footer?: ReactNode
  /** data-slot of the body, for the screens' own tests */
  slot?: string
}

export function RecordPanel({ open, onOpenChange, title, subtitle, pills, back, facts, notice, children, footer, slot }: RecordPanelProps) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  return (
    <FooterSlotContext.Provider value={{ element, setElement }}>
      <SidePanel open={open} onOpenChange={onOpenChange} title={title} description={subtitle} pills={pills} back={back} footer={footer}>
        <div className="flex flex-col gap-6" data-slot={slot ?? "record-panel"}>
          {notice}
          {facts && facts.length > 0 && <RecordFacts rows={facts} className="mt-0" />}
          {children}
        </div>
      </SidePanel>
    </FooterSlotContext.Provider>
  )
}
