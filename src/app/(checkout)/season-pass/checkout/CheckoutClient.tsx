"use client"

import { googlePlaces } from "@/lib/places/google"
import { CheckoutFlow, type CheckoutFlowProps } from "./_screens/CheckoutFlow"
import { clearCheckout } from "./_screens/checkout-storage"

/** Where Done sends the customer: the Season Pass page, which says the season is reserved. */
export const DONE_HREF = "/season-pass?done=1"

/**
 * The page's client edge: a server component cannot hand the flow a function, so Done and the address provider live here.
 * The address box asks /api/places (Google Places when GOOGLE_PLACES_KEY is set; nothing, and so the typed fields, when it is
 * not), never the fixture. Done drops the tab's saved checkout (the flow clears it on Done too; this is the belt for a stale
 * tab) and leaves for the marketing site, a different root layout, so the navigation is a full one.
 */
export function CheckoutClient(props: Omit<CheckoutFlowProps, "onDone">) {
  return (
    <CheckoutFlow
      places={googlePlaces}
      {...props}
      onDone={() => {
        clearCheckout()
        window.location.assign(DONE_HREF)
      }}
    />
  )
}
