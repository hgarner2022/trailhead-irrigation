"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { openRecordInAddress } from "@/lib/admin/record-url"
import type { SearchHit } from "@/lib/admin/search-hit"
import { AdminBarContext } from "./admin-bar"
import { NAV } from "./admin-nav"
import { sectionOf } from "./admin-section"
import { AdminTabBar } from "./AdminTabBar"
import { useMedia } from "./use-media"
import { CommandSearch } from "./CommandSearch"
import { UndoToastProvider } from "./UndoToast"

// The frame every admin screen sits in (docs/DESIGN.md, Spacing): the navy
// rail on a laptop, collapsed to icons under 1024px, and a bottom tab bar
// instead of the rail under 768px. The screen itself is the children, in one
// cream column of at most 1280px. One tree serves every width: the rail and
// the tab bar come and go with the breakpoint but the inset around the
// children stays mounted, so a resize never resets the screen. The links are
// next/link (plain anchors in the catalog). The switcher slot above
// the items stays empty until a second branch exists. Sign out calls `onSignOut`, a server action in the
// layout, and does nothing in the catalog. The bottom bar (`AdminTabBar`) is Home, Schedule, Jobs, Customers and More, and pads for
// `env(safe-area-inset-bottom)`, which the admin root layout enables with `viewport.viewportFit = "cover"`. Cmd or Ctrl+K and the Search
// button open `CommandSearch` when `onSearch` is given; a hit opens in place on a screen with a record host and on its own page elsewhere.

export type AdminSection = "home" | "schedule" | "jobs" | "customers" | "reports" | "settings"

export interface AdminShellProps {
  current: AdminSection
  user: { initials: string; name: string }
  /** the organization switcher; nothing renders when undefined */
  switcher?: ReactNode
  /** signs the person out; the sign-out button does nothing without it (the catalog) */
  onSignOut?: () => void | Promise<void>
  /** Cmd or Ctrl+K and the Search button: finds customers, jobs and days by name, street, phone or pass number; the search is off without it (the catalog) */
  onSearch?: (query: string) => Promise<SearchHit[]>
  /** whether the rail starts expanded on a laptop; under 1024px it starts collapsed either way */
  defaultOpen?: boolean
  children: ReactNode
}

// 15rem rail (240px); the bar and the content share the 16px phone and 24px laptop gutters.
const RAIL_WIDTH = { "--sidebar-width": "15rem" } as CSSProperties
const GUTTER = "px-4 md:px-6"
// The badge is 813 by 573; the width props keep its shape so next/image never squashes it.
const LOGO = "/images/logo-badge.png"

/** The quiet Search button in the top bar: the same box Cmd or Ctrl+K opens, for anyone without the keys. */
function SearchButton({ onClick, className, iconOnly = false }: { onClick: () => void; className?: string; iconOnly?: boolean }) {
  return (
    <Button type="button" variant="outline" size={iconOnly ? "icon" : "default"} aria-label="Search" onClick={onClick} className={cn("min-h-11 shrink-0 text-muted-foreground", iconOnly && "min-w-11", className)}>
      <Search className="size-4" aria-hidden />
      {!iconOnly && (
        <>
          <span>Search</span>
          <kbd className="ml-1 hidden rounded border border-border px-1 font-sans text-[11px] leading-5 lg:inline">⌘K</kbd>
        </>
      )}
    </Button>
  )
}

function Rail({ current, user, switcher, onSignOut }: Pick<AdminShellProps, "current" | "user" | "switcher" | "onSignOut">) {
  return (
    <Sidebar collapsible="icon" className="motion-reduce:transition-none">
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2 px-1 group-data-[collapsible=icon]:px-0">
          <Image src={LOGO} alt="Trailhead" width={57} height={40} className="h-10 w-auto shrink-0 group-data-[collapsible=icon]:h-7" />
          <span className="truncate font-display text-lg text-sidebar-foreground group-data-[collapsible=icon]:hidden">Trailhead</span>
        </div>
        {switcher !== undefined && (
          <div data-slot="admin-switcher" className="pt-1 group-data-[collapsible=icon]:hidden">
            {switcher}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ id, label, href, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton asChild isActive={id === current} tooltip={label}>
                    <Link href={href} aria-current={id === current ? "page" : undefined}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton type="button" tooltip="Sign out" aria-label={`Sign out ${user.name}`} onClick={() => void onSignOut?.()}>
              <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[10px] font-semibold">
                {user.initials}
              </span>
              <span>Sign out</span>
              <LogOut className="ml-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function AdminShell({ current: initial, user, switcher, onSignOut, onSearch, defaultOpen = true, children }: AdminShellProps) {
  // The rail follows the address, not the server's first render: the layout stays mounted while the reader moves between
  // pages, so a section chosen once on the server would stay lit (Home on every page). Outside the app, in the catalog, `current` is used.
  const pathname = usePathname()
  const current = pathname?.startsWith("/admin") ? sectionOf(pathname) : initial
  const router = useRouter()
  const phone = useMedia("(max-width: 767px)")
  const [searching, setSearching] = useState(false)
  // Cmd or Ctrl+K opens the search from anywhere in the admin.
  useEffect(() => {
    if (!onSearch) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearching(true)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onSearch])
  // A screen that holds records opens the hit in its panel, in place; Reports and Settings have no panel, so they go to the record's own page.
  const openHit = useCallback(
    (hit: SearchHit) => {
      // "See all N" goes to the full list; a record opens in place
      if (hit.seeAll) router.push(hit.href)
      else if (document.querySelector("[data-record-host]")) openRecordInAddress({ key: hit.kind, id: hit.id }, { fresh: true })
      else router.push(hit.href)
    },
    [router],
  )
  const belowLg = useMedia("(max-width: 1023px)")
  // Until the trigger is used the rail follows the width: icons under 1024px, the default above. A toggle is kept across resizes.
  const [choice, setChoice] = useState<boolean | null>(null)
  const open = choice ?? (belowLg ? false : defaultOpen)
  // The bar's two slots, held in state so PageHeader renders into them once they mount.
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null)
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null)
  const bar = useMemo(() => ({ mode: phone ? ("inline" as const) : ("bar" as const), title: titleSlot, actions: actionsSlot }), [phone, titleSlot, actionsSlot])
  return (
    <SidebarProvider data-slot="admin-shell" data-phone={phone || undefined} open={open} onOpenChange={setChoice} style={RAIL_WIDTH}>
      {phone ? null : <Rail current={current} user={user} switcher={switcher} onSignOut={onSignOut} />}
      <SidebarInset className="min-h-svh min-w-0 bg-cream">
        <div data-slot="admin-bar" className={cn(GUTTER, "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-cream")}>
          {phone ? (
            <>
              <Image src={LOGO} alt="Trailhead" width={51} height={36} className="h-9 w-auto shrink-0" />
              {switcher !== undefined && <div data-slot="admin-switcher">{switcher}</div>}
              {onSearch && <SearchButton onClick={() => setSearching(true)} className="ml-auto" iconOnly />}
            </>
          ) : (
            <>
              <SidebarTrigger className="-ml-2 shrink-0 text-navy" />
              <div ref={setTitleSlot} data-slot="admin-bar-title" className="flex min-w-0 flex-1 items-baseline gap-3" />
              <div ref={setActionsSlot} data-slot="admin-bar-actions" className="flex shrink-0 items-center gap-2" />
              {onSearch && <SearchButton onClick={() => setSearching(true)} />}
            </>
          )}
        </div>
        <div className={cn(GUTTER, "w-full max-w-7xl pt-4 md:pt-6", phone ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-8")}>
          <AdminBarContext.Provider value={bar}>
            <UndoToastProvider>{children}</UndoToastProvider>
          </AdminBarContext.Provider>
        </div>
      </SidebarInset>
      {phone && <AdminTabBar current={current} user={user} onSignOut={onSignOut} />}
      {onSearch && <CommandSearch open={searching} onOpenChange={setSearching} onSearch={onSearch} onOpen={openHit} />}
    </SidebarProvider>
  )
}
