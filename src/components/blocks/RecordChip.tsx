"use client"

import Link from "next/link"
import { useRef, useState, type MouseEvent, type PointerEvent } from "react"
import { HoverCard } from "radix-ui"
import { cn } from "@/lib/utils"
import { RecordMark, RecordPreview } from "./RecordPreview"
import { KIND_WORD, type RecordKind, type RecordPreviewData } from "./record-preview-model"

// The one way a record's name appears (docs/plans/2026-11-19-record-links-research.md): the object's icon or the person's initials, then the
// name in orange with a thin underline that goes solid on hover and focus. A screen reader hears the kind first ("Customer: Andrea Reyes").
// With `preview` it shows a `RecordPreview` on hover (after 400 ms), on keyboard focus and on a 500 ms press on a phone; Esc dismisses it and
// the pointer can move onto it (WCAG 1.4.13). A click opens the record through `onOpen` where a host opens it in place (the new tab and every
// modified click keep the plain link). With no `href` the chip is quiet: same mark, navy text, no underline, so a missing link is visible.
// The label never wraps or ellipsises (a narrow place passes `short`; wrapping is only between one chip and the next). Sizes: `band` for a summary band value, `row` for a row, an aside card or a fact (44px tall). Never put one inside a whole-row button.

export interface RecordChipProps {
  kind: RecordKind
  name: string
  /** the record's own page; leave it off for a record with no page (shown quiet) */
  href?: string
  size?: "band" | "row"
  /** no icon square or initials before the name: a second line in a table cell, under a chip that has one */
  noMark?: boolean
  /** the short form shown below `md` ("Today" for "Today, Wed Nov 18", "Ryan" for "Ryan Garner"); the name from `md` up */
  short?: string
  onOpen?: () => void
  /** the card shown on hover, focus and long-press */
  preview?: RecordPreviewData
  /** shows the card at once (stories, tests) */
  previewOpen?: boolean
  /** a mark on the record, shown as a small red dot after the name with this as its tooltip and its words for a screen reader: "Do not service" on a customer */
  flag?: string
  className?: string
}

const LINK = "rounded-sm text-primary-dark underline decoration-primary/40 underline-offset-2 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

export function RecordChip({ kind, name, href, size = "row", noMark, flag, short, onOpen, preview, previewOpen, className }: RecordChipProps) {
  const [open, setOpen] = useState(Boolean(previewOpen))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressed = useRef(false)
  const cls = cn("inline-flex max-w-full items-center gap-2 align-middle", size === "row" ? "min-h-11 text-base font-semibold" : "min-h-11 text-2xl font-semibold leading-tight", className)

  const inner = (
    <>
      {!noMark && <RecordMark kind={kind} name={name} size={size} />}
      <span className="min-w-0 whitespace-nowrap">
        <span className="sr-only">{KIND_WORD[kind]}:</span>{" "}
        {short ? (
          <>
            <span className="md:hidden">{short}</span>
            <span className="hidden md:inline">{name}</span>
          </>
        ) : (
          name
        )}
      </span>
      {flag && (
        <span data-slot="record-chip-flag" title={flag} className="inline-flex shrink-0 items-center">
          <span aria-hidden className="size-2 rounded-full bg-destructive" />
          <span className="sr-only">, {flag}</span>
        </span>
      )}
    </>
  )

  // no page: the same mark and name, quiet
  if (!href) {
    return (
      <span data-slot="record-chip" data-kind={kind} data-state="no-link" className={cn(cls, "text-navy")}>
        {inner}
      </span>
    )
  }

  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    // a press that showed the card is not a click
    if (pressed.current) {
      pressed.current = false
      event.preventDefault()
      return
    }
    if (!onOpen || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpen()
  }
  const down = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "touch") return
    timer.current = setTimeout(() => {
      pressed.current = true
      setOpen(true)
    }, 500)
  }
  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const link = (
    <Link href={href} onClick={click} onPointerDown={down} onPointerUp={clear} onPointerCancel={clear} onPointerLeave={clear} data-slot="record-chip" data-kind={kind} className={cn(cls, LINK, "select-none [-webkit-touch-callout:none]")}>
      {inner}
    </Link>
  )
  if (!preview) return link

  return (
    <HoverCard.Root open={open} onOpenChange={setOpen} openDelay={400} closeDelay={150}>
      <HoverCard.Trigger asChild>{link}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content side="bottom" align="start" sideOffset={4} collisionPadding={16} className="z-50 outline-hidden">
          <RecordPreview data={preview} onOpen={onOpen} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}
