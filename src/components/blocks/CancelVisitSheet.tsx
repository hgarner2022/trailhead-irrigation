"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ADD_IT_BACK, CANCEL_CHANGED_MIND, CANCELED_DONE } from "@/lib/portal/words"
import type { SheetResult } from "./RescheduleSheet"

// Cancel visit: one confirm step that states the consequence before the tap (docs/plans/2026-11-18-customer-portal-v2-design.md, section 4), an optional line
// for Ryan only, one red button and "Keep my visit" as the way back. After it: "Canceled. We texted you a note. Changed your mind? Text Ryan to add it back." `onCancel` is the
// server action (`visits.cancelSelf`); `{ ok: false, message }` keeps the sheet open with the handler's own words. Until our own booking is live the done step
// says "Text Ryan to add it back" (architecture section 8, question 1), with Text Ryan opening the customer's messages; once it is, it says Book Online.

export interface CancelVisitSheetProps {
  /** "Spring turn-on" */
  service: string
  /** "Wednesday, April 28", or "No day yet" */
  dayWords: string
  /** what is and is not charged, from `cancelConsequence` */
  consequence: string
  /** the `sms:` link for "Text Ryan to add it back" */
  textHref: string
  onCancel?: (reason: string) => SheetResult | Promise<SheetResult>
  className?: string
}

const FAILED = "We couldn't cancel that."

export function CancelVisitSheet({ service, dayWords, consequence, textHref, onCancel, className }: CancelVisitSheetProps) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const confirm = async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await onCancel?.(reason.trim())
      if (result && result.ok === false) return setError(result.message ?? FAILED)
      setDone(true)
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  return (
    // Once it said Canceled, closing it refreshes the page so the visit reads Canceled behind it.
    <Dialog onOpenChange={(open) => { if (!open && done) router.refresh() }}>
      <DialogTrigger asChild>
        <Button variant="link" className={className ?? "h-auto px-0 py-2 text-destructive"}>
          Cancel visit
        </Button>
      </DialogTrigger>
      <DialogContent data-slot="cancel-visit-sheet" data-done={done}>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">{CANCELED_DONE}</DialogTitle>
              <DialogDescription className="text-base">
                {`${CANCEL_CHANGED_MIND} `}
                <a href={textHref} className="font-semibold text-primary-deep underline underline-offset-2">
                  Text Ryan
                </a>
                {` ${ADD_IT_BACK}`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Done</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">{`Cancel your ${service.toLowerCase()}?`}</DialogTitle>
              <DialogDescription className="text-base">{dayWords}</DialogDescription>
            </DialogHeader>
            <p className="text-base text-foreground">{consequence}</p>
            <label className="block space-y-1 text-base text-foreground">
              <span>Tell Ryan why (optional)</span>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {`${error} Try again, or text Ryan.`}
              </p>
            )}
            <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
              <Button onClick={confirm} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">
                Cancel visit
              </Button>
              <DialogClose asChild>
                <Button variant="ghost">Keep my visit</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
