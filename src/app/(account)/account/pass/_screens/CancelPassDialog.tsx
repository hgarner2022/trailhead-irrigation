"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// The one cancel link on the pass page and the dialog it opens: the plain
// consequence first, then, once confirmed, the answer in the same dialog so
// the customer sees that something happened. `onConfirm` is where the wiring
// phase cancels the pass; the prototype only swaps the words. Client because
// of the confirmed state; PassPageScreen stays a server component.

export interface CancelPassDialogProps {
  onConfirm?: () => void
}

export function CancelPassDialog({ onConfirm }: CancelPassDialogProps) {
  const [confirmed, setConfirmed] = useState(false)
  const confirm = () => {
    setConfirmed(true)
    onConfirm?.()
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
              <DialogDescription className="text-base">Nothing further is charged. Your reserved blowout week is released.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Keep my pass</Button>
              </DialogClose>
              <Button onClick={confirm}>Cancel the pass</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
