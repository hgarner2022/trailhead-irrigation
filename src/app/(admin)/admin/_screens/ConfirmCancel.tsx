"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Outcome } from "./action-types"

// The one confirm dialog for cancelling a record from its panel: Cancel this pass, Cancel this job. A title that asks, a message
// that says what happens to the money and the schedule, Keep (outline) and the cancel button. The API's own words show in the
// dialog when it refuses. `blocked` is a reason the cancel cannot go ahead (the job holds a payment): it takes the message's place
// and the cancel button is not drawn, so the only way forward is to keep it. Without `onConfirm` (the catalog) it only logs.

export interface ConfirmCancelProps {
  title: string
  message: string
  /** the cancel cannot go ahead, and why; shown in place of the message */
  blocked?: string
  keepLabel: string
  cancelLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** runs the cancel; answers the API's outcome */
  onConfirm?: () => Promise<Outcome>
  /** what the catalog logs when there is no action */
  log: string
}

export function ConfirmCancel({ title, message, blocked, keepLabel, cancelLabel, open, onOpenChange, onConfirm, log }: ConfirmCancelProps) {
  const [pending, start] = useTransition()
  const [problem, setProblem] = useState("")
  const cancel = () => {
    if (!onConfirm) {
      console.info(log)
      return onOpenChange(false)
    }
    start(async () => {
      const out = await onConfirm()
      setProblem(out.ok ? "" : out.message)
      if (out.ok) onOpenChange(false)
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">{title}</DialogTitle>
          <DialogDescription>{blocked ?? message}</DialogDescription>
        </DialogHeader>
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {problem}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {keepLabel}
          </Button>
          {!blocked && (
            <Button onClick={cancel} disabled={pending}>
              {cancelLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
