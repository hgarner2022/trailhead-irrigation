"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { accessOf, cardToOffer, contactToFill, type KnownProperty } from "@/lib/booking/known-address"
import type { PlaceSuggestion } from "@/lib/places"

// What the booking form knows about the address it was given (docs/plans/2026-11-23-booking-day-time-and-repeat-research.md, section 4): a repeat customer is recognised by the address alone (Hannah, Nov 23
// 2026), so this holds the property found for it, the card on file that may be offered (only to the email on file) and whether the customer chose a different card. On the contact step, once the typed email
// is the one on file, the first and last name fill in (and only they) so they are not retyped. Nothing moves when they fill (a scale on the fields shifted their edges a few pixels, Hannah, Nov 25 2026). Nothing else personal leaves it.

export function useKnownProperty(a: {
  place: PlaceSuggestion | null
  email: string
  known: (place: PlaceSuggestion) => KnownProperty | null
  other?: boolean
  /** the contact step is showing */
  contactStep: boolean
  fields: { firstName: string; lastName: string }
  setField: (field: "firstName" | "lastName", value: string) => void
}) {
  const { place, email, known } = a
  const property = useMemo(() => (place ? known(place) : null), [place, known])
  const [otherCard, setOtherCard] = useState(a.other ?? false)
  const prefilled = useRef<string | null>(null)
  const filledFor = useRef<string | null>(null)
  const contact = contactToFill(property, email)
  // The name fills in once, the first time the typed email is the one on file; what the customer then types over stays theirs.
  useEffect(() => {
    if (!a.contactStep || !contact || filledFor.current === email.trim().toLowerCase()) return
    filledFor.current = email.trim().toLowerCase()
    if (!a.fields.firstName) a.setField("firstName", contact.firstName)
    if (!a.fields.lastName) a.setField("lastName", contact.lastName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.contactStep, contact, email])
  return {
    property,
    /** the card on file, only when the email typed is the one on file for the property's customer */
    offered: cardToOffer(property, email),
    otherCard,
    setOtherCard,
    /** the yard's non-sensitive facts of a property on file, once per property: the zone count, the controller and the access answer */
    prefillOnce: (apply: (p: KnownProperty, access: "yes" | "no") => void) => {
      if (!property || prefilled.current === property.key) return
      prefilled.current = property.key
      apply(property, accessOf(property))
    },
  }
}
