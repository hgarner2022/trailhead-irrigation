"use client"

import { useMemo, useRef, useState } from "react"
import { cardToOffer, type KnownProperty } from "@/lib/booking/known-address"
import type { PlaceSuggestion } from "@/lib/places"

// What the booking form knows about the address it was given (docs/plans/2026-11-23-booking-day-time-and-repeat-research.md, section 4): a repeat customer is recognised by the address alone (Hannah, Nov 23 2026), so
// this holds the property found for it, the card on file that may be offered (only to the email on file) and whether the customer chose a different card. Nothing personal leaves it.

export function useKnownProperty(a: { place: PlaceSuggestion | null; email: string; known: (place: PlaceSuggestion) => KnownProperty | null; other?: boolean }) {
  const { place, email, known } = a
  const property = useMemo(() => (place ? known(place) : null), [place, known])
  const [otherCard, setOtherCard] = useState(a.other ?? false)
  const prefilled = useRef<string | null>(null)
  return {
    property,
    /** the card on file, only when the email typed is the one on file for the property's customer */
    offered: cardToOffer(property, email),
    otherCard,
    setOtherCard,
    /** the yard's non-sensitive facts of a property on file, once per property: the zone count and the controller */
    prefillOnce: (apply: (p: KnownProperty) => void) => {
      if (!property || prefilled.current === property.key) return
      prefilled.current = property.key
      apply(property)
    },
  }
}
