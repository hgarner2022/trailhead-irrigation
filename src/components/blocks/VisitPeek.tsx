"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Notice } from "./Notice"
import { RecordFacts, type RecordFact } from "./RecordPanel"
import { SidePanel } from "./SidePanel"
import { StatusPill } from "./StatusPill"
import { TextLink } from "./TextLink"

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
      // the heading is where a reader starts, not a control: it takes the focus without a ring (the next Tab lands on Close, which has one)
      heading.classList.add("outline-none")
      heading.focus({ preventScroll: true })
    }
  }, [customer, when])
  // A plain link out to the device's maps app, not an API call. The address itself is words, not a record link.
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  const where = (
    <>
      {address}
      <TextLink href={directions} target="_blank" touch="inline" weight="medium" aria-label={`Directions to ${address}`} data-slot="peek-directions" className="max-md:mt-1 max-md:flex max-md:min-h-11 max-md:w-fit max-md:items-center md:ml-3">
        Directions
      </TextLink>
    </>
  )
  // the admin's own fact list (RecordFacts): the customer is the title and is said once, the person and the address are words
  const facts: RecordFact[] = [["Service", service], ["When", <span key="when" className="tabular-nums">{when}</span>], ["Length", <span key="length" className="tabular-nums">{length}</span>], ["Who", who], ["Where", where], ["Job", job]]
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
          {primary && <Button type="button" size="touch" onClick={onMarkDone}>Mark done</Button>}
          <Button type="button" size="touch" variant={primary ? "outline" : "default"} onClick={onEdit}>Edit visit</Button>
          <Button type="button" size="touch" variant="outline" onClick={onOpenJob}>Open job</Button>
        </>
      }
    >
      <div data-slot="visit-peek-facts">
        <RecordFacts rows={facts} className="mt-0" />
      </div>
      {conflict && <Notice tone="error" role="status" data-slot="conflict-words" className="mt-4">{conflict}</Notice>}
    </SidePanel>
  )
}
