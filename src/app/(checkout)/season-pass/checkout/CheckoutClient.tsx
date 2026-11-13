"use client"

import { CheckoutFlow, type CheckoutFlowProps } from "./_screens/CheckoutFlow"
import { clearCheckout } from "./_screens/checkout-storage"

/** Where Done sends the customer: the Season Pass page, which says the season is reserved. */
export const DONE_HREF = "/season-pass?done=1"

/**
 * The page's client edge: a server component cannot hand the flow a function, so Done lives here. It drops the tab's saved checkout
 * (the flow clears it on Done too; this is the belt for a stale tab) and leaves for the marketing site, a different root layout,
 * so the navigation is a full one.
 */
export function CheckoutClient(props: Omit<CheckoutFlowProps, "onDone">) {
  return (
    <CheckoutFlow
      {...props}
      onDone={() => {
        clearCheckout()
        window.location.assign(DONE_HREF)
      }}
    />
  )
}
