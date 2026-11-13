import type { Principal } from "./types"

export type Gate = { action: "next" } | { action: "redirect"; to: string }

/** Pages that must stay open to someone who is not signed in yet. `/account/pass/card-updated` is where Stripe returns a customer after the card update, with no session. */
const SIGN_IN_PAGES = ["/admin/sign-in", "/account/sign-in", "/account/pass/card-updated"]

const isSignIn = (pathname: string) => SIGN_IN_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
const under = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`)

/**
 * The proxy's rule, pure: `/admin/*` needs an admin (the sign-in pages pass),
 * `/account/*` needs any signed-in person, everything else passes. An
 * API-key principal is never a person, so it opens neither.
 */
export function gateFor(pathname: string, principal: Principal | null | undefined): Gate {
  if (isSignIn(pathname)) return { action: "next" }
  const person = principal?.kind === "person" ? principal : null
  if (under(pathname, "/admin")) {
    return person?.type === "admin" ? { action: "next" } : { action: "redirect", to: "/admin/sign-in" }
  }
  if (under(pathname, "/account")) {
    return person ? { action: "next" } : { action: "redirect", to: "/account/sign-in" }
  }
  return { action: "next" }
}
