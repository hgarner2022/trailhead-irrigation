"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatPhone } from "@/lib/format/contact"
import { visitPaid } from "@/lib/admin/jobs"
import type { AdminData, Client, Pass, Visit } from "@/lib/admin/types"
import { FIELD } from "./CustomerPicker"
import type { VisitActions } from "./visit-actions-types"
import { dayLabel, dayOfVisit, kindLabel, priceWords } from "./visit-panel-model"

// Edit (minutes, who, access note: notes are added in the Notes and history block, never rewritten here), Send a text and Cancel visit:
// the visit panel's quieter actions, each a footer button that opens ONE `ConfirmDialog` (nothing grows in the panel's body). Edit and
// Send are forms with the dialog's own button; Cancel asks first and names the visit and the money (it is the one action here that
// cannot be taken back). A refusal shows in the API's words in the dialog. Client component.

export const TEXT_MAX = 320

interface Shown {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditDialog({ visit, people, actions, open, onOpenChange }: { visit: Visit; people: AdminData["settings"]["people"]; actions?: VisitActions } & Shown) {
  const [minutes, setMinutes] = useState(String(visit.minutes ?? 60))
  const [personId, setPersonId] = useState(visit.personId ?? "")
  const [access, setAccess] = useState(visit.property?.accessNote ?? "")
  const save = async () => {
    const changes = {
      ...(Number(minutes) !== (visit.minutes ?? 60) ? { durationMinutes: Number(minutes) } : {}),
      ...(personId && personId !== visit.personId ? { personId } : {}),
      ...(access !== (visit.property?.accessNote ?? "") ? { accessNote: access } : {}),
    }
    if (!actions) return (console.info("edit", visit.id, changes), { ok: true as const })
    return actions.edit(visit.id, changes)
  }
  return (
    <ConfirmDialog slot="visit-edit" title="Edit" message="Minutes, who and the access note. Notes are added in Notes and history." confirmLabel="Save" open={open} onOpenChange={onOpenChange} onConfirm={save}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Minutes">
          <select value={minutes} onChange={(e) => setMinutes(e.target.value)} className={FIELD}>
            {Array.from({ length: 32 }, (_, i) => (i + 1) * 15).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Who">
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} className={FIELD} disabled={!visit.scheduledOn}>
            {!visit.personId && <option value="">No one yet</option>}
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <FormRow label="Access note">
        <Input value={access} onChange={(e) => setAccess(e.target.value)} placeholder="Gate code, dog, where the controller is" className="min-h-11" />
      </FormRow>
    </ConfirmDialog>
  )
}

/** The consent line the text shows before it goes: where it goes, what it says at the end. */
export function textConsentLine(client: Pick<Client, "phone"> | undefined): string {
  return client?.phone ? `Goes by text to ${formatPhone(client.phone)}, with the opt-out line added. Replies of STOP are honoured.` : "This customer has no mobile number, so a text cannot go."
}

export function TextDialog({ client, visitId, actions, open, onOpenChange }: { client: Pick<Client, "id" | "phone"> | undefined; visitId?: string; actions?: VisitActions } & Shown) {
  const [text, setText] = useState("")
  const send = async () => {
    if (!client) return { ok: false as const, message: "This customer has no mobile number, so a text cannot go." }
    if (!actions) return (console.info("send text", client.id, text), { ok: true as const })
    const out = await actions.sendText(client.id, visitId, text.trim())
    if (out.ok) setText("")
    return out
  }
  return (
    <ConfirmDialog slot="visit-text" title="Send a text" message={textConsentLine(client)} confirmLabel="Send text" confirmDisabled={!text.trim() || !client?.phone} open={open} onOpenChange={onOpenChange} onConfirm={send}>
      <FormRow label="Text to send" hideLabel hint={`${text.length}/${TEXT_MAX}`}>
        <Textarea value={text} maxLength={TEXT_MAX} rows={3} onChange={(e) => setText(e.target.value)} placeholder="Running 20 minutes late." />
      </FormRow>
    </ConfirmDialog>
  )
}

/** What Cancel visit says will happen to the money, in words. */
export function cancelSentence(visit: Visit, pass?: Pass): string {
  const rest = pass ? ` The rest of Season Pass ${pass.number} stays.` : ""
  const paid = visitPaid(visit)
  const money = paid ? `The ${priceWords(visit)} already collected is not returned here.` : (visit.price ?? 0) > 0 ? `${priceWords(visit)} will not be charged.` : "Nothing will be charged."
  return `${money}${rest}`
}

export function CancelVisitDialog({ visit, pass, actions, open, onOpenChange }: { visit: Visit; pass?: Pass; actions?: VisitActions } & Shown) {
  const day = dayOfVisit(visit)
  const what = `${visit.clientName}'s ${kindLabel(visit).toLowerCase()}${day ? ` on ${dayLabel(day)}` : ""}`
  return (
    <ConfirmDialog
      title={`Cancel ${what}?`}
      message={cancelSentence(visit, pass)}
      destructive
      confirmLabel="Cancel visit"
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={actions ? () => actions.cancel(visit.id) : undefined}
      log={`cancel visit ${visit.id}`}
    />
  )
}
