"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatPhone } from "@/lib/format/contact"
import type { AdminData, Client, Pass, Visit } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { dayLabel, dayOfVisit, kindLabel, priceWords } from "./visit-panel-model"

// Edit, Send a text, Resend confirmation and Cancel this visit: the visit panel's quieter actions. Edit and Send
// are forms with a button; Cancel asks first and names the visit and the money (it is the one action here that
// cannot be taken back). A refusal shows in the API's words under the control. Client component.

const FIELD = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
const LABEL = "mb-1 block text-sm font-medium text-foreground"
export const TEXT_MAX = 320

export function EditForm({ visit, pass, trucks, actions }: { visit: Visit; pass?: Pass; trucks: AdminData["settings"]["trucks"]; actions?: VisitActions }) {
  const [minutes, setMinutes] = useState(String(visit.minutes ?? 60))
  const [truckId, setTruckId] = useState(visit.truckId ?? "")
  const [notes, setNotes] = useState(visit.notes ?? "")
  const [access, setAccess] = useState(pass?.accessNote ?? "")
  const { pending, error, done, run } = useRunner()
  const save = () => {
    const changes = {
      ...(Number(minutes) !== (visit.minutes ?? 60) ? { durationMinutes: Number(minutes) } : {}),
      ...(truckId && truckId !== visit.truckId ? { truckId } : {}),
      ...(notes !== (visit.notes ?? "") ? { notes } : {}),
      ...(pass && access !== (pass.accessNote ?? "") ? { accessNote: access } : {}),
    }
    if (!actions) return console.info("edit", visit.id, changes)
    run(() => actions.edit(visit.id, changes), undefined, "Saved.")
  }
  return (
    <section aria-labelledby="visit-edit">
      <h3 id="visit-edit" className="font-display text-lg text-navy">
        Edit
      </h3>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-minutes" className={LABEL}>
            Minutes
          </label>
          <select id="edit-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={FIELD}>
            {Array.from({ length: 32 }, (_, i) => (i + 1) * 15).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-truck" className={LABEL}>
            Truck
          </label>
          <select id="edit-truck" value={truckId} onChange={(e) => setTruckId(e.target.value)} className={FIELD} disabled={!visit.scheduledOn}>
            {!visit.truckId && <option value="">No truck yet</option>}
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {pass && (
        <div className="mt-3">
          <label htmlFor="edit-access" className={LABEL}>
            Access note
          </label>
          <Input id="edit-access" value={access} onChange={(e) => setAccess(e.target.value)} placeholder="Gate code, dog, where the controller is" className="min-h-11" />
        </div>
      )}
      <div className="mt-3">
        <label htmlFor="edit-notes" className={LABEL}>
          Notes
        </label>
        <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <Button type="button" variant="outline" className="mt-2 min-h-11" disabled={pending} onClick={save}>
        Save changes
      </Button>
      <p role="alert" className={`${FORM_STATUS} mt-1 ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || done}
      </p>
    </section>
  )
}

/** The consent line the text shows before it goes: where it goes, what it says at the end. */
export function textConsentLine(client: Pick<Client, "phone"> | undefined): string {
  return client?.phone ? `Goes by text to ${formatPhone(client.phone)}, with the opt-out line added. Replies of STOP are honoured.` : "This customer has no mobile number, so a text cannot go."
}

export function TextForm({ client, visitId, actions }: { client: Pick<Client, "id" | "phone"> | undefined; visitId?: string; actions?: VisitActions }) {
  const [text, setText] = useState("")
  const { pending, error, done, run } = useRunner()
  const send = () => {
    if (!client) return
    if (!actions) return console.info("send text", client.id, text)
    run(() => actions.sendText(client.id, visitId, text.trim()), () => setText(""), "Text sent.")
  }
  return (
    <section aria-labelledby="visit-text">
      <h3 id="visit-text" className="font-display text-lg text-navy">
        Send a text
      </h3>
      <Textarea aria-label="Text to send" value={text} maxLength={TEXT_MAX} rows={3} onChange={(e) => setText(e.target.value)} className="mt-2" placeholder="Running 20 minutes late." />
      <p className="mt-1 flex justify-between gap-3 text-sm text-muted-foreground">
        <span>{textConsentLine(client)}</span>
        <span className="tabular-nums">{`${text.length}/${TEXT_MAX}`}</span>
      </p>
      <Button type="button" variant="outline" className="mt-2 min-h-11" disabled={pending || !text.trim() || !client?.phone} onClick={send}>
        Send text
      </Button>
      <p role="alert" className={`${FORM_STATUS} mt-1 ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || done}
      </p>
    </section>
  )
}

export function ResendButton({ passId, actions }: { passId: string; actions?: VisitActions }) {
  const { pending, error, done, run } = useRunner()
  return (
    <div>
      <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => (actions ? run(() => actions.resendConfirmation(passId), undefined, "Confirmation sent.") : console.info("resend confirmation", passId))}>
        Resend confirmation
      </Button>
      <p role="alert" className={`${FORM_STATUS} mt-1 ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || done}
      </p>
    </div>
  )
}

/** What Cancel this visit says will happen to the money, in words. */
export function cancelSentence(visit: Visit, pass?: Pass): string {
  const rest = pass ? ` The rest of Season Pass ${pass.number} stays.` : ""
  const paid = Boolean(visit.chargedAt)
  const money = paid ? `The ${priceWords(visit)} already collected is not returned here.` : (visit.price ?? 0) > 0 ? `${priceWords(visit)} will not be charged.` : "Nothing will be charged."
  return `${money}${rest}`
}

export function CancelVisit({ visit, pass, actions }: { visit: Visit; pass?: Pass; actions?: VisitActions }) {
  const [open, setOpen] = useState(false)
  const { pending, error, run, clear } = useRunner()
  const day = dayOfVisit(visit)
  const what = `${visit.clientName}'s ${kindLabel(visit).toLowerCase()}${day ? ` on ${dayLabel(day)}` : ""}`
  const cancel = () => {
    if (!actions) return setOpen(false)
    run(() => actions.cancel(visit.id), () => setOpen(false))
  }
  return (
    <>
      <Button type="button" variant="ghost" className="min-h-11 text-destructive hover:text-destructive" onClick={() => (clear(), setOpen(true))}>
        Cancel this visit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold text-navy">{`Cancel ${what}?`}</DialogTitle>
            <DialogDescription>{cancelSentence(visit, pass)}</DialogDescription>
          </DialogHeader>
          <p role="alert" className="text-sm text-destructive empty:hidden">
            {error}
          </p>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
              Keep visit
            </Button>
            <Button className="min-h-11" onClick={cancel} disabled={pending}>
              Cancel visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
