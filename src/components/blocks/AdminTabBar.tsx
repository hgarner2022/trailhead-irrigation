"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { AdminSection } from "./AdminShell"
import { TAB_ITEMS } from "./admin-nav"
import { MoreMenu } from "./MoreMenu"

// The phone's bottom bar (docs/plans/2026-11-18-admin-holistic-design.md, section 4): Home, Schedule, Jobs, Customers and More, five tabs with their
// labels at 375px. More is a bordered, labelled button (`MoreMenu`) opening Reports and Settings; Sign out is in the account menu. The bar pads
// for `env(safe-area-inset-bottom)`, which the admin root layout enables with `viewport.viewportFit = "cover"`.

export interface AdminTabBarProps {
  current: AdminSection
  /** a screen that has Requests: More holds it, with the count on the button */
  requests?: { count: number }
  /** a screen that has Quotes: More holds it too, with the count on its own row */
  quotes?: { count: number }
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

export function AdminTabBar({ current, requests, quotes }: AdminTabBarProps) {
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
          <MoreMenu current={current} requests={requests} quotes={quotes} />
        </li>
      </ul>
    </nav>
  )
}
