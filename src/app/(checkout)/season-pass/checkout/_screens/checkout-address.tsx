"use client"

import { AddressSearch } from "@/components/blocks/AddressSearch"
import { SERVICE_AREA_SENTENCE, type PlaceProvider, type PlaceSuggestion } from "@/lib/places"
import { fixturePlaces } from "@/lib/places/fixture"
import { addressProblem, type CheckoutFields } from "./checkout-state"
import { Helper } from "./checkout-steps"

// The first question: one box that finds the address as the customer types
// (Hannah, 2026-11-12: a normal address with type-ahead, no town to pick;
// the town comes from the address). An address outside the six towns gets
// the out-of-area line and Continue stays off. The provider is the fixture
// until Google Places is wired (wiring plan, Phase 8).

export interface AddressStepProps {
  state: CheckoutFields
  attempted: boolean
  onType: (text: string) => void
  onPick: (place: PlaceSuggestion) => void
  places?: PlaceProvider
}

export function AddressStep({ state, attempted, onType, onPick, places = fixturePlaces }: AddressStepProps) {
  return (
    <>
      <AddressSearch autoFocus value={state.address} picked={state.place} provider={places} onChange={onType} onPick={onPick} problem={addressProblem(state, attempted)} />
      <Helper>{SERVICE_AREA_SENTENCE} Pick your address from the list so we have it right.</Helper>
    </>
  )
}
