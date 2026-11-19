"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

// The header's quiet account link: "Sign in" in the server HTML (what a guest and a crawler get, so the page stays static), then "Your account" to /account once
// `/api/account/me` says the browser holds a customer session (UX audit row 10). The answer is `{ signedIn }` and nothing more; a failed or slow call leaves "Sign in".
// One call per page load is kept for every link on the page (the desktop and the phone header both mount this).

let asked: Promise<boolean> | null = null
const signedIn = (): Promise<boolean> => {
  asked ??= fetch("/api/account/me", { credentials: "same-origin", cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ signedIn?: boolean }>) : { signedIn: false }))
    .then((b) => b.signedIn === true)
    .catch(() => false)
  return asked
}

/** Forget the answer (tests, and a sign-out that stays on the page). */
export const forgetSignedIn = () => {
  asked = null
}

export function AccountLink({ className }: { className?: string }) {
  const [yes, setYes] = useState(false)
  useEffect(() => {
    let live = true
    void signedIn().then((s) => live && setYes(s))
    return () => {
      live = false
    }
  }, [])
  return yes ? (
    <Link href="/account" className={className}>
      Your account
    </Link>
  ) : (
    <Link href="/account/sign-in" className={className}>
      Sign in
    </Link>
  )
}
