"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TimingChoice } from "@/components/blocks/TimingChoice"
import type { TimingPreference } from "@/lib/admin/types"
import { preferencePhrase } from "@/lib/admin/format"

// The Change link on a turn-on or blowout row and the dialog it opens: the
// same three choices as the checkout, the current one pressed, Save, then
// the answer in the same dialog so the customer sees it took. Open until the
// day is set (Hannah, 2026-11-12: "they probably need to change their
// preferences"). `onSave` is where the wiring phase writes the pass; the
// prototype only swaps the words. Client because of the chosen state.

export interface ChangePreferenceDialogProps {
  kind: "turn-on" | "blowout"
  value: TimingPreference
  onSave?: (kind: "turn-on" | "blowout", preference: TimingPreference) => void
}

const NAMES = { "turn-on": "spring turn-on", blowout: "fall blowout" } as const
const QUESTIONS = { "turn-on": "When should we turn your system on?", blowout: "When should we blow out your system?" } as const

export function ChangePreferenceDialog({ kind, value, onSave }: ChangePreferenceDialogProps) {
  const [chosen, setChosen] = useState<TimingPreference>(value)
  const [saved, setSaved] = useState(false)
  const save = () => {
    setSaved(true)
    onSave?.(kind, chosen)
  }
  const reset = (open: boolean) => {
    if (!open) setSaved(false)
  }
  return (
    <Dialog onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="link" aria-label={`Change when we do your ${NAMES[kind]}`} className="h-auto px-0 py-1 text-primary-dark">
          Change
        </Button>
      </DialogTrigger>
      <DialogContent data-slot="change-preference-dialog" data-saved={saved} className="sm:max-w-2xl">
        {saved ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">{`Your ${NAMES[kind]} is now preferred ${preferencePhrase(kind, chosen)}.`}</DialogTitle>
              <DialogDescription className="text-base">We&apos;ll set the day inside it and email you the date.</DialogDescription>
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
              <DialogTitle className="font-display text-2xl text-navy">{QUESTIONS[kind]}</DialogTitle>
              <DialogDescription className="text-base">You can change this until we set the day.</DialogDescription>
            </DialogHeader>
            <TimingChoice kind={kind} label={QUESTIONS[kind]} value={chosen} onChange={setChosen} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Keep it</Button>
              </DialogClose>
              <Button onClick={save} disabled={chosen === value}>
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
