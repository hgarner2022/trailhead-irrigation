"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { Receipt } from "lucide-react"
import { AdminShell, type AdminSection } from "@/components/blocks/AdminShell"
import { MORE_ITEMS, NAV } from "@/components/blocks/admin-nav"
import { useToast } from "@/components/blocks/Toast"
import { Button } from "@/components/ui/button"
import { allRows, nameOfRoute, ownerOf, resetExtras, resolveRoute, searchWorld } from "./data"
import { NewJobSheet, RouteScreen } from "./WalkScreens"
import { NewQuoteHost } from "./WalkQuotes"
import { pickOf, type ServicePick } from "../requests/request-catalogue"
import type { CustomerChoice } from "../../CustomerPicker"
import { MessageView, ReceiptToast, newestPayment, paidFrom, useReceiptToast, type Paid } from "./receipts"
import { navigate, parseHref, routeTitle, type Route } from "./routes"
import { ScheduleOverlays } from "../ScheduleOverlays"
import { WALK_PEOPLE } from "./visits-data"
import { resetWalkSchedule, walkSchedule } from "./walk-schedule"
import { useWorldState } from "../schedule-world-store"
import { newCount } from "../requests/request-model"
import { requestStore, useRequests } from "../requests/request-store"
import { waitingCount } from "../quotes/quote-list-model"
import { useQuoteWorld, walkQuotes } from "../quotes/quote-store"

// The one clickable admin prototype (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 2): the real AdminShell around a screen chosen by
// an in-memory route stack, no Next router and no address changes (Storybook owns the URL). Navigation is by intercepting the links the pages
// already draw (a record chip's href, the rail, a crumb): one capture-phase click on the root parses the href into a route. A link that leaves
// the prototype (tel:, mailto:, Stripe, the pay page) opens nowhere and says so in a toast. A table row opens its first record, a Cmd+K hit opens
// its route. The rail gets an Invoices item here only, by patching `NAV` while the prototype is mounted; the live nav is never edited.

const USER = { initials: "HG", name: "Hannah" }
const SECTION_OF: Record<Route["screen"], AdminSection> = { home: "home", schedule: "schedule", requests: "requests", request: "requests", jobs: "jobs", job: "jobs", quotes: "quotes", quote: "quotes", customers: "customers", customer: "customers", invoices: "invoices" as AdminSection, invoice: "invoices" as AdminSection, receipt: "jobs", reports: "reports", settings: "settings" }
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

// The shell is keyed by route, so a toast raised while a record is being left would go with the old shell: `later` holds one until the new shell mounts.
function ToastBridge({ toastRef, later }: { toastRef: { current: (m: string) => void }; later: { current: string | null } }) {
  const toast = useToast()
  useEffect(() => {
    toastRef.current = toast
    if (later.current) {
      toast(later.current)
      later.current = null
    }
  }, [toast, toastRef, later])
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
const KIND_ORDER = ["quote", "invoice", "job", "customer"]

/** `start` is the first screen; `startStack` is a whole way in (so Back has somewhere to go); `startSearch` opens Cmd+K and `startSheet` the New job sheet, so a story can show either with no script. */
export function Walkthrough({ start = START, startStack, startSearch = false, startSheet }: { start?: Route; startStack?: Route[]; startSearch?: boolean; startSheet?: { customer?: string } }) {
  useInvoicesInNav()
  // A clean start every time it opens: the requests Ryan answered, the quotes sent and the jobs made in an earlier story are forgotten, so a story opens as it was drawn
  useState(() => (requestStore.reset(), walkQuotes.reset(), resetExtras(), resetWalkSchedule(), null))
  const [stack, setStack] = useState<Route[]>(startStack ?? [start])
  const [epoch, setEpoch] = useState(0)
  const [sheet, setSheet] = useState<{ customer?: string; day?: string; key: number } | null>(startSheet ? { customer: startSheet.customer, key: 1 } : null)
  const [quoteSheet, setQuoteSheet] = useState<{ customer?: string; choice?: CustomerChoice; pick?: ServicePick; key: number } | null>(null)
  const [made, setMade] = useState(0)
  const [message, setMessage] = useState<{ channel: "text" | "email"; paid: Paid } | null>(null)
  const receiptToast = useReceiptToast()
  // Requests: the fixtures, what Ryan did to them and what the customer walkthrough sent; the rail's badge counts the New ones
  const requests = useRequests()
  const quoteWorld = useQuoteWorld()
  // a move on the Schedule changes the Jobs grid's Next and Who, the customer page and the job page: they read the one calendar
  const calendar = useWorldState(walkSchedule())
  // the grid's rows: the world's, then the jobs made here (and the jobs a request became)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => allRows(), [made, requests, quoteWorld, calendar.visits, calendar.unscheduled])
  const toastRef = useRef<(m: string) => void>(() => undefined)
  const laterToast = useRef<string | null>(null)
  // New work for an archived customer brings them back; the toast shows on the job's page that opens next
  const onActiveAgain = useCallback((name: string) => { laterToast.current = `${name} is active again.` }, [])
  const top = stack[stack.length - 1]!

  const go = useCallback((parsed: Route) => {
    if (parsed.newQuote) {
      // New quote opens its sheet over the page it was asked from (a customer's page, the Quotes list); from anywhere else it opens on the Quotes list
      const who = parsed.id ? resolveRoute({ screen: "customer", id: parsed.id }).id : undefined
      setSheet(null)
      setQuoteSheet({ customer: who, key: Date.now() })
      setStack((s) => (["quotes", "customer"].includes(s[s.length - 1]!.screen) ? s : [{ screen: "quotes" }]))
      return
    }
    if (parsed.newJob) {
      const who = parsed.id ? resolveRoute({ screen: "customer", id: parsed.id }).id : undefined
      setSheet({ customer: who, key: Date.now() })
      setStack((s) => (["jobs", "schedule"].includes(s[s.length - 1]!.screen) ? s : [START]))
      return
    }
    setSheet(null)
    setQuoteSheet(null)
    setStack((s) => {
      const cur = s[s.length - 1]!
      const owner = ownerOf(cur)
      let r = resolveRoute(parsed, owner)
      // A bare "Customer" link on a job or an invoice opens that page's customer; on the customer's own page it is the list
      if (r.screen === "customers" && !r.id && (cur.screen === "job" || cur.screen === "invoice") && owner) r = { screen: "customer", id: owner }
      return navigate(s, r)
    })
  }, [])

  // A Cmd+K hit: a customer, a job, a request or a quote (its number) opens its own page
  const goHit = (kind: string, id: string) => go({ screen: kind as "customer" | "job" | "request" | "quote", id })

  const outside = (href: string) => toastRef.current(`Outside the prototype: ${href}`)

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const target = e.target as Element
    const stop = () => (e.preventDefault(), e.stopPropagation())
    // a Cmd+K hit
    const item = target.closest("[cmdk-item]")
    if (item) {
      const hit = (item.getAttribute("data-value") ?? "").match(/^(customer|job|request|quote)-(.+)$/)
      if (hit) goHit(hit[1]!, hit[2]!)
      return
    }
    const a = target.closest("a[href]")
    if (a) {
      const href = a.getAttribute("href") ?? ""
      if (href.startsWith("#")) return
      stop()
      const route = parseHref(href)
      if (route) go(route)
      else if (/^\/account\/receipts\//.test(href)) openReceipt(paidFrom(a.closest("tr, li")?.textContent ?? ""))
      else outside(href)
      return
    }
    // a Receipt (or refund) row of Messages opens what the customer got
    const row = target.closest("tr, li")
    const said = row?.textContent ?? ""
    if (row && !target.closest(INTERACTIVE) && /Delivered/.test(said) && /Receipt|refunded/.test(said) && /Text|Email/.test(said)) {
      stop()
      setMessage({ channel: /Email/.test(said) ? "email" : "text", paid: /refunded/i.test(said) ? { way: "refund" } : (newestPayment() ?? { way: "card" }) })
      return
    }
    // a table row opens its record: the first chip in it
    const tr = target.closest("tr")
    // a request row opens through its name, never through the customer it matches
    if (tr && !target.closest(INTERACTIVE) && !tr.closest("[data-slot=requests-list]")) {
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
    const hit = (item?.getAttribute("data-value") ?? "").match(/^(customer|job|request|quote)-(.+)$/)
    if (hit) goHit(hit[1]!, hit[2]!)
  }

  const openReceipt = (paid: Paid) => {
    setSheet(null)
    setStack((s) => navigate(s, { screen: "receipt", id: `${paid.way}|${paid.ref ?? ""}` }))
  }
  const startOver = () => {
    setSheet(null)
    setQuoteSheet(null)
    resetExtras()
    resetWalkSchedule()
    requestStore.reset()
    walkQuotes.reset()
    setMade((n) => n + 1)
    setStack([START])
    setEpoch((n) => n + 1)
  }
  const jump = (index: number) => setStack((s) => s.slice(0, index + 1))

  return (
    <div data-slot="walkthrough" data-route={`${top.screen}${top.id ? `:${top.id}` : ""}`} style={{ display: "contents" }} onClickCapture={onClickCapture} onKeyDownCapture={onKeyDownCapture}>
      <AdminShell key={`${top.screen}:${top.id ?? ""}`} current={SECTION_OF[top.screen]} user={USER} defaultSearchOpen={startSearch} requests={{ count: newCount(requests) }} quotes={{ count: waitingCount(Object.values(quoteWorld.quotes)) }} onSearch={async (q) => searchWorld(q)} profileHref="/admin/profile" helpHref="/admin/help">
        <ToastBridge toastRef={toastRef} later={laterToast} />
        <Strip stack={stack} onJump={jump} onStartOver={startOver} />
        <div key={`${epoch}-${top.screen}-${top.id ?? ""}`}>
          <RouteScreen route={top} rows={rows} onBack={() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))} onOpenJob={(id, visit) => go(visit ? { screen: "job", id, visit } : { screen: "job", id })} onOpenSettings={() => go({ screen: "settings" })} onOpenCustomer={(id) => go({ screen: "customer", id })} onOpenRequest={(id) => go({ screen: "request", id })} onNew={(day) => (go({ screen: "jobs", newJob: true }), day && setSheet((s) => (s ? { ...s, day } : s)))} onNewQuote={() => go({ screen: "quotes", newQuote: true })} onJobCreated={(id, message, mode) => ((laterToast.current = message), go({ screen: mode === "quote" ? "quote" : "job", id }))} />
        </div>
        <NewJobSheet sheet={sheet} onClose={() => setSheet(null)} onMade={() => setMade((n) => n + 1)} onCreated={(id) => go({ screen: "job", id })} onActiveAgain={onActiveAgain} onNewQuote={({ customer, serviceName }) => (setSheet(null), setQuoteSheet({ choice: customer, pick: pickOf(serviceName), key: Date.now() }))} />
        <NewQuoteHost sheet={quoteSheet} onClose={() => setQuoteSheet(null)} onCreated={(id) => (setQuoteSheet(null), go({ screen: "quote", id }))} />
      </AdminShell>
      <ScheduleOverlays store={walkSchedule()} people={WALK_PEOPLE} />
      {receiptToast.toast && <ReceiptToast text={receiptToast.toast.text} onView={() => (openReceipt(receiptToast.toast!.paid), receiptToast.clear())} />}
      {message && <MessageView channel={message.channel} paid={message.paid} onClose={() => setMessage(null)} />}
    </div>
  )
}
