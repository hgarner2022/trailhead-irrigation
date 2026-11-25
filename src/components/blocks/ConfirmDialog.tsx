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
  /** the dismiss button's words when "Cancel" or "Keep it" would not say it (the booking form's "Keep booking") */
  dismissLabel?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** runs the confirm; answers the API's outcome. `variant` is what `renderConfirm` passed (which of a split button's two ways was pressed) */
  onConfirm?: (variant?: string) => Promise<ConfirmOutcome>
  /** draws the confirm itself, for a split button (Move): `confirm(variant)` runs `onConfirm(variant)` with the dialog's pending and problem handling; the plain confirm button is not drawn */
  renderConfirm?: (args: { confirm: (variant?: string) => void; pending: boolean }) => ReactNode
  /** what the catalog logs when there is no action */
  log?: string
  actions?: "confirm" | "none"
  size?: "sm" | "md"
  /** data-slot of the dialog, for the screens' own tests */
  slot?: string
}

export function ConfirmDialog({ title, message, blocked, children, confirmLabel, destructive = false, confirmDisabled, dismissLabel, open, onOpenChange, onConfirm, renderConfirm, log, actions = "confirm", size = "sm", slot }: ConfirmDialogProps) {
  const [pending, start] = useTransition()
  const [problem, setProblem] = useState("")
  const confirm = (variant?: string) => {
    if (!onConfirm) {
      if (log) console.info(log)
      return onOpenChange(false)
    }
    start(async () => {
      const out = await onConfirm(variant)
      setProblem(out.ok ? "" : out.message)
      if (out.ok) onOpenChange(false)
    })
  }
  const text = blocked ?? message
  return (
    <Dialog open={open} onOpenChange={(next) => (setProblem(""), onOpenChange(next))}>
      <DialogContent showCloseButton={false} data-slot={slot ?? "confirm-dialog"} className={cn("flex max-h-[92svh] flex-col overflow-hidden", size === "md" ? "sm:max-w-md" : "sm:max-w-[400px]")}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">{title}</DialogTitle>
          {text ? <DialogDescription>{text}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {/* a long body (a month calendar) scrolls here, so the title and the buttons stay in view on a phone */}
        {children && <div data-slot="dialog-body" className="-mx-6 grid min-h-0 gap-4 overflow-y-auto px-6 py-1">{children}</div>}
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {problem}
        </p>
        {actions === "confirm" && (
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              {dismissLabel ?? (destructive || blocked ? "Keep it" : "Cancel")}
            </Button>
            {!blocked && renderConfirm && renderConfirm({ confirm, pending: pending || Boolean(confirmDisabled) })}
            {!blocked && !renderConfirm && confirmLabel && (
              <Button className={cn("min-h-11", destructive && "bg-destructive text-white hover:bg-destructive/90")} onClick={() => confirm()} disabled={pending || confirmDisabled}>
                {confirmLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
