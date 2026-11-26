"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SidePanel } from "./SidePanel"
import { StatusPill } from "./StatusPill"

// The peek (docs/plans/2026-11-26-scheduler-review-research.md, point 2): one click or Enter on a visit on the Schedule opens its facts in the product's docked SidePanel, a non-modal
// aside beside the grid from 1280 (the grid stays usable) and a full-height sheet on a phone. It shows the customer, service, day and time, length, who, where and the job, and three
// buttons: Edit visit (one dialog changes the day, time, person and length), Mark done (only for a visit today or earlier) and Open job (the job's page, where the history, payments and photos
// live). Opening another visit swaps the content; Escape or Close shuts it and the host returns focus to the block. Pure props, client component.

export interface VisitPeekProps {
  /** the customer, the panel's title */
  customer: string
  service: string
  /** "Wed, Nov 18, 8:00 to 9:00 am" or "Wed, Nov 18, Any time" */
  when: string
  /** "1 h" */
  length: string
  /** the person's full name, or "No one yet" */
  who: string
  /** "Willow Dr, Erie" */
  address: string
  /** the job the visit belongs to, "Fall blowout at Willow Dr" */
  job: string
  done?: boolean
  waiting?: boolean
  /** the visit is today or earlier and not done: Mark done is offered */
  canMarkDone: boolean
  /** the words of a clash, said under the facts */
  conflict?: string
  onEdit: () => void
  onMarkDone: () => void
  onOpenJob: () => void
  onClose: () => void
  className?: string
}

export function VisitPeek({ customer, service, when, length, who, address, job, done, waiting, canMarkDone, conflict, onEdit, onMarkDone, onOpenJob, onClose, className }: VisitPeekProps) {
  // Escape shuts the docked peek (the sheet below 1280 is a dialog and closes itself); the heading takes focus when a visit is opened or swapped in
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && !document.querySelector('[role="dialog"]') && onClose()
    document.addEventListener("keydown", key)
    return () => document.removeEventListener("keydown", key)
  }, [onClose])
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('aside.visit-peek h2')
    if (heading) {
      heading.tabIndex = -1
      heading.classList.add("w-fit", "rounded-sm", "outline-none", "focus-visible:ring-2", "focus-visible:ring-primary/50")
      heading.focus({ preventScroll: true })
    }
  }, [customer, when])
  const facts: [string, string][] = [["Service", service], ["When", when], ["Length", length], ["Who", who], ["Where", address], ["Job", job]]
  // A plain link out to the device's maps app, not an API call
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  const primary = canMarkDone && !done
  return (
    <SidePanel
      variant="docked"
      open
      onOpenChange={(o) => !o && onClose()}
      title={customer}
      pills={(done || waiting) && <>{done && <StatusPill status="done" />}{waiting && <StatusPill status="waiting" />}</>}
      className={`visit-peek max-xl:h-dvh max-xl:rounded-none ${className ?? ""}`}
      footer={
        <>
          {primary && <Button type="button" className="min-h-11" onClick={onMarkDone}>Mark done</Button>}
          <Button type="button" variant={primary ? "outline" : "default"} className="min-h-11" onClick={onEdit}>Edit visit</Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={onOpenJob}>Open job</Button>
        </>
      }
    >
      <dl data-slot="visit-peek-facts" className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-foreground">
              {value}
              {label === "Where" && (
                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Directions to ${address}`}
                  data-slot="peek-directions"
                  className="mt-1 flex min-h-11 w-fit items-center font-medium text-primary-dark underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:mt-0 md:inline-flex md:min-h-0 md:pl-3"
                >
                  Directions
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {conflict && <p data-slot="conflict-words" className="mt-3 text-sm text-destructive">{conflict}</p>}
    </SidePanel>
  )
}
