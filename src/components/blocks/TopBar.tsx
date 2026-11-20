"use client"

import type { ReactNode, Ref } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

// The admin's top bar (docs/plans/2026-11-19-navigation-design.md): 56px, sticky, cream. On a laptop, left to right: the rail toggle, the page title and
// its context, the page's actions, Search (the account menu is the rail's footer on a laptop, not here). On a phone: the logo, the switcher, the page's one primary ("+ New job", which stays in
// the bar on every screen that has it), Search as an icon, the account's initials. The title and action slots are refs so `PageHeader` can portal
// into them; the controls are passed in, so the bar is pure layout.

export interface TopBarProps {
  phone?: boolean
  /** laptop only: the rail toggle */
  leading?: ReactNode
  titleRef?: Ref<HTMLDivElement>
  actionsRef?: Ref<HTMLDivElement>
  /** phone only: where the page's one primary lands */
  primaryRef?: Ref<HTMLDivElement>
  switcher?: ReactNode
  search?: ReactNode
  /** the shell passes it on a phone only (the initials); on a laptop the account menu is the rail's footer */
  account?: ReactNode
  logo?: string
}

const LOGO = "/images/logo-badge.png"

export function TopBar({ phone = false, leading, titleRef, actionsRef, primaryRef, switcher, search, account, logo = LOGO }: TopBarProps) {
  return (
    <div data-slot="admin-bar" className={cn("sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-cream px-4 md:px-6")}>
      {phone ? (
        <>
          <Image src={logo} alt="Trailhead" width={51} height={36} className="h-9 w-auto shrink-0" />
          {switcher !== undefined && <div data-slot="admin-switcher">{switcher}</div>}
          <div ref={primaryRef} data-slot="admin-bar-primary" className="ml-auto flex shrink-0 items-center" />
        </>
      ) : (
        <>
          {leading}
          <div ref={titleRef} data-slot="admin-bar-title" className="flex min-w-0 flex-1 items-baseline gap-3" />
          <div ref={actionsRef} data-slot="admin-bar-actions" className="flex shrink-0 items-center gap-2" />
        </>
      )}
      <div data-slot="admin-bar-utilities" className="flex shrink-0 items-center gap-1">
        {search}
        {account}
      </div>
    </div>
  )
}
