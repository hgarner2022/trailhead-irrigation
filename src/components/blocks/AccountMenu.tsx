"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// The account menu at the far right of the account header (docs/plans/2026-11-18-customer-portal-v2-design.md, section 3): the customer's first name, no "Hi,", and under it
// Details, "Open the admin" for staff, and Sign out. Pure props; `onSignOut` is the server action the Sign out form submits.

export interface AccountMenuProps {
  firstName: string
  /** the signed-in person also works here: the menu links to /admin */
  isStaff?: boolean
  onSignOut?: () => void | Promise<void>
  className?: string
}

export function AccountMenu({ firstName, isStaff = false, onSignOut, className }: AccountMenuProps) {
  return (
    <div data-slot="account-menu" className={cn(className)}>
      {/* not modal: the trigger stays reachable while the menu is open, and axe does not flag the page behind it as aria-hidden with a focusable trigger */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-2 font-display text-xl leading-none text-navy hover:bg-stone">
          {firstName}
          <ChevronDown aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/account/details" className="cursor-pointer text-base">
              Details
            </Link>
          </DropdownMenuItem>
          {isStaff && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer text-base">
                Open the admin
              </Link>
            </DropdownMenuItem>
          )}
          <form action={onSignOut}>
            {/* keep the menu mounted until the sign-out redirect: closing on select could unmount the form before it submits */}
            <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
              <button type="submit" className="w-full cursor-pointer text-base">
                Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
