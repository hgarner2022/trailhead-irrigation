"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hoursWords } from "@/lib/admin/day-fill"
import { shortDay as dayLabel } from "@/emails/format"
import { clockLabel } from "../visit-panel-model"
import { recommendedId } from "@/components/blocks/find-a-time-model"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { SplitButton } from "@/components/blocks/SplitButton"
import type { ConfirmFacts } from "./confirm-copy"
import type { BestTimes } from "@/components/blocks/best-times"
import { useBestTimesContext } from "./best-times-context"
import { SchedulePicker, type Pick } from "./SchedulePicker"

// The one Schedule and Move dialog (Hannah, Nov 19 2026), for the job page, a Season Pass trip and the clickable flows: the day cards, the
// person or people, the start time and the crew options (a text that it is assigned, one line of instructions), with
// "Schedule and notify the customer" as the confirm and "without notifying" under the caret. `onConfirm` gets the pick and whether the
// customer is to be told. Pure props, client state.


export interface ScheduleResult extends Pick {
  /** the customer is texted or emailed the day and time */
  notify: boolean
  /** the visit's length, only when the dialog was opened with the Length field */
  minutes?: number
}

const LENGTH_STEP = 15
const LENGTH_MIN = 15
const LENGTH_MAX = 240

export interface ScheduleDialogProps {
  verb: "Schedule" | "Move"
  first: string
  channel?: "text" | "email"
  address?: string
  service?: string
  signedIn?: string
  onClose: () => void
  onConfirm: (r: ScheduleResult) => void
  initialPeople?: string[]
  initialCrewText?: boolean
  /** minutes the visit takes, for the open start times (the reviewed dialog assumes 60) */
  minutes?: number
  /** the ranked best times above the calendar; the walkthrough supplies them through context, a screen through this prop. Absent, the dialog is the reviewed one */
  best?: BestTimes
  /** another title than the reviewed one: the Schedule's "Edit visit" and "Schedule visit" (docs/plans/2026-11-26-scheduler-review-research.md, point 2) */
  title?: string
  /** adds a Length field (15 minute steps) above the day, and the open times follow it; absent, the dialog is the reviewed one */
  lengthField?: boolean
  /** the best times for a given length: with the Length field, the list is ranked again for the new length (rows that no longer fit drop out) */
  bestFor?: (minutes: number) => BestTimes
}

export function ScheduleDialog({ verb, first, channel = "text", address, service, signedIn = "Ryan Garner", onClose, onConfirm: confirmed, initialPeople = ["Ryan Garner"], initialCrewText = false, minutes, best: bestProp, title, lengthField, bestFor }: ScheduleDialogProps) {
  const ctx = useBestTimesContext()
  const [length, setLength] = useState(minutes ?? 60)
  const best = lengthField && bestFor ? bestFor(length) : (bestProp ?? ctx?.best)
  const onConfirm = (r: ScheduleResult) => (ctx && !bestProp ? ctx.record(r, verb) : undefined, confirmed(r))
  const start = best ? [...best.rows, ...(best.forced ?? [])].find((r) => r.id === (best.initialPickId ?? (best.current ? undefined : recommendedId(best.rows)))) : undefined
  const own = best?.current && !start ? best.current : undefined
  const people0 = best && start ? [start.personName] : own ? [own.personName] : initialPeople
  const [pick, setPick] = useState<Pick>({ dayIso: start?.day ?? own?.day, day: start ? dayLabel(start.day) : own ? dayLabel(own.day) : "Tue, Nov 24", time: start ? clockLabel(start.start) : own?.start ? clockLabel(own.start) : "Any time", person: people0[0]!, people: people0, crewText: initialCrewText && people0.some((p) => p !== signedIn), instructions: "" })
  return (
    <ConfirmDialog
      open
      size="md"
      onOpenChange={(o) => !o && onClose()}
      title={title ?? (verb === "Schedule" ? "Schedule the job" : "Move the visit")}
      slot="flow-schedule"
      onConfirm={async (variant) => (onConfirm({ ...pick, notify: variant !== "quiet", ...(lengthField ? { minutes: length } : {}) }), { ok: true })}
      renderConfirm={({ confirm, pending }) => (
        <SplitButton label={`${verb} and notify the customer`} onClick={() => confirm("text")} disabled={pending} menuLabel={`More ways to ${verb.toLowerCase()}`} menu={[{ label: `${verb} without notifying`, disabled: pick.time !== "Any time", onSelect: () => confirm("quiet") }]} />
      )}
    >
      {lengthField && (
        <div data-slot="length-field" role="group" aria-label="Length" className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">Length</span>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="15 minutes shorter" disabled={length <= LENGTH_MIN} onClick={() => setLength((l) => Math.max(LENGTH_MIN, l - LENGTH_STEP))}>
            <Minus className="size-4" aria-hidden />
          </Button>
          <span aria-live="polite" className="min-w-16 text-center text-sm tabular-nums text-foreground">{hoursWords(length)}</span>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="15 minutes longer" disabled={length >= LENGTH_MAX} onClick={() => setLength((l) => Math.min(LENGTH_MAX, l + LENGTH_STEP))}>
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      )}
      <SchedulePicker firstName={first} channel={channel} signedIn={signedIn} address={address} service={service} minutes={lengthField ? length : minutes} initialPeople={initialPeople} initialCrewText={initialCrewText} onChange={setPick} best={best} />
    </ConfirmDialog>
  )
}

/** The dialog a page's Schedule or Move button opens, read from the confirmation facts; the result goes to `onSchedule`, else to the page's `onDo` with "quiet" when the customer is not told. */
export function ScheduleForFacts({ verb, facts, onClose, onDo, onSchedule }: { verb: "Schedule" | "Move"; facts: ConfirmFacts; onClose: () => void; onDo?: (label: string, variant?: string) => void; onSchedule?: (r: ScheduleResult) => void }) {
  const service = facts.service.charAt(0).toUpperCase() + facts.service.slice(1)
  return <ScheduleDialog verb={verb} first={facts.first} channel={facts.channel === "email" ? "email" : "text"} address={facts.address} service={service} onClose={onClose} onConfirm={(r) => (onSchedule ? onSchedule(r) : onDo?.(verb, r.notify ? undefined : "quiet"))} />
}
