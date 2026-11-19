"use client"

import Link from "next/link"
import { ChevronDown, CircleHelp, LogOut, UserRound, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// The admin's account menu, at the far right of the top bar beside Search (docs/plans/2026-11-19-navigation-design.md, Hannah's answer 1): the person's
// name, then Profile, Help, Open as customer (only for a staff member whose email is also a customer's) and Sign out. A row with no address is not
// drawn. On a phone only the initials show. Sign out lives here and nowhere else in the admin. Pure props; `onSignOut` is the layout's server action.

export interface AdminAccountMenuProps {
  user: { initials: string; name: string }
  profileHref?: string
  helpHref?: string
  /** set only when the signed-in email is also a customer's */
  customerHref?: string
  onSignOut?: () => void | Promise<void>
  /** initials only, for a phone */
  compact?: boolean
  className?: string
}

const ITEM = "min-h-11 cursor-pointer text-base"

export function AdminAccountMenu({ user, profileHref, helpHref, customerHref, onSignOut, compact = false, className }: AdminAccountMenuProps) {
  return (
    <div data-slot="admin-account-menu" className={cn("shrink-0", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger aria-label={`Account, ${user.name}`} className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-navy outline-hidden hover:bg-stone focus-visible:ring-2 focus-visible:ring-primary/50">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
            {user.initials}
          </span>
          {!compact && <span className="font-display text-lg leading-none">{user.name}</span>}
          <ChevronDown aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel className="font-display text-lg text-navy">{user.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {profileHref && (
            <DropdownMenuItem asChild className={ITEM}>
              <Link href={profileHref}>
                <UserRound aria-hidden />
                Profile
              </Link>
            </DropdownMenuItem>
          )}
          {helpHref && (
            <DropdownMenuItem asChild className={ITEM}>
              <Link href={helpHref}>
                <CircleHelp aria-hidden />
                Help
              </Link>
            </DropdownMenuItem>
          )}
          {customerHref && (
            <DropdownMenuItem asChild className={ITEM}>
              <Link href={customerHref}>
                <UsersRound aria-hidden />
                Open as customer
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <form action={onSignOut}>
            {/* keep the menu mounted until the sign-out redirect, as the customer's menu does */}
            <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
              <button type="submit" className={cn(ITEM, "w-full")}>
                <LogOut aria-hidden />
                Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
