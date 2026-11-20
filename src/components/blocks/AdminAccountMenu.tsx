"use client"

import Link from "next/link"
import { ChevronDown, CircleHelp, LogOut, UserRound, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// The admin's account menu (docs/plans/2026-11-19-navigation-design.md): the person's name, then Profile, Help, Open as customer (only for a staff
// member whose email is also a customer's) and Sign out. A row with no address is not drawn. Sign out lives here and nowhere else in the admin.
// Two placements: "bar" (the phone's top bar, initials only with `compact`) and "rail" (the laptop: the footer of the navy rail, bottom left, avatar and
// first name, the avatar alone when the rail collapses to icons, the menu opening upward; Hannah, Nov 20 2026). Pure props; `onSignOut` is the layout's
// server action.

export interface AdminAccountMenuProps {
  user: { initials: string; name: string }
  profileHref?: string
  helpHref?: string
  /** set only when the signed-in email is also a customer's */
  customerHref?: string
  onSignOut?: () => void | Promise<void>
  /** "bar" in the top bar (default); "rail" as the navy rail's footer, on the sidebar tokens, opening upward */
  placement?: "bar" | "rail"
  /** initials only, for a phone */
  compact?: boolean
  className?: string
}

const ITEM = "min-h-11 cursor-pointer text-base"

export function AdminAccountMenu({ user, profileHref, helpHref, customerHref, onSignOut, placement = "bar", compact = false, className }: AdminAccountMenuProps) {
  const rail = placement === "rail"
  return (
    <div data-slot="admin-account-menu" data-placement={placement} className={cn(rail ? "min-w-0" : "shrink-0", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={`Account, ${user.name}`}
          className={cn(
            "flex min-h-11 items-center gap-2 rounded-lg px-1.5 outline-hidden focus-visible:ring-2",
            rail
              ? "w-full text-white ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              : "text-navy hover:bg-stone focus-visible:ring-primary/50",
          )}
        >
          <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white", rail ? "bg-sidebar-primary" : "bg-navy")}>
            {user.initials}
          </span>
          {!compact && <span className={cn("font-display text-lg leading-none", rail && "min-w-0 flex-1 truncate text-left group-data-[collapsible=icon]:hidden")}>{user.name}</span>}
          <ChevronDown aria-hidden className={cn("size-4", rail && "shrink-0 rotate-180 group-data-[collapsible=icon]:hidden")} />
        </DropdownMenuTrigger>
        <DropdownMenuContent side={rail ? "top" : "bottom"} align={rail ? "start" : "end"} className="min-w-52">
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
