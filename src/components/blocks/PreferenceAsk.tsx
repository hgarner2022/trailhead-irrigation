"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { TimingPreference } from "@/lib/admin/types"
import { TIMING_NEXT, TIMING_NAME, timingLine, timingQuestion, type TimingKind } from "@/lib/portal/preference-words"
import { PreferencePicker } from "./PreferencePicker"

// Two pieces of one thing, the customer's timing for a visit we schedule for them (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)"; Hannah, Nov 22 2026:
// "I would like them to opt in anytime we need their preferences").
//
// `TimingDialog` is the choice itself in a dialog: the question, the three choices (the current one pressed), Save, then the answer in the same dialog so whoever pressed it sees it took.
// `PreferenceAsk` is the quiet banner shown on Home and on the Season Pass tab while we are asking for a visit (the same moment the "Preference request" text and email go out): one line, the
// sentence that says what happens next, and one outline button that opens the dialog. When there is nothing to ask the banner is not on the page. `onSave` is where the wiring writes the
// customer's preference for that kind; the prototype only swaps the words. Client because of the chosen state.

export interface TimingDialogProps {
  kind: TimingKind
  value: TimingPreference
  onSave?: (kind: TimingKind, preference: TimingPreference) => void | Promise<unknown>
  /** the trigger's visible text */
  label?: string
  /** the trigger as an outline button (the banner) instead of a link (a row) */
  asButton?: boolean
}

export function TimingDialog({ kind, value, onSave, label = "Change", asButton = false }: TimingDialogProps) {
  const [chosen, setChosen] = useState<TimingPreference>(value)
  const [saved, setSaved] = useState(false)
  const save = () => {
    setSaved(true)
    void onSave?.(kind, chosen)
  }
  return (
    <Dialog onOpenChange={(open) => !open && setSaved(false)}>
      <DialogTrigger asChild>
        <Button variant={asButton ? "outline" : "link"} aria-label={`${label}: your ${TIMING_NAME[kind]}`} className={asButton ? undefined : "h-auto min-h-11 px-0 py-1 text-primary-dark"}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent data-slot="timing-dialog" data-saved={saved} className="sm:max-w-2xl">
        {saved ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">{`Saved: ${timingLine(kind, chosen)}.`}</DialogTitle>
              <DialogDescription className="text-base">{TIMING_NEXT}</DialogDescription>
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
              <DialogTitle className="font-display text-2xl text-navy">{timingQuestion(kind)}</DialogTitle>
              <DialogDescription className="text-base">{TIMING_NEXT}</DialogDescription>
            </DialogHeader>
            <PreferencePicker kind={kind} value={chosen} onChange={setChosen} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export interface PreferenceAskProps {
  kind: TimingKind
  /** the choice on file (our recommended until the customer says otherwise) */
  value: TimingPreference
  onSave?: TimingDialogProps["onSave"]
  className?: string
}

export function PreferenceAsk({ kind, value, onSave, className }: PreferenceAskProps) {
  return (
    <section data-slot="preference-ask" data-kind={kind} aria-label="Timing for your next visit" className={`rounded-lg border border-primary-dark/30 bg-primary/5 p-4 ${className ?? ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-base font-semibold text-foreground">{timingQuestion(kind)}</p>
          <p className="text-base text-muted-foreground">{TIMING_NEXT}</p>
        </div>
        <TimingDialog kind={kind} value={value} onSave={onSave} label="Choose when" asButton />
      </div>
    </section>
  )
}
