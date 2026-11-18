"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// The one dialog of the admin (docs/DESIGN.md, "The recipe"): one question, 400px, opened over a panel and never over another dialog.
// A destructive confirm reads "Keep it" and the verb of the thing it does ("Cancel visit", "Refund $145"); any other question
// dismisses with "Cancel". `message` says what happens to the money and the schedule; `children` holds the one field or choice the
// question needs (the day a visit was done, why it was not). The API's own words show under the body when it refuses, and the dialog
// closes when the call goes through. `blocked` is why it cannot go ahead: it takes the message's place and the confirm button is
// not drawn, so the only way forward is to keep it. A destructive confirm is drawn in the destructive colour, never the orange of a primary. `actions="none"` is for a body that carries its own button (How is this paid?).
// Without `onConfirm` (the catalog) it only logs. Moved up from the Cancel confirm of the screens.

export type ConfirmOutcome = { ok: true } | { ok: false; message: string }

export interface ConfirmDialogProps {
  title: string
  message?: string
  /** the question cannot go ahead, and why; shown in place of the message */
  blocked?: string
  children?: ReactNode
  /** the verb of the confirm button: "Cancel visit", "Refund $145", "Mark done" */
  confirmLabel?: string
  /** the thing the button does is hard to take back: its dismiss reads "Keep it" instead of "Cancel" */
  destructive?: boolean
  confirmDisabled?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  /** runs the confirm; answers the API's outcome */
  onConfirm?: () => Promise<ConfirmOutcome>
  /** what the catalog logs when there is no action */
  log?: string
  actions?: "confirm" | "none"
  size?: "sm" | "md"
  /** data-slot of the dialog, for the screens' own tests */
  slot?: string
}

export function ConfirmDialog({ title, message, blocked, children, confirmLabel, destructive = false, confirmDisabled, open, onOpenChange, onConfirm, log, actions = "confirm", size = "sm", slot }: ConfirmDialogProps) {
  const [pending, start] = useTransition()
  const [problem, setProblem] = useState("")
  const confirm = () => {
    if (!onConfirm) {
      if (log) console.info(log)
      return onOpenChange(false)
    }
    start(async () => {
      const out = await onConfirm()
      setProblem(out.ok ? "" : out.message)
      if (out.ok) onOpenChange(false)
    })
  }
  const text = blocked ?? message
  return (
    <Dialog open={open} onOpenChange={(next) => (setProblem(""), onOpenChange(next))}>
      <DialogContent showCloseButton={false} data-slot={slot ?? "confirm-dialog"} className={size === "md" ? "sm:max-w-md" : "sm:max-w-[400px]"}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">{title}</DialogTitle>
          {text ? <DialogDescription>{text}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {children}
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {problem}
        </p>
        {actions === "confirm" && (
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              {destructive || blocked ? "Keep it" : "Cancel"}
            </Button>
            {!blocked && confirmLabel && (
              <Button className={cn("min-h-11", destructive && "bg-destructive text-white hover:bg-destructive/90")} onClick={confirm} disabled={pending || confirmDisabled}>
                {confirmLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
