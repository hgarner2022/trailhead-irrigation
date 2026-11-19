"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AccountMenu } from "./AccountMenu"

// The customer's account header (docs/plans/2026-11-19-customer-side-polish-research.md, section 1b): the logo, the four tabs, Home · Visits · Season Pass (for everyone: a customer
// with no pass lands on the sell card) · Details, and the account menu (the first name; Sign out, and Open the admin for staff) pinned to the far right at every width. Details lives only
// as a tab, the menu repeats no tab. The current tab is navy with an orange underline on the header's rule. On a laptop the tabs sit beside the logo; on a phone they are a row under it. The current place is marked with aria-current; `current` overrides the route, which is how the story and the
// tests pin it. A signed-out visitor sees a quiet Sign in link in the same place, so the header never changes shape.

export interface AccountNavProps {
  /** the customer's first name; left out for a visitor who is not signed in */
  firstName?: string
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
  { href: "/account/pass", label: "Season Pass" },
  { href: "/account/details", label: "Details" },
]

/** The place a path belongs to: Home only for `/account` itself, the others by their prefix (a visit page is under Visits). */
export const placeOf = (path: string) =>
  PLACES.filter((p) => (p.href === "/account" ? path === p.href : path === p.href || path.startsWith(`${p.href}/`))).sort((a, b) => b.href.length - a.href.length)[0]?.href

export function AccountNav({ firstName, current, isStaff = false, onSignOut, className }: AccountNavProps) {
  const route = usePathname()
  const here = placeOf(current ?? route ?? "")
  return (
    <header data-slot="account-nav" className={cn("border-b border-border bg-background", className)}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-x-8 gap-y-0 container-padding-x pt-2">
        <Link href="/account" className="flex min-h-11 items-center gap-3 self-center pb-2" aria-label="Trailhead Lawn & Irrigation, your account">
          <Image src="/images/logo-badge.png" alt="" width={51} height={36} className="h-9 w-auto" />
        </Link>
        {firstName ? (
          <>
            <nav aria-label="Your account" className="order-last flex w-full justify-between gap-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-start sm:gap-2">
              {PLACES.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  aria-current={here === p.href ? "page" : undefined}
                  className={cn("-mb-px inline-flex min-h-11 items-center justify-center whitespace-nowrap border-b-2 px-2.5 py-2 text-base font-semibold sm:px-4", here === p.href ? "border-primary-dark text-navy" : "border-transparent text-navy-light hover:text-navy")}
                >
                  {p.label}
                </Link>
              ))}
            </nav>
            <AccountMenu firstName={firstName} isStaff={isStaff} onSignOut={onSignOut} className="order-2 ml-auto self-center pb-2 sm:order-none" />
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
