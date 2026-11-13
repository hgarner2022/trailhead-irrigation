"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Pass, PassVisit, TimingPreference } from "@/lib/admin/types"
import { preferenceOf, writtenDate } from "@/lib/admin/format"
import { cn } from "@/lib/utils"
import { PreferenceDialog } from "./PreferenceDialog"

// The things that can be done to a live pass, the same for the customer on
// the pass page and for Hannah in the Passes panel (the review's rule:
// whatever the customer can do, the admin can do for them): add the July
// inspection when the pass has none, change a timing preference while the
// visit has no day, and skip one visit without cancelling. Each is a small
// dialog that says the consequence first and then the answer. The prototype
// only calls the handlers; the wiring plan's passes.addInspection,
// passes.updatePreference and passes.skipVisit do the work.

export interface PassActionsProps {
  pass: Pass
  onAddInspection?: (passId: string) => void
  onChangePreference?: (kind: "turn-on" | "blowout", preference: TimingPreference) => void
  onSkip?: (passId: string, kind: PassVisit["kind"]) => void
  /** which actions to show; all by default */
  include?: ("inspection" | "preference" | "skip")[]
  /** the customer's words ("my", "you") or the admin's ("the", "the customer") */
  voice?: "customer" | "admin"
  className?: string
}

const NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Spring turn-on", inspection: "Mid-season inspection", blowout: "Fall blowout" }

export const hasInspection = (pass: Pass) => pass.visits.some((v) => v.kind === "inspection")
export const canSkip = (visit: PassVisit) => !visit.completedAt
export const canChange = (visit: PassVisit): visit is PassVisit & { kind: "turn-on" | "blowout" } => visit.kind !== "inspection" && !visit.scheduledAt && !visit.completedAt

function AddInspectionDialog({ pass, voice, onAdd }: { pass: Pass; voice: "customer" | "admin"; onAdd?: (passId: string) => void }) {
  const [done, setDone] = useState(false)
  const add = () => {
    setDone(true)
    onAdd?.(pass.id)
  }
  const who = voice === "customer" ? "your" : "the"
  return (
    <Dialog onOpenChange={(open) => !open && setDone(false)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add July inspection
        </Button>
      </DialogTrigger>
      <DialogContent data-slot="add-inspection-dialog" data-done={done}>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">The July inspection is on {who} pass.</DialogTitle>
              <DialogDescription className="text-base">It is billed after the visit like the others, and the day comes by email.</DialogDescription>
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
              <DialogTitle className="font-display text-2xl text-navy">Add the mid-season inspection?</DialogTitle>
              <DialogDescription className="text-base">In July we run every zone, look for coverage gaps, clogged nozzles and zones running long, and adjust what we find. Billed after the visit at the per-zone rate.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Not now</Button>
              </DialogClose>
              <Button onClick={add}>Add it</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SkipVisitDialog({ pass, voice, onSkip }: { pass: Pass; voice: "customer" | "admin"; onSkip?: (passId: string, kind: PassVisit["kind"]) => void }) {
  const choices = pass.visits.filter(canSkip)
  const [chosen, setChosen] = useState<PassVisit["kind"] | null>(null)
  const [done, setDone] = useState<PassVisit["kind"] | null>(null)
  const skip = () => {
    if (!chosen) return
    setDone(chosen)
    onSkip?.(pass.id, chosen)
  }
  const reset = (open: boolean) => {
    if (!open) {
      setChosen(null)
      setDone(null)
    }
  }
  const your = voice === "customer" ? "your" : "the"
  return (
    <Dialog onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={choices.length === 0}>
          Skip a visit
        </Button>
      </DialogTrigger>
      <DialogContent data-slot="skip-visit-dialog" data-done={done ?? undefined}>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">{`${NAMES[done]} skipped.`}</DialogTitle>
              <DialogDescription className="text-base">{`Nothing is charged for it and ${your} other visits stay as they are.`}</DialogDescription>
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
              <DialogTitle className="font-display text-2xl text-navy">Skip which visit?</DialogTitle>
              <DialogDescription className="text-base">{`The skipped visit comes off the schedule and is not charged. ${voice === "customer" ? "Your" : "The"} pass stays.`}</DialogDescription>
            </DialogHeader>
            <div role="radiogroup" aria-label="Visit to skip" className="grid gap-2">
              {choices.map((visit) => {
                const pressed = chosen === visit.kind
                return (
                  <button
                    key={visit.kind}
                    type="button"
                    role="radio"
                    aria-checked={pressed}
                    onClick={() => setChosen(visit.kind)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      pressed ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40",
                    )}
                  >
                    <span className="font-medium">{NAMES[visit.kind]}</span>
                    <span className={cn("text-sm", pressed ? "text-white/80" : "text-muted-foreground")}>{visit.scheduledAt ? writtenDate(visit.scheduledAt) : visit.window}</span>
                  </button>
                )
              })}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Keep them all</Button>
              </DialogClose>
              <Button onClick={skip} disabled={!chosen}>
                Skip it
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function PassActions({ pass, onAddInspection, onChangePreference, onSkip, include = ["inspection", "preference", "skip"], voice = "customer", className }: PassActionsProps) {
  if (pass.status !== "active") return null
  const changeable = pass.visits.filter(canChange)
  return (
    <div data-slot="pass-actions" className={cn("flex flex-wrap gap-2", className)}>
      {include.includes("inspection") && !hasInspection(pass) && <AddInspectionDialog pass={pass} voice={voice} onAdd={onAddInspection} />}
      {include.includes("preference") &&
        changeable.map((visit) => {
          const value = preferenceOf(pass, visit.kind)
          return value ? <PreferenceDialog key={visit.kind} kind={visit.kind} value={value} onSave={onChangePreference} asButton label={`Change ${visit.kind === "turn-on" ? "turn-on" : "blowout"}`} /> : null
        })}
      {include.includes("skip") && <SkipVisitDialog pass={pass} voice={voice} onSkip={onSkip} />}
    </div>
  )
}
