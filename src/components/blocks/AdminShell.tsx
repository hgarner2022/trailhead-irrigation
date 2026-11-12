"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import Image from "next/image"
import { CalendarRange, LayoutDashboard, LogOut, Ticket, TrendingUp, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
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
// cream column of at most 1280px. The links are plain anchors; the prototype
// has no router yet. The switcher slot above the items stays empty until a
// second branch exists.

export type AdminSection = "home" | "revenue" | "passes" | "october" | "customers"

export interface AdminShellProps {
  current: AdminSection
  user: { initials: string; name: string }
  /** the organization switcher; nothing renders when undefined */
  switcher?: ReactNode
  /** whether the rail starts expanded on a laptop; under 1024px it starts collapsed either way */
  defaultOpen?: boolean
  children: ReactNode
}

const NAV: { id: AdminSection; label: string; href: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", href: "/admin", icon: LayoutDashboard },
  { id: "revenue", label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
  { id: "passes", label: "Passes", href: "/admin/passes", icon: Ticket },
  { id: "october", label: "October", href: "/admin/october", icon: CalendarRange },
  { id: "customers", label: "Customers", href: "/admin/customers", icon: Users },
]

const LG_QUERY = "(min-width: 1024px)"
const CONTENT = "mx-auto w-full max-w-7xl container-padding-x"

const subscribeLg = (onChange: () => void) => {
  const mql = window.matchMedia(LG_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}
const belowLgNow = () => !window.matchMedia(LG_QUERY).matches

/** True under 1024px, where the rail rests on its icons; false on the server. */
function useBelowLg(): boolean {
  return useSyncExternalStore(subscribeLg, belowLgNow, () => false)
}

function Logo({ size }: { size: 36 | 40 }) {
  return <Image src="/images/logo-badge.png" alt="Trailhead" width={size} height={size} className={cn("shrink-0", size === 40 ? "size-10" : "size-9")} />
}

function Rail({ current, user, switcher }: Pick<AdminShellProps, "current" | "user" | "switcher">) {
  return (
    <Sidebar collapsible="icon" className="motion-reduce:transition-none">
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2 px-1 group-data-[collapsible=icon]:px-0">
          <Logo size={40} />
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
                    <a href={href} aria-current={id === current ? "page" : undefined}>
                      <Icon />
                      <span>{label}</span>
                    </a>
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
            <SidebarMenuButton type="button" tooltip="Sign out" aria-label={`Sign out ${user.name}`}>
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground"
    >
      <ul className="grid grid-cols-5">
        {NAV.map(({ id, label, href, icon: Icon }) => {
          const active = id === current
          return (
            <li key={id}>
              <a
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-[11px] font-medium leading-tight outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/80",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-sidebar-primary")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function DesktopShell({ current, user, switcher, defaultOpen = true, children }: AdminShellProps) {
  const belowLg = useBelowLg()
  // Until the trigger is used the rail follows the width: icons under 1024px, the default above. A toggle is kept across resizes.
  const [choice, setChoice] = useState<boolean | null>(null)
  const open = choice ?? (belowLg ? false : defaultOpen)
  return (
    <SidebarProvider data-slot="admin-shell" open={open} onOpenChange={setChoice}>
      <Rail current={current} user={user} switcher={switcher} />
      <SidebarInset className="min-h-svh bg-cream">
        <div className={cn(CONTENT, "flex h-14 shrink-0 items-center")}>
          <SidebarTrigger className="-ml-1.5 text-navy" />
        </div>
        <div className={cn(CONTENT, "pb-8 pt-2 lg:pt-4")}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function PhoneShell({ current, switcher, children }: AdminShellProps) {
  return (
    <div data-slot="admin-shell" data-phone="" className="min-h-svh bg-cream">
      <header className="flex h-14 items-center justify-between px-4">
        <Logo size={36} />
        {switcher !== undefined && <div data-slot="admin-switcher">{switcher}</div>}
      </header>
      <main className={cn(CONTENT, "pb-20 pt-2")}>{children}</main>
      <TabBar current={current} />
    </div>
  )
}

export function AdminShell(props: AdminShellProps) {
  const isMobile = useIsMobile()
  return isMobile ? <PhoneShell {...props} /> : <DesktopShell {...props} />
}
