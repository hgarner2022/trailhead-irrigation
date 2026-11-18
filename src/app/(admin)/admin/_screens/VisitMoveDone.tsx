"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { NOT_DONE_LABEL, NOT_DONE_REASONS, type NotDoneReason } from "@/lib/admin/visit-defaults"
import type { Visit } from "@/lib/admin/types"
import { FIELD } from "./CustomerPicker"
import type { VisitActions, Where } from "./visit-actions-types"

// Not done: the routine action of a visit that did not happen (Done is the footer's Mark done, `VisitFooter`; Move is `VisitMove`). A footer button
// that opens ONE `ConfirmDialog`, acts at once and offers Undo for ten seconds (docs/UX_PATTERNS.md); a refusal shows in the API's words in the dialog. Client component.

interface Shown {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Not done: a reason, then it goes back to Unscheduled; the reason is kept. */
export function NotDoneDialog({ visit, actions, open, onOpenChange }: { visit: Visit; actions?: VisitActions } & Shown) {
  const [reason, setReason] = useState<NotDoneReason>("could-not-get-in")
  const [note, setNote] = useState("")
  const toast = useUndoToast()
  const submit = async () => {
    if (!actions) return (console.info("mark not done", visit.id, reason), { ok: true as const })
    const out = await actions.markNotDone(visit.id, reason, note.trim() || undefined)
    if (out.ok) toast("Marked not done. ", async () => void (await actions.putBack(visit.id, out.data as Where)))
    return out
  }
  return (
    <ConfirmDialog slot="visit-not-done" title="Not done" message="It goes back to Unscheduled, and the reason is kept." confirmLabel="Mark not done" open={open} onOpenChange={onOpenChange} onConfirm={submit}>
      <FormRow label="Why">
        <select value={reason} onChange={(e) => setReason(e.target.value as NotDoneReason)} className={FIELD}>
          {NOT_DONE_REASONS.map((r) => (
            <option key={r} value={r}>
              {NOT_DONE_LABEL[r]}
            </option>
          ))}
        </select>
      </FormRow>
      {reason === "other" && <Input aria-label="What happened" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened" className="min-h-11" />}
    </ConfirmDialog>
  )
}
