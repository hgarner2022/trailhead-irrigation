"use client"

import Link from "next/link"
import { Ellipsis, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { AdminSection } from "./AdminShell"
import { MORE_ITEMS, TAB_ITEMS } from "./admin-nav"

// The phone's bottom bar (docs/plans/2026-11-18-admin-holistic-design.md, section 4): Home, Schedule, Jobs, Customers and More, five tabs with their
// labels at 375px. More opens a menu above the bar with Reports, Settings and Sign out, and is lit while Reports or Settings is the screen. The bar pads
// for `env(safe-area-inset-bottom)`, which the admin root layout enables with `viewport.viewportFit = "cover"`.

export interface AdminTabBarProps {
  current: AdminSection
  user: { name: string }
  onSignOut?: () => void | Promise<void>
}

const TAB = "flex w-full flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-xs font-medium leading-tight outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"

function Tab({ active, children, icon }: { active: boolean; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <>
      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-sidebar-primary")}>{icon}</span>
      {children}
    </>
  )
}

export function AdminTabBar({ current, user, onSignOut }: AdminTabBarProps) {
  const moreActive = MORE_ITEMS.some((i) => i.id === current)
  const tone = (active: boolean) => (active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/80")
  return (
    <nav aria-label="Main" data-slot="admin-tabbar" className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden">
      <ul className="grid grid-cols-5">
        {TAB_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const active = id === current
          return (
            <li key={id}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn(TAB, tone(active))}>
                <Tab active={active} icon={<Icon className="size-5" aria-hidden />}>
                  {label}
                </Tab>
              </Link>
            </li>
          )
        })}
        <li>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" data-slot="admin-more" aria-current={moreActive ? "page" : undefined} className={cn(TAB, tone(moreActive))}>
                <Tab active={moreActive} icon={<Ellipsis className="size-5" aria-hidden />}>
                  More
                </Tab>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="min-w-44">
              {MORE_ITEMS.map(({ id, label, href, icon: Icon }) => (
                <DropdownMenuItem key={id} asChild className="min-h-11">
                  <Link href={href} aria-current={id === current ? "page" : undefined}>
                    <Icon aria-hidden />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem className="min-h-11" aria-label={`Sign out ${user.name}`} onSelect={() => void onSignOut?.()}>
                <LogOut aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ul>
    </nav>
  )
}
