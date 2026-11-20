// The prototype's router, pure (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 2). A route is a screen and, for a record, its id.
// `parseHref` turns the hrefs the record chips and the nav emit (`recordHref.*`, `/admin/...`) into a route, so the walkthrough never edits a
// page component: it listens for the links the pages already draw. An href that is not in the prototype parses to null.

export type Screen = "home" | "schedule" | "requests" | "jobs" | "customers" | "invoices" | "reports" | "settings" | "request" | "job" | "customer" | "invoice" | "receipt"
export interface Route {
  screen: Screen
  id?: string
  /** the New job sheet is open on the Jobs screen; `id` is the customer it was started from */
  newJob?: boolean
  /** the Requests list opened with its Status chip set (Home's "2 new requests" row: new) */
  filter?: "new"
}

export const ROOTS: readonly Screen[] = ["home", "schedule", "requests", "jobs", "customers", "invoices", "reports", "settings"]
export const isRoot = (r: Route) => ROOTS.includes(r.screen) && !r.id && !r.newJob
export const sameRoute = (a: Route, b: Route) => a.screen === b.screen && a.id === b.id && Boolean(a.newJob) === Boolean(b.newJob) && a.filter === b.filter

const SECTION: Record<string, Screen> = { "": "home", schedule: "schedule", requests: "requests", jobs: "jobs", customers: "customers", invoices: "invoices", reports: "reports", settings: "settings" }
const RECORD: Partial<Record<string, Screen>> = { requests: "request", jobs: "job", customers: "customer", invoices: "invoice" }
const KEY: Record<string, string> = { requests: "request", jobs: "job", customers: "customer", invoices: "invoice" }

/** The route an href names, or null when it leaves the prototype (tel:, mailto:, Stripe, the pay page, a receipt). */
export function parseHref(href: string): Route | null {
  if (!href || href.startsWith("#")) return null
  let url: URL
  try {
    url = new URL(href, "http://prototype.local")
  } catch {
    return null
  }
  if (url.origin !== "http://prototype.local") return null
  const parts = url.pathname.split("/").filter(Boolean)
  if (parts[0] !== "admin") return null
  const section = parts[1] ?? ""
  const screen = SECTION[section]
  if (!screen) return null
  const id = KEY[section] ? url.searchParams.get(KEY[section]!) : null
  const record = RECORD[section]
  if (record && id) return { screen: record, id }
  if (section === "jobs" && url.searchParams.get("new") === "1") {
    const customer = url.searchParams.get("customer")
    return customer ? { screen: "jobs", newJob: true, id: customer } : { screen: "jobs", newJob: true }
  }
  if (section === "requests" && url.searchParams.get("status") === "new") return { screen: "requests", filter: "new" }
  if (section === "schedule") {
    const day = url.searchParams.get("day")
    return day ? { screen: "schedule", id: day } : { screen }
  }
  return { screen }
}

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
/** "Tuesday, November 24" for an ISO day. */
export const dayTitle = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : DAY.format(d)
}

export const SCREEN_TITLE: Record<"home" | "schedule" | "requests" | "jobs" | "customers" | "invoices" | "reports" | "settings", string> = {
  home: "Home",
  schedule: "Schedule",
  requests: "Requests",
  jobs: "Jobs",
  customers: "Customers",
  invoices: "Invoices",
  reports: "Reports",
  settings: "Settings",
}

/** The breadcrumb words of a route: the list's name, or the record's own name (given by the caller, who holds the data). */
export function routeTitle(route: Route, nameOf: (r: Route) => string | undefined = () => undefined): string {
  if (route.screen === "request" || route.screen === "job" || route.screen === "customer" || route.screen === "invoice") return nameOf(route) ?? route.id ?? route.screen
  if (route.screen === "receipt") return "Andrea's receipt"
  if (route.screen === "schedule" && route.id) return dayTitle(route.id)
  if (route.newJob) return "New job"
  return SCREEN_TITLE[route.screen]
}

/** The stack after going to `to`: back to the entry one below when that is where the link points, a fresh root for a nav item, else one deeper. */
export function navigate(stack: readonly Route[], to: Route): Route[] {
  const top = stack[stack.length - 1]
  if (top && sameRoute(top, to)) return [...stack]
  const below = stack[stack.length - 2]
  if (below && sameRoute(below, to)) return stack.slice(0, -1)
  if (isRoot(to)) return [to]
  return [...stack, to]
}
