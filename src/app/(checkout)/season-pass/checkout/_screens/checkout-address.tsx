"use client"

import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { AddressSearch } from "@/components/blocks/AddressSearch"
import { SERVICE_AREA_SENTENCE, type PlaceProvider, type PlaceSuggestion } from "@/lib/places"
import { fixturePlaces } from "@/lib/places/fixture"
import { ACCESS_PROBLEM, addressProblem, type CheckoutFields } from "./checkout-state"
import { Helper } from "./checkout-steps"

// The first question: one box that finds the address as the customer types
// (Hannah, 2026-11-12: a normal address with type-ahead, no town to pick;
// the town comes from the address). An address outside the six towns gets
// the out-of-area line and Continue stays off. The provider is the fixture
// until Google Places is wired (wiring plan, Phase 8). Under the box, the
// access question (the scheduling flow, 2026-11-12): most visits need
// nobody home, only the controller and the shut-off; a customer who must be
// there picks their own day later instead of being placed.

export interface AddressStepProps {
  state: CheckoutFields
  attempted: boolean
  onType: (text: string) => void
  onPick: (place: PlaceSuggestion) => void
  set: <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => void
  places?: PlaceProvider
}

const ACCESS_PROBLEM_ID = "checkout-access-problem"

const ACCESS = [
  { value: "yes", name: "Yes", detail: "The controller and shut-off are reachable" },
  { value: "no", name: "No, I need to be there", detail: "We'll offer you days to pick from" },
] as const

export function AddressStep({ state, attempted, onType, onPick, set, places = fixturePlaces }: AddressStepProps) {
  const picked = state.place !== null
  const accessMissing = attempted && picked && state.access === null
  return (
    <>
      <AddressSearch name="address" autoFocus value={state.address} picked={state.place} provider={places} onChange={onType} onPick={onPick} problem={addressProblem(state, attempted)} />
      <Helper>{SERVICE_AREA_SENTENCE} Pick your address from the list so we have it right.</Helper>
      {picked && (
        <div data-slot="checkout-access" className="mt-8">
          <p id="access-question" className="font-display text-2xl leading-tight text-navy">Can we reach the controller and the water shut-off without you?</p>
          <div role="group" aria-labelledby="access-question" aria-describedby={accessMissing ? ACCESS_PROBLEM_ID : undefined} className="mt-4 grid gap-3 sm:grid-cols-2">
            {ACCESS.map((choice, i) => {
              const pressed = state.access === choice.value
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={pressed}
                  data-slot="access-choice"
                  data-invalid={(accessMissing && i === 0) || undefined}
                  onClick={() => set("access", choice.value)}
                  className={cn(
                    "flex min-h-20 cursor-pointer flex-col items-start justify-center rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                    pressed ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40",
                  )}
                >
                  <span className="font-display text-2xl leading-none">{choice.name}</span>
                  <span className={cn("mt-1.5 text-sm", pressed ? "text-white/80" : "text-muted-foreground")}>{choice.detail}</span>
                </button>
              )
            })}
          </div>
          {state.access === "yes" && (
            <Textarea
              name="accessNote"
              aria-label="How we get in"
              placeholder="Gate code, the dog, where the controller is"
              value={state.accessNote}
              onChange={(event) => set("accessNote", event.target.value)}
              rows={2}
              className="mt-3 rounded-lg bg-background text-base shadow-sm"
            />
          )}
          {accessMissing && (
            <p id={ACCESS_PROBLEM_ID} className="mt-3 text-sm text-destructive">
              {ACCESS_PROBLEM}
            </p>
          )}
        </div>
      )}
    </>
  )
}
