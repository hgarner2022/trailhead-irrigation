"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { AddressSearch } from "@/components/blocks/AddressSearch"
import { SERVICE_AREA_SENTENCE, isTypedPlace, needsDetails, type PlaceProvider, type PlaceSuggestion } from "@/lib/places"
import { fixturePlaces } from "@/lib/places/fixture"
import { googlePlaceDetails } from "@/lib/places/google"
import { ACCESS_PROBLEM, addressProblem, type CheckoutFields } from "./checkout-state"
import { TypedAddress } from "./checkout-address-typed"
import { Helper } from "./checkout-steps"

// The first question: one box that finds the address as the customer types
// (Hannah, 2026-11-12: a normal address with type-ahead, no town to pick;
// the town comes from the address). An address outside the six towns gets
// the out-of-area line and Continue stays off. The provider is injected: the
// fixture in stories and tests, Google Places behind /api/places on the live
// site. A Google suggestion has no zip until its details answer, so a pick
// is dispatched at once (the check mark) and again with the whole address.
// Under the box, always, "Can't find it? Type your address" swaps the box for
// three fields (checkout-address-typed.tsx); a query of five characters that
// finds nothing opens them on its own, which is how the checkout works with
// no key at all. Under that, the access question (the scheduling flow,
// 2026-11-12): most visits need nobody home, only the controller and the
// shut-off; a customer who must be there picks their own day later.

export interface AddressStepProps {
  state: CheckoutFields
  attempted: boolean
  onType: (text: string) => void
  onPick: (place: PlaceSuggestion) => void
  set: <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => void
  places?: PlaceProvider
  /** the whole address behind a suggestion without a zip; the live route by default */
  details?: (id: string) => Promise<PlaceSuggestion | null>
  /** the access question under the address; the booking form asks it on its details step instead, so it passes false */
  showAccess?: boolean
}

const ACCESS_PROBLEM_ID = "checkout-access-problem"
const LINK = "cursor-pointer font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"
export const TYPE_INSTEAD = "Can't find it? Type your address"
export const FIND_INSTEAD = "Find it instead"

const ACCESS = [
  { value: "yes", name: "Yes", detail: "The controller and shut-off are reachable" },
  { value: "no", name: "No, I need to be there", detail: "We'll offer you days to pick from" },
] as const

export function AddressStep({ state, attempted, onType, onPick, set, places = fixturePlaces, details = googlePlaceDetails, showAccess = true }: AddressStepProps) {
  // Opens on the typed fields when the step comes back to a typed address; `opened` says the customer opened them here, so they take focus.
  const [typed, setTyped] = useState<{ open: boolean; line1: string; opened: boolean }>(() => ({ open: !!state.place && isTypedPlace(state.place.id), line1: "", opened: false }))
  const latestPick = useRef<string | null>(null)
  const picked = state.place !== null
  const accessMissing = attempted && picked && state.access === null

  const type = (text: string) => {
    latestPick.current = null
    onType(text)
  }
  // The pick lands at once; a suggestion without a zip is completed in the background, unless the customer has moved on.
  const pick = (place: PlaceSuggestion) => {
    latestPick.current = place.id
    onPick(place)
    if (!needsDetails(place)) return
    void details(place.id).then((full) => {
      if (full && latestPick.current === place.id) onPick(full)
    })
  }
  const openTyped = (line1: string) => setTyped({ open: true, line1, opened: true })
  const openFind = () => {
    type("")
    setTyped({ open: false, line1: "", opened: false })
  }

  return (
    <>
      {typed.open ? (
        <TypedAddress place={state.place} initialLine1={typed.line1} attempted={attempted} focusOnOpen={typed.opened} onType={type} onPick={pick} />
      ) : (
        <AddressSearch
          name="address"
          autoFocus
          value={state.address}
          picked={state.place}
          provider={places}
          onChange={type}
          onPick={pick}
          onNoMatch={openTyped}
          problem={addressProblem(state, attempted)}
        />
      )}
      <p data-slot="address-mode" className="mt-3 text-sm text-muted-foreground">
        {typed.open ? (
          <button type="button" onClick={openFind} className={LINK}>
            {FIND_INSTEAD}
          </button>
        ) : (
          <button type="button" onClick={() => openTyped(state.place ? state.place.line1 : state.address)} className={LINK}>
            {TYPE_INSTEAD}
          </button>
        )}
      </p>
      <Helper>
        {SERVICE_AREA_SENTENCE}
        {!typed.open && " Pick your address from the list so we have it right."}
      </Helper>
      {picked && showAccess && (
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
