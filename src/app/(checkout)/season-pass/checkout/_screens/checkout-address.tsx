"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { AddressSearch } from "@/components/blocks/AddressSearch"
import { SERVICE_ZIPS, isTypedPlace, needsDetails, serviceability, type PlaceProvider, type PlaceSuggestion } from "@/lib/places"
import { fixturePlaces } from "@/lib/places/fixture"
import { googlePlaceDetails } from "@/lib/places/google"
import { ACCESS_PROBLEM, addressProblem, type CheckoutFields } from "./checkout-state"
import { CANT_FIND, TypedAddress, type TypedValues } from "./checkout-address-typed"

// The first question: one box that finds the address as the customer types
// (Hannah, 2026-11-12: a normal address with type-ahead, no city to pick;
// the city comes from the address). An address outside the six cities gets
// the out-of-area line and Continue stays off. The provider is injected: the
// fixture in stories and tests, Google Places behind /api/places on the live
// site. A Google suggestion has no zip until its details answer, so a pick
// is dispatched at once (the check mark) and again with the whole address.
// The box IS the type-ahead (Hannah, Nov 22 2026): there is no "Type it instead"
// link. Only when a query of five characters finds nothing does the box give way to
// "We can't find it. Enter it here." with three fields, street, city and a required
// ZIP (checkout-address-typed.tsx), which is how the checkout works with no key at
// all. The ZIP decides whether we serve the yard (`serviceability`). Nothing else
// shows until it is needed (Hannah, Nov 21 2026): the six cities are listed only
// under an address outside them, and there is no way back to the box, because the
// typed fields are a whole address. Under that, the access question (the scheduling flow,
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
  /** told when the typed fields open or close, so a screen can name a missing city in its summary */
  onTypedChange?: (open: boolean) => void
  /** told whenever a typed field changes */
  onTypedValues?: (values: TypedValues) => void
}

const ACCESS_PROBLEM_ID = "checkout-access-problem"

const ACCESS = [
  { value: "yes", name: "Yes", detail: "The controller and shut-off are reachable" },
  { value: "no", name: "No, I need to be there", detail: "We'll offer you days to pick from" },
] as const

export function AddressStep({ state, attempted, onType, onPick, set, places = fixturePlaces, details = googlePlaceDetails, showAccess = true, onTypedChange, onTypedValues }: AddressStepProps) {
  // Opens on the typed fields when the step comes back to a typed address; `opened` says the customer opened them here, so they take focus.
  // `asked`: a pick came back with no city we can read, so the fields open with the city already asked for.
  const [typed, setTyped] = useState<{ open: boolean; line1: string; opened: boolean; asked: boolean }>(() => ({ open: !!state.place && isTypedPlace(state.place.id), line1: "", opened: false, asked: false }))
  const latestPick = useRef<string | null>(null)
  const picked = state.place !== null
  const accessMissing = attempted && picked && state.access === null

  useEffect(() => {
    onTypedChange?.(typed.open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed.open])

  const type = (text: string) => {
    latestPick.current = null
    onType(text)
  }
  // The pick lands at once; a suggestion without a zip is completed in the background, unless the customer has moved on.
  const pick = (place: PlaceSuggestion) => {
    latestPick.current = place.id
    onPick(place)
    if (!needsDetails(place)) return askCity(place)
    void details(place.id).then((full) => {
      if (latestPick.current !== place.id) return
      if (full) onPick(full)
      askCity(full ?? place)
    })
  }
  // An address with no city we can read and no zip we serve is not turned away: the typed fields open with the street filled in and ask for the city.
  const askCity = (place: PlaceSuggestion) => {
    if (place.town.trim() !== "" || SERVICE_ZIPS[place.zip]) return
    type(place.line1)
    setTyped({ open: true, line1: place.line1, opened: true, asked: true })
  }
  const openTyped = (line1: string) => setTyped({ open: true, line1, opened: true, asked: false })

  return (
    <>
      {typed.open ? (
        <>
          {!typed.asked && (
            <p data-slot="address-cant-find" role="status" className="mb-4 text-base text-foreground">
              {CANT_FIND}
            </p>
          )}
          <TypedAddress place={state.place} initialLine1={typed.line1} attempted={attempted} cityAsked={typed.asked} focusOnOpen={typed.opened} onType={type} onPick={pick} onValues={onTypedValues} />
        </>
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
      {typed.open && state.place && !serviceability(state.place).ok && (
        <p id="address-outside" role="alert" className="mt-3 text-sm text-destructive">
          {addressProblem(state, false)}
        </p>
      )}
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
