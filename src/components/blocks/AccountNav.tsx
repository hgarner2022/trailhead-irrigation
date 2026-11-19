"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AccountMenu } from "./AccountMenu"

// The customer's account header (docs/plans/2026-11-18-customer-portal-v2-design.md, section 3): the logo, the four places, Home · Visits · Season Pass (only for someone who
// has held one) · Details, and the account menu (the first name, Details, Open the admin for staff, Sign out) pinned to the far right of the header at every width. On a
// laptop the row sits beside the logo, on a phone under it. The current place is marked with aria-current; `current` overrides the route, which is how the story and the
// tests pin it. A signed-out visitor sees a quiet Sign in link in the same place, so the header never changes shape.

export interface AccountNavProps {
  /** the customer's first name; left out for a visitor who is not signed in */
  firstName?: string
  /** show the Season Pass place: the customer has held a pass */
  hasPass?: boolean
  /** the path to mark as current; defaults to the route */
  current?: string
  /** the signed-in person also works here: the menu offers Open the admin */
  isStaff?: boolean
  /** the server action that signs the customer out: Sign out in the menu submits a form to it */
  onSignOut?: () => void | Promise<void>
  className?: string
}

const PLACES = [
  { href: "/account", label: "Home" },
  { href: "/account/visits", label: "Visits" },
  { href: "/account/pass", label: "Season Pass", needsPass: true },
  { href: "/account/details", label: "Details" },
]

/** The place a path belongs to: Home only for `/account` itself, the others by their prefix (a visit page is under Visits). */
export const placeOf = (path: string) =>
  PLACES.filter((p) => (p.href === "/account" ? path === p.href : path === p.href || path.startsWith(`${p.href}/`))).sort((a, b) => b.href.length - a.href.length)[0]?.href

export function AccountNav({ firstName, hasPass = false, current, isStaff = false, onSignOut, className }: AccountNavProps) {
  const route = usePathname()
  const here = placeOf(current ?? route ?? "")
  return (
    <header data-slot="account-nav" className={cn("border-b border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 container-padding-x py-3">
        <Link href="/account" className="flex min-h-11 items-center gap-3" aria-label="Trailhead Lawn & Irrigation, your account">
          <Image src="/images/logo-badge.png" alt="" width={51} height={36} className="h-9 w-auto" />
        </Link>
        {firstName ? (
          <>
            <nav aria-label="Your account" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto sm:flex-1">
              {PLACES.filter((p) => hasPass || !p.needsPass).map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  aria-current={here === p.href ? "page" : undefined}
                  className={cn("inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 py-2 text-base font-semibold", here === p.href ? "bg-primary/10 text-primary-deep" : "text-navy-light hover:bg-stone")}
                >
                  {p.label}
                </Link>
              ))}
            </nav>
            <AccountMenu firstName={firstName} isStaff={isStaff} onSignOut={onSignOut} className="order-2 ml-auto sm:order-none" />
          </>
        ) : (
          <Link href="/account/sign-in" className="ml-auto inline-flex min-h-11 items-center text-base font-semibold text-navy-light hover:text-navy">
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
