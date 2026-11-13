"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, LayoutDashboard, LogOut, Settings2, Ticket, TrendingUp, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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

// The frame every admin screen sits in (docs/DESIGN.md, Spacing): the navy
// rail on a laptop, collapsed to icons under 1024px, and a bottom tab bar
// instead of the rail under 768px. The screen itself is the children, in one
// cream column of at most 1280px. One tree serves every width: the rail and
// the tab bar come and go with the breakpoint but the inset around the
// children stays mounted, so a resize never resets the screen. The links are
// next/link (plain anchors in the catalog). The switcher slot above
// the items stays empty until a second branch exists. Sign out calls `onSignOut`, a server action in the
// layout, and does nothing in the catalog. The tab bar pads for `env(safe-area-inset-bottom)`, which
// the admin root layout enables with `viewport.viewportFit = "cover"`.

export type AdminSection = "home" | "schedule" | "passes" | "revenue" | "customers" | "settings"

export interface AdminShellProps {
  current: AdminSection
  user: { initials: string; name: string }
  /** the organization switcher; nothing renders when undefined */
  switcher?: ReactNode
  /** signs the person out; the sign-out button does nothing without it (the catalog) */
  onSignOut?: () => void | Promise<void>
  /** whether the rail starts expanded on a laptop; under 1024px it starts collapsed either way */
  defaultOpen?: boolean
  children: ReactNode
}

// The order of the information architecture plan: one job each. Schedule and
// Settings arrive with the next task; their links are in place so the frame
// never changes under Hannah.
const NAV: { id: AdminSection; label: string; href: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", href: "/admin", icon: LayoutDashboard },
  { id: "schedule", label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
  { id: "passes", label: "Passes", href: "/admin/passes", icon: Ticket },
  { id: "revenue", label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
  { id: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings2 },
]

const CONTENT = "mx-auto w-full max-w-7xl container-padding-x"
// The badge is 813 by 573; the width props keep its shape so next/image never squashes it.
const LOGO = "/images/logo-badge.png"

// One subscribe function per query, so useSyncExternalStore keeps its listener across renders.
const subscribers = new Map<string, (onChange: () => void) => () => void>()
const subscribeTo = (query: string) => {
  let subscribe = subscribers.get(query)
  if (!subscribe) {
    subscribe = (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    }
    subscribers.set(query, subscribe)
  }
  return subscribe
}

/** A media query as a store: current on the client, `false` on the server. The Sidebar primitive keeps its own `useIsMobile` for its sheet. */
function useMedia(query: string): boolean {
  return useSyncExternalStore(subscribeTo(query), () => window.matchMedia(query).matches, () => false)
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

function TabBar({ current }: Pick<AdminShellProps, "current">) {
  return (
    <nav
      aria-label="Main"
      data-slot="admin-tabbar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden"
    >
      <ul className="grid grid-cols-6">
        {NAV.map(({ id, label, href, icon: Icon }) => {
          const active = id === current
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-xs font-medium leading-tight outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/80",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-sidebar-primary")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AdminShell({ current, user, switcher, onSignOut, defaultOpen = true, children }: AdminShellProps) {
  const phone = useMedia("(max-width: 767px)")
  const belowLg = useMedia("(max-width: 1023px)")
  // Until the trigger is used the rail follows the width: icons under 1024px, the default above. A toggle is kept across resizes.
  const [choice, setChoice] = useState<boolean | null>(null)
  const open = choice ?? (belowLg ? false : defaultOpen)
  return (
    <SidebarProvider data-slot="admin-shell" data-phone={phone || undefined} open={open} onOpenChange={setChoice}>
      {phone ? null : <Rail current={current} user={user} switcher={switcher} onSignOut={onSignOut} />}
      <SidebarInset className="min-h-svh bg-cream">
        <div className={cn(CONTENT, "flex h-14 shrink-0 items-center justify-between")}>
          {phone ? (
            <>
              <Image src={LOGO} alt="Trailhead" width={51} height={36} className="h-9 w-auto shrink-0" />
              {switcher !== undefined && <div data-slot="admin-switcher">{switcher}</div>}
            </>
          ) : (
            <SidebarTrigger className="-ml-1.5 text-navy" />
          )}
        </div>
        <div className={cn(CONTENT, "pt-2 lg:pt-4", phone ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-8")}>{children}</div>
      </SidebarInset>
      {phone && <TabBar current={current} />}
    </SidebarProvider>
  )
}
