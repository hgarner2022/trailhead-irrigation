"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { Receipt } from "lucide-react"
import { AdminShell, type AdminSection } from "@/components/blocks/AdminShell"
import { MORE_ITEMS, NAV } from "@/components/blocks/admin-nav"
import { useToast } from "@/components/blocks/Toast"
import { Button } from "@/components/ui/button"
import { allRows, nameOfRoute, ownerOf, resetExtras, resolveRoute, searchWorld } from "./data"
import { NewJobSheet, RouteScreen } from "./WalkScreens"
import { navigate, parseHref, routeTitle, type Route } from "./routes"

// The one clickable admin prototype (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 2): the real AdminShell around a screen chosen by
// an in-memory route stack, no Next router and no address changes (Storybook owns the URL). Navigation is by intercepting the links the pages
// already draw (a record chip's href, the rail, a crumb): one capture-phase click on the root parses the href into a route. A link that leaves
// the prototype (tel:, mailto:, Stripe, the pay page) opens nowhere and says so in a toast. A table row opens its first record, a Cmd+K hit opens
// its route. The rail gets an Invoices item here only, by patching `NAV` while the prototype is mounted; the live nav is never edited.

const USER = { initials: "HG", name: "Hannah" }
const SECTION_OF: Record<Route["screen"], AdminSection> = { home: "home", schedule: "schedule", jobs: "jobs", job: "jobs", customers: "customers", customer: "customers", invoices: "invoices" as AdminSection, invoice: "invoices" as AdminSection, reports: "reports", settings: "settings" }
const START: Route = { screen: "jobs" }

/** Invoices in the rail while the walkthrough is mounted: the shell's NAV is patched, then restored. */
function useInvoicesInNav() {
  useState(() => {
    if (!NAV.some((n) => n.id === ("invoices" as AdminSection))) {
      const at = NAV.findIndex((n) => n.id === "customers") + 1
      ;(NAV as unknown as unknown[]).splice(at, 0, { id: "invoices", label: "Invoices", href: "/admin/invoices", icon: Receipt })
      ;(MORE_ITEMS as unknown as unknown[]).unshift({ id: "invoices", label: "Invoices", href: "/admin/invoices", icon: Receipt })
    }
    return null
  })
  useEffect(
    () => () => {
      const i = NAV.findIndex((n) => n.id === ("invoices" as AdminSection))
      if (i >= 0) (NAV as unknown as unknown[]).splice(i, 1)
      const j = MORE_ITEMS.findIndex((n) => n.id === ("invoices" as AdminSection))
      if (j >= 0) (MORE_ITEMS as unknown as unknown[]).splice(j, 1)
    },
    [],
  )
}

function ToastBridge({ toastRef }: { toastRef: { current: (m: string) => void } }) {
  const toast = useToast()
  useEffect(() => {
    toastRef.current = toast
  }, [toast, toastRef])
  return null
}

/** "Prototype · Jobs › Andrea Dalton › INV-2026-0042" with Start over: the same quiet strip the flow uses. */
function Strip({ stack, onJump, onStartOver }: { stack: Route[]; onJump: (index: number) => void; onStartOver: () => void }) {
  return (
    <nav aria-label="Prototype" data-slot="walkthrough-strip" className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm">
      <span className="font-semibold text-navy">Prototype</span>
      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-muted-foreground">
        {stack.map((route, i) => {
          const last = i === stack.length - 1
          const name = routeTitle(route, nameOfRoute)
          return (
            <li key={`${i}-${name}`} className="flex items-center gap-1.5">
              <span aria-hidden>{i === 0 ? "·" : "›"}</span>
              {last ? (
                <span aria-current="page" className="font-medium text-foreground">{name}</span>
              ) : (
                <button type="button" onClick={() => onJump(i)} className="min-h-11 rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-8">
                  {name}
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <Button type="button" variant="outline" className="min-h-11" onClick={onStartOver}>Start over</Button>
    </nav>
  )
}

const INTERACTIVE = "a, button, input, select, textarea, label, [role=checkbox], [role=menuitem], [role=combobox]"
const KIND_ORDER = ["invoice", "job", "customer"]

export function Walkthrough({ start = START }: { start?: Route }) {
  useInvoicesInNav()
  const [stack, setStack] = useState<Route[]>([start])
  const [epoch, setEpoch] = useState(0)
  const [sheet, setSheet] = useState(false)
  const [made, setMade] = useState(0)
  // the grid's rows: the world's, then the jobs made here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => allRows(), [made])
  const toastRef = useRef<(m: string) => void>(() => undefined)
  const top = stack[stack.length - 1]!

  const go = useCallback((parsed: Route) => {
    if (parsed.newJob) {
      setSheet(true)
      setStack((s) => (s[s.length - 1]!.screen === "jobs" ? s : [START]))
      return
    }
    setSheet(false)
    setStack((s) => {
      const cur = s[s.length - 1]!
      const owner = ownerOf(cur)
      let r = resolveRoute(parsed, owner)
      // A bare "Customer" link on a job or an invoice opens that page's customer; on the customer's own page it is the list
      if (r.screen === "customers" && !r.id && (cur.screen === "job" || cur.screen === "invoice") && owner) r = { screen: "customer", id: owner }
      return navigate(s, r)
    })
  }, [])

  const outside = (href: string) => toastRef.current(`Outside the prototype: ${href}`)

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const target = e.target as Element
    const stop = () => (e.preventDefault(), e.stopPropagation())
    // a Cmd+K hit
    const item = target.closest("[cmdk-item]")
    if (item) {
      const hit = (item.getAttribute("data-value") ?? "").match(/^(customer|job)-(.+)$/)
      if (hit) go({ screen: hit[1] as "customer" | "job", id: hit[2] })
      return
    }
    const a = target.closest("a[href]")
    if (a) {
      const href = a.getAttribute("href") ?? ""
      if (href.startsWith("#")) return
      stop()
      const route = parseHref(href)
      if (route) go(route)
      else outside(href)
      return
    }
    // a table row opens its record: the first chip in it
    const tr = target.closest("tr")
    if (tr && !target.closest(INTERACTIVE)) {
      const chips = KIND_ORDER.map((k) => tr.querySelector(`a[data-kind=${k}]`)).filter(Boolean) as Element[]
      const route = chips[0] && parseHref(chips[0].getAttribute("href") ?? "")
      if (route) {
        stop()
        go(route)
      }
    }
  }

  // Enter on a chosen Cmd+K hit opens it too (a click is caught above)
  const onKeyDownCapture = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return
    const item = (e.target as Element).closest("[cmdk-root]")?.querySelector("[cmdk-item][aria-selected=true]")
    const hit = (item?.getAttribute("data-value") ?? "").match(/^(customer|job)-(.+)$/)
    if (hit) go({ screen: hit[1] as "customer" | "job", id: hit[2] })
  }

  const startOver = () => {
    setSheet(false)
    resetExtras()
    setMade((n) => n + 1)
    setStack([START])
    setEpoch((n) => n + 1)
  }
  const jump = (index: number) => setStack((s) => s.slice(0, index + 1))

  return (
    <div data-slot="walkthrough" data-route={`${top.screen}${top.id ? `:${top.id}` : ""}`} style={{ display: "contents" }} onClickCapture={onClickCapture} onKeyDownCapture={onKeyDownCapture}>
      <AdminShell current={SECTION_OF[top.screen]} user={USER} onSearch={async (q) => searchWorld(q)} profileHref="/admin/profile" helpHref="/admin/help">
        <ToastBridge toastRef={toastRef} />
        <Strip stack={stack} onJump={jump} onStartOver={startOver} />
        <div key={`${epoch}-${top.screen}-${top.id ?? ""}`}>
          <RouteScreen route={top} rows={rows} onOpenJob={(id) => go({ screen: "job", id })} onOpenCustomer={(id) => go({ screen: "customer", id })} onNew={() => go({ screen: "jobs", newJob: true })} />
        </div>
        <NewJobSheet open={sheet} onClose={() => setSheet(false)} onMade={() => setMade((n) => n + 1)} onCreated={(id) => go({ screen: "job", id })} />
      </AdminShell>
    </div>
  )
}
