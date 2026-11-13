"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// The one cancel link on the pass page and the dialog it opens: the plain
// consequence first, then, once confirmed, the answer in the same dialog so
// the customer sees that something happened. `onConfirm` is where the wiring
// phase cancels the pass; the prototype only swaps the words. Client because
// of the confirmed state; PassPageScreen stays a server component.

/** What a server action answers: `ok: false` keeps the dialog open with the message. Anything else counts as done. */
export type ActionResult = { ok: boolean; message?: string } | void

export interface CancelPassDialogProps {
  onConfirm?: () => ActionResult | Promise<ActionResult>
}

export function CancelPassDialog({ onConfirm }: CancelPassDialogProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = async () => {
    setError(null)
    const run = onConfirm?.()
    if (run && typeof (run as Promise<ActionResult>).then === "function") {
      setPending(true)
      try {
        const result = await run
        if (result && result.ok === false) {
          setError(result.message ?? "That did not go through. Please try again, or call us.")
          return
        }
      } catch {
        setError("That did not go through. Please try again, or call us.")
        return
      } finally {
        setPending(false)
      }
    } else if (run && (run as { ok?: boolean }).ok === false) {
      setError((run as { message?: string }).message ?? "That did not go through. Please try again, or call us.")
      return
    }
    setConfirmed(true)
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto px-0 py-2 text-destructive">
          Cancel my pass
        </Button>
      </DialogTrigger>
      <DialogContent data-slot="cancel-pass-dialog" data-confirmed={confirmed}>
        {confirmed ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">Your pass is cancelled.</DialogTitle>
              <DialogDescription className="text-base">Nothing further is charged.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Back to my pass</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">Cancel your Season Pass?</DialogTitle>
              <DialogDescription className="text-base">Nothing further is charged. Your remaining visits come off the schedule.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Keep my pass</Button>
              </DialogClose>
              <Button onClick={confirm} disabled={pending}>
                Cancel the pass
              </Button>
            </DialogFooter>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
