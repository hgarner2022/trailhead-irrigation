"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Search } from "lucide-react"
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
import { ToastProvider } from "./Toast"
import { UndoToastProvider } from "./UndoToast"
import { AdminAccountMenu } from "./AdminAccountMenu"
import { TopBar } from "./TopBar"

// The frame every admin screen sits in (docs/DESIGN.md, Spacing): the navy
// rail on a laptop, collapsed to icons under 1024px, and a bottom tab bar
// instead of the rail under 768px. The screen itself is the children, in one
// cream column of at most 1280px. One tree serves every width: the rail and
// the tab bar come and go with the breakpoint but the inset around the
// children stays mounted, so a resize never resets the screen. The links are
// next/link (plain anchors in the catalog). The switcher slot above
// the items stays empty until a second branch exists. The top bar is `TopBar`: Search, and on a phone the account's initials; on a laptop the account menu (`AdminAccountMenu`) is the rail's footer, bottom left, opening upward; Sign out is in that menu and not in More. `onSignOut` is a server action in the
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
  /** the account menu's optional rows; a row with no address is not drawn */
  profileHref?: string
  helpHref?: string
  /** set when the signed-in email is also a customer's: Open as customer */
  customerHref?: string
  /** whether the rail starts expanded on a laptop; under 1024px it starts collapsed either way */
  defaultOpen?: boolean
  children: ReactNode
}

// 15rem rail (240px); the bar and the content share the 16px phone and 24px laptop gutters.
const RAIL_WIDTH = { "--sidebar-width": "15rem", "--sidebar-width-icon": "3.5rem" } as CSSProperties
const GUTTER = "px-4 md:px-6"
// The rail's mark: the badge trimmed of its transparent margin (240 by 179), shown at 40px on a cream tile so it keeps its colours on the navy.
const MARK = "/images/logo-badge-trim.png"

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

type RailAccount = Pick<AdminShellProps, "user" | "profileHref" | "helpHref" | "customerHref" | "onSignOut">

function Rail({ current, switcher, user, profileHref, helpHref, customerHref, onSignOut }: Pick<AdminShellProps, "current" | "switcher"> & RailAccount) {
  return (
    <Sidebar collapsible="icon" className="motion-reduce:transition-none">
      {/* The brand lockup (Hannah, Nov 20 2026): the 40px mark and two lines, on the nav icons' inset (measured: the icons sit 16px from the rail's edge, the header's 8px plus 8px), 20px above and
          below, a hairline under it; collapsed, the mark alone, centred. */}
      <SidebarHeader className="border-b border-sidebar-border py-5">
        <div className="flex h-10 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cream">
            <Image src={MARK} alt="Trailhead Lawn & Irrigation" width={240} height={179} className="h-auto w-8" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display text-lg leading-none font-semibold text-sidebar-foreground">Trailhead</span>
            <span className="truncate text-xs leading-none text-sidebar-muted">Lawn &amp; Irrigation</span>
          </span>
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
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
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
      {/* the account menu, bottom left of the rail (Hannah, Nov 20 2026): avatar and name, the avatar alone when collapsed, the menu opening upward */}
      <SidebarFooter className="border-t border-sidebar-border">
        <AdminAccountMenu placement="rail" user={user} profileHref={profileHref} helpHref={helpHref} customerHref={customerHref} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
}

export function AdminShell({ current: initial, user, switcher, onSignOut, onSearch, profileHref, helpHref, customerHref, defaultOpen = true, children }: AdminShellProps) {
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
  const [primarySlot, setPrimarySlot] = useState<HTMLElement | null>(null)
  const bar = useMemo(() => ({ mode: phone ? ("inline" as const) : ("bar" as const), title: titleSlot, actions: actionsSlot, primary: primarySlot }), [phone, titleSlot, actionsSlot, primarySlot])
  return (
    <SidebarProvider data-slot="admin-shell" data-phone={phone || undefined} open={open} onOpenChange={setChoice} style={RAIL_WIDTH}>
      {phone ? null : <Rail current={current} switcher={switcher} user={user} profileHref={profileHref} helpHref={helpHref} customerHref={customerHref} onSignOut={onSignOut} />}
      <SidebarInset className="min-h-svh min-w-0 bg-cream">
        <TopBar
          phone={phone}
          leading={<SidebarTrigger className="-ml-2 shrink-0 text-navy" />}
          titleRef={setTitleSlot}
          actionsRef={setActionsSlot}
          primaryRef={setPrimarySlot}
          switcher={switcher}
          search={onSearch ? <SearchButton onClick={() => setSearching(true)} iconOnly={phone} /> : undefined}
          account={phone ? <AdminAccountMenu user={user} compact profileHref={profileHref} helpHref={helpHref} customerHref={customerHref} onSignOut={onSignOut} /> : undefined}
        />
        <div className={cn(GUTTER, "w-full max-w-7xl pt-4 md:pt-6", phone ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-8")}>
          <AdminBarContext.Provider value={bar}>
            <UndoToastProvider><ToastProvider>{children}</ToastProvider></UndoToastProvider>
          </AdminBarContext.Provider>
        </div>
      </SidebarInset>
      {phone && <AdminTabBar current={current} />}
      {onSearch && <CommandSearch open={searching} onOpenChange={setSearching} onSearch={onSearch} onOpen={openHit} />}
    </SidebarProvider>
  )
}
