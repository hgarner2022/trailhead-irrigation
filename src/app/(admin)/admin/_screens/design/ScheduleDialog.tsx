"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { SplitButton } from "@/components/blocks/SplitButton"
import type { ConfirmFacts } from "./confirm-copy"
import { SchedulePicker, type Pick } from "./SchedulePicker"

// The one Schedule and Move dialog (Hannah, Nov 19 2026), for the job page, a Season Pass trip and the clickable flows: the day cards, the
// person or people, the start time and the crew options (a text that it is assigned, one line of instructions), with
// "Schedule and notify the customer" as the confirm and "without notifying" under the caret. `onConfirm` gets the pick and whether the
// customer is to be told. Pure props, client state.

export interface ScheduleResult extends Pick {
  /** the customer is texted or emailed the day and time */
  notify: boolean
}

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
}

export function ScheduleDialog({ verb, first, channel = "text", address, service, signedIn = "Ryan Garner", onClose, onConfirm, initialPeople = ["Ryan Garner"], initialCrewText = false }: ScheduleDialogProps) {
  const [pick, setPick] = useState<Pick>({ day: "Tue, Nov 24", time: "Any time", person: initialPeople[0]!, people: initialPeople, crewText: initialCrewText && initialPeople.some((p) => p !== signedIn), instructions: "" })
  return (
    <ConfirmDialog
      open
      size="md"
      onOpenChange={(o) => !o && onClose()}
      title={verb === "Schedule" ? "Schedule the job" : "Move the job"}
      slot="flow-schedule"
      onConfirm={async (variant) => (onConfirm({ ...pick, notify: variant !== "quiet" }), { ok: true })}
      renderConfirm={({ confirm, pending }) => (
        <SplitButton label={`${verb} and notify the customer`} onClick={() => confirm("text")} disabled={pending} menuLabel={`More ways to ${verb.toLowerCase()}`} menu={[{ label: `${verb} without notifying`, disabled: pick.time !== "Any time", onSelect: () => confirm("quiet") }]} />
      )}
    >
      <SchedulePicker firstName={first} channel={channel} signedIn={signedIn} address={address} service={service} initialPeople={initialPeople} initialCrewText={initialCrewText} onChange={setPick} />
    </ConfirmDialog>
  )
}

/** The dialog a page's Schedule or Move button opens, read from the confirmation facts; the result goes to `onSchedule`, else to the page's `onDo` with "quiet" when the customer is not told. */
export function ScheduleForFacts({ verb, facts, onClose, onDo, onSchedule }: { verb: "Schedule" | "Move"; facts: ConfirmFacts; onClose: () => void; onDo?: (label: string, variant?: string) => void; onSchedule?: (r: ScheduleResult) => void }) {
  const service = facts.service.charAt(0).toUpperCase() + facts.service.slice(1)
  return <ScheduleDialog verb={verb} first={facts.first} channel={facts.channel === "email" ? "email" : "text"} address={facts.address} service={service} onClose={onClose} onConfirm={(r) => (onSchedule ? onSchedule(r) : onDo?.(verb, r.notify ? undefined : "quiet"))} />
}
