import { Briefcase, CalendarDays, FileText, Inbox, LayoutDashboard, Settings2, TrendingUp, Users, type LucideIcon } from "lucide-react"
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
 * Requests (Hannah, Nov 20 2026: one item after Schedule with a count badge; on a phone it sits under More and Home carries the entry).
 * It is not in `NAV` because nothing in the live app has a Requests page yet: a screen that has one passes `requests` to `AdminShell`, which then
 * draws this item after Schedule in the rail and first in More, with the count of new requests.
 */
export const REQUESTS_ITEM: NavItem = { id: "requests", label: "Requests", href: "/admin/requests", icon: Inbox }

/**
 * Quotes (Hannah, Nov 20 2026: a Quotes item was added after all, after Jobs, with a count of the quotes still waiting for an answer). The job still holds the
 * quote and Jobs still shows Needs a quote and Quote sent; this is a second view of every quote. Not in `NAV` for the same reason as Requests: a screen
 * that has the list passes `quotes` to `AdminShell`, which draws it after Jobs in the rail and in More after Requests.
 */
export const QUOTES_ITEM: NavItem = { id: "quotes", label: "Quotes", href: "/admin/quotes", icon: FileText }

/** The rail's items: `NAV`, with Requests after Schedule and Quotes after Jobs when the shell was given `requests` and `quotes`. */
export function railItems(withRequests: boolean, withQuotes = false): readonly NavItem[] {
  const items = [...NAV]
  if (withRequests) items.splice(items.findIndex((n) => n.id === "schedule") + 1, 0, REQUESTS_ITEM)
  if (withQuotes) items.splice(items.findIndex((n) => n.id === "jobs") + 1, 0, QUOTES_ITEM)
  return items
}

/** The phone's More: Requests and Quotes first when the shell has them, then Reports and Settings (and whatever a prototype patches in). */
export function moreItems(withRequests: boolean, withQuotes = false): readonly NavItem[] {
  return [...(withRequests ? [REQUESTS_ITEM] : []), ...(withQuotes ? [QUOTES_ITEM] : []), ...MORE_ITEMS]
}
