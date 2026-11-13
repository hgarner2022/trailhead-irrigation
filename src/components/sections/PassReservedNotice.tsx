"use client"

import { useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}
const reserved = () => new URLSearchParams(window.location.search).get("done") === "1"

// Shown when the Season Pass checkout sends a customer here after Done (`/season-pass?done=1`). Read on the client so the page
// stays static; the server snapshot is false, the sanctioned way to let server and client differ without a hydration mismatch.
export function PassReservedNotice() {
  const show = useSyncExternalStore(noopSubscribe, reserved, () => false)
  if (!show) return null
  return (
    <p role="status" data-slot="pass-reserved-notice" className="bg-navy py-3 text-center text-sm font-semibold text-white container-padding-x">
      Your season is reserved. Your pass and a link to your pass page are in your email.
    </p>
  )
}
