import { Briefcase, CalendarDays, FileText, Inbox, LayoutDashboard, Receipt, Settings2, TrendingUp, Users, type LucideIcon } from "lucide-react"
import type { AdminSection } from "./AdminShell"

// The admin's navigation, once, in ONE order (Hannah, Nov 25 2026): Home, Schedule, Customers, Requests, Quotes, Jobs, Invoices, Reports,
// Settings. Who, then the work in the order it happens (a request becomes a quote, a quote a job, a job an invoice), then the two back-office
// screens. The rail on a laptop, the phone's bottom bar and its More sheet, the prototype walkthrough and every story read this list and nothing
// else; nobody patches it. A customer has jobs, a job is done in visits and the Schedule says when, so Visits is not a destination: its grid is
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
  { id: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { id: "requests", label: "Requests", href: "/admin/requests", icon: Inbox },
  { id: "quotes", label: "Quotes", href: "/admin/quotes", icon: FileText },
  { id: "jobs", label: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { id: "invoices", label: "Invoices", href: "/admin/invoices", icon: Receipt },
  { id: "reports", label: "Reports", href: "/admin/reports", icon: TrendingUp },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings2 },
]

/**
 * Requests, Quotes and Invoices have a page in the prototype and not yet in the live app, so an item is drawn only by a shell that was given it
 * (`AdminShell`'s `requests`, `quotes` and `invoices`). The order never changes: the live rail is the same list with those three left out.
 */
export interface NavHas {
  requests?: boolean
  quotes?: boolean
  invoices?: boolean
}
const OPTIONAL: readonly AdminSection[] = ["requests", "quotes", "invoices"]

/** The rail's items: `NAV` in its one order, without the pages this shell does not have. */
export function railItems(has: NavHas = {}): readonly NavItem[] {
  return NAV.filter((n) => !OPTIONAL.includes(n.id) || Boolean(has[n.id as keyof NavHas]))
}

/**
 * The phone's bottom bar: Home, Schedule, Customers, Jobs, then More. Five places is what fits with labels at 375px, and these four are what is
 * opened from a truck: today, the week, a person, the work. Requests, Quotes and Invoices are desk work done a few times a day, so they are one
 * tap further, in More, with their counts (the count of new requests is also on the More button, so nothing new is hidden).
 */
const TAB_IDS: readonly AdminSection[] = ["home", "schedule", "customers", "jobs"]
export const TAB_ITEMS: readonly NavItem[] = NAV.filter((n) => TAB_IDS.includes(n.id))

/** The phone's More sheet: everything of the rail that is not a tab, in the rail's order. */
export function moreItems(has: NavHas = {}): readonly NavItem[] {
  return railItems(has).filter((n) => !TAB_IDS.includes(n.id))
}

/**
 * The crumb above a record page's title (Hannah, Nov 25 2026): it names the PARENT LIST, the rail item the record belongs to ("‹ Jobs", "‹ Invoices",
 * "‹ Customers"), and goes to that list. Never the record or the screen the reader just left: the browser's Back does that. A page asks here,
 * so a crumb can only ever be one of the rail's own lists, with the rail's own word and address.
 */
export function listCrumb(section: AdminSection): { label: string; href: string } {
  const item = NAV.find((n) => n.id === section)!
  return { label: item.label, href: item.href }
}
