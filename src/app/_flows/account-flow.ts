import type { PortalJobType } from "@/api/v1/portal/schemas"
import { invoicedJob, passJob, repairJob, TODAY } from "@/app/(account)/account/_screens/account-fixtures"
import { canceled, dateMoved, dateSet, invoice, onMyWay, receipt } from "./flow-texts"
import type { FlowText } from "./FlowFrame"

// The account flow's state and rules, pure: which screen is open, the fixture jobs as the customer's actions change them, and the texts sent so far. Each action does what the real
// one does within the fixture: Reschedule moves the visit and texts "moved", Cancel turns a Season Pass visit into a skip (its line canceled) and texts "canceled", Pay settles the invoice.
export type Route = { page: "home" } | { page: "visits" } | { page: "details" } | { page: "visit"; id: string } | { page: "pay"; invoiceId: string } | { page: "paid" } | { page: "receipt" }

export interface AccountState {
  route: Route
  jobs: PortalJobType[]
  times: Record<string, string>
  texts: FlowText[]
  /** the furthest named stage reached, for the strip: reschedule and cancel are sheets, not pages */
  stage: "home" | "visit" | "reschedule" | "cancel" | "canceled" | "pay" | "paid" | "receipt"
  notice: string | null
}

export const initialAccount = (): AccountState => ({ route: { page: "home" }, jobs: [passJob, invoicedJob, repairJob], times: { v1: "10:30" }, texts: [dateSet("2027-04-28", "10:30"), invoice("invoice")], stage: "home", notice: null })

export type AccountAction = { type: "nav"; href: string } | { type: "reschedule"; visitId: string; day: string; start: string } | { type: "cancel"; visitId: string } | { type: "pay" } | { type: "onMyWay" } | { type: "dismiss" }

const mapVisit = (jobs: PortalJobType[], id: string, f: (v: PortalJobType["visits"][number]) => PortalJobType["visits"][number]) => jobs.map((j) => (j.visits.some((v) => v.id === id) ? { ...j, visits: j.visits.map((v) => (v.id === id ? f(v) : v)) } : j))

export function routeOf(href: string, s: AccountState): Route | null {
  const path = href.split("?")[0]!.replace(/^https?:\/\/[^/]+/, "")
  if (path === "/account") return { page: "home" }
  if (path === "/account/visits") return s.stage === "paid" ? { page: "receipt" } : { page: "visits" }
  if (path === "/account/details") return { page: "details" }
  const visit = /^\/account\/visits\/([^/]+)$/.exec(path)
  if (visit) return { page: "visit", id: visit[1]! }
  if (/^\/account\/receipts\//.test(path)) return { page: "receipt" }
  const pay = /^\/pay\/([^/]+)$/.exec(path)
  if (pay) return { page: "pay", invoiceId: pay[1]! }
  return null
}

const stageOf = (r: Route, jobs: PortalJobType[]): AccountState["stage"] => {
  if (r.page === "visit") return jobs.flatMap((j) => j.visits).find((v) => v.id === r.id)?.status === "skipped" ? "canceled" : "visit"
  if (r.page === "pay") return "pay"
  if (r.page === "paid") return "paid"
  if (r.page === "receipt") return "receipt"
  return "home"
}

export function accountReducer(s: AccountState, a: AccountAction): AccountState {
  switch (a.type) {
    case "nav": {
      const route = routeOf(a.href, s)
      if (!route) return { ...s, notice: "That page is outside this flow. Use the account, the visit, the invoice and the receipt." }
      return { ...s, route, notice: null, stage: stageOf(route, s.jobs) }
    }
    case "dismiss":
      return { ...s, notice: null }
    case "reschedule": {
      const jobs = mapVisit(s.jobs, a.visitId, (v) => ({ ...v, scheduledOn: a.day, status: "scheduled" as const }))
      return { ...s, jobs, times: { ...s.times, [a.visitId]: a.start }, texts: [...s.texts, dateMoved(a.day, a.start, `moved-${s.texts.length}`)], stage: "reschedule" }
    }
    case "cancel": {
      const jobs = s.jobs.map((j) => {
        const v = j.visits.find((x) => x.id === a.visitId)
        if (!v) return j
        const lines = j.lines.map((l) => (l.visitId === a.visitId ? { ...l, cancelledAt: `${TODAY}T12:00:00.000Z` } : l))
        const total = lines.filter((l) => !l.cancelledAt).reduce((n, l) => n + l.unitPrice * l.quantity, 0)
        return { ...j, lines, total, money: { ...j.money, owed: total, words: total ? `$${total} unpaid` : "" }, visits: j.visits.map((x) => (x.id === a.visitId ? { ...x, status: "skipped" as const, scheduledOn: null, canceledOn: TODAY, reschedule: "no" as const, cancel: "no" as const, cancelsBy: null } : x)) }
      })
      return { ...s, jobs, texts: [...s.texts, canceled(v1Day(s, a.visitId), `canceled-${s.texts.length}`)], stage: "cancel" }
    }
    case "pay": {
      const jobs = s.jobs.map((j) =>
        j.id !== "job_invoiced" ? j : { ...j, money: { paid: 115, owed: 0, words: "Paid" }, invoices: j.invoices.map((i) => ({ ...i, status: "paid" as const, paidOn: TODAY })), payments: [{ id: "pay_9", visitId: "v4", amount: 115, method: "card_now" as const, reference: null, paidOn: TODAY, refundsPaymentId: null, receiptUrl: "https://pay.stripe.com/receipts/example" }], visits: j.visits.map((v) => ({ ...v, money: { tone: "paid" as const, label: "Paid", paymentIds: ["pay_9"] } })) },
      )
      return { ...s, jobs, route: { page: "paid" }, stage: "paid", texts: [...s.texts, receipt(`receipt-${s.texts.length}`, TODAY)] }
    }
    case "onMyWay": {
      const day = s.jobs.flatMap((j) => j.visits).find((v) => v.id === "v1")?.scheduledOn
      return day ? { ...s, texts: [...s.texts, onMyWay(day, s.times.v1 ?? null, `way-${s.texts.length}`)] } : s
    }
  }
}

const v1Day = (s: AccountState, id: string) => s.jobs.flatMap((j) => j.visits).find((v) => v.id === id)?.scheduledOn ?? null

export const ACCOUNT_STEPS = [
  { key: "home", label: "Home" },
  { key: "visit", label: "Visit" },
  { key: "reschedule", label: "Reschedule" },
  { key: "cancel", label: "Cancel" },
  { key: "canceled", label: "Canceled" },
  { key: "pay", label: "Pay invoice" },
  { key: "paid", label: "Paid" },
  { key: "receipt", label: "Receipt" },
]
