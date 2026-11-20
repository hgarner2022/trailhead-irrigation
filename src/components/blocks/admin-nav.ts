import { Briefcase, CalendarDays, Inbox, LayoutDashboard, Settings2, TrendingUp, Users, type LucideIcon } from "lucide-react"
import type { AdminSection } from "./AdminShell"

// The admin's navigation, once (docs/plans/2026-11-18-admin-holistic-design.md, section 4): the rail on a laptop is all six; the phone's bottom bar is
// the first four and More. A customer has jobs, a job is done in visits and the Schedule says when, so Visits is not a destination: its grid is
// the Schedule's List view and `/admin/visits` redirects there.

export interface NavItem {
  id: AdminSection
  label: string
  href: string
  icon: LucideIcon
}

export const NAV: readonly NavItem[] = [
  { id: "home", label: "Home", href: "/admin", icon: LayoutDashboard },
  { id: "schedule", label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
  { id: "jobs", label: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { id: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { id: "reports", label: "Reports", href: "/admin/reports", icon: TrendingUp },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings2 },
]

/** The phone's bottom bar: four tabs, then More with Reports, Settings and Sign out. */
export const TAB_ITEMS: readonly NavItem[] = NAV.slice(0, 4)
export const MORE_ITEMS: readonly NavItem[] = NAV.slice(4)

/**
 * Requests (Hannah, Nov 20 2026: one item after Schedule with a count badge, no Quotes item; on a phone it sits under More and Home carries the entry).
 * It is not in `NAV` because nothing in the live app has a Requests page yet: a screen that has one passes `requests` to `AdminShell`, which then
 * draws this item after Schedule in the rail and first in More, with the count of new requests.
 */
export const REQUESTS_ITEM: NavItem = { id: "requests", label: "Requests", href: "/admin/requests", icon: Inbox }

/** The rail's items: `NAV`, with Requests after Schedule when the shell was given `requests`. */
export function railItems(withRequests: boolean): readonly NavItem[] {
  if (!withRequests) return NAV
  const at = NAV.findIndex((n) => n.id === "schedule") + 1
  return [...NAV.slice(0, at), REQUESTS_ITEM, ...NAV.slice(at)]
}
