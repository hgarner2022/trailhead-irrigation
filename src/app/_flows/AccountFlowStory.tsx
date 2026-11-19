"use client"

import { useReducer, useState, type MouseEvent } from "react"
import { AccountNav } from "@/components/blocks/AccountNav"
import { Button } from "@/components/ui/button"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { fixtureDayTimes } from "@/lib/booking/day-time"
import { andrea, TODAY } from "@/app/(account)/account/_screens/account-fixtures"
import { DetailsScreen } from "@/app/(account)/account/_screens/DetailsScreen"
import { HomeScreen } from "@/app/(account)/account/_screens/HomeScreen"
import { ReceiptScreen } from "@/app/(account)/account/_screens/ReceiptScreen"
import { VisitScreen } from "@/app/(account)/account/_screens/VisitScreen"
import { VisitsScreen } from "@/app/(account)/account/_screens/VisitsScreen"
import { PayScreen } from "@/app/(checkout)/pay/[invoiceId]/_screens/PayScreen"
import PaidPage from "@/app/(checkout)/pay/[invoiceId]/paid/page"
import { ACCOUNT_STEPS, accountReducer, initialAccount } from "./account-flow"
import { FlowFrame } from "./FlowFrame"

// The account as one clickable story: Home with a booked visit, the visit, Reschedule (a day and a time, confirm), Home with the new time, Cancel (reason, confirm) and the canceled page;
// and the invoice on Home through the pay page and "paid" to the receipt. The real screens run over fixtures; a link to another account page is caught and opens that page here, and each
// action changes the fixture the way the real one would and texts her. Nothing is sent.
const pass = snapshot.passes[0] as Pass
const offers = { v1: fixtureDayTimes(60) }

const receiptOf = {
  id: "pay_9",
  business: { name: "Trailhead Lawn & Irrigation LLC", phone: "(970) 692-7270" },
  customerName: "Andrea Lopez",
  address: "412 Briggs Street",
  jobName: "Repair",
  lines: [{ name: "Repair", quantity: 1, unitPrice: 115 }],
  amount: 115,
  method: "card_now" as const,
  reference: null,
  paidOn: TODAY,
  receiptUrl: "https://pay.stripe.com/receipts/example",
}

export function AccountFlowStory() {
  const [run, setRun] = useState(0)
  return <Run key={run} onStartOver={() => setRun((n) => n + 1)} />
}

function Run({ onStartOver }: { onStartOver: () => void }) {
  const [s, dispatch] = useReducer(accountReducer, undefined, initialAccount)
  const nav = (href: string) => dispatch({ type: "nav", href })
  const actions = {
    onReschedule: async (id: string, day: string) => (dispatch({ type: "reschedule", visitId: id, day, start: s.times[id] ?? "10:30" }), { ok: true as const }),
    onRescheduleTime: async (id: string, pick: { day: string; start: string }) => (dispatch({ type: "reschedule", visitId: id, day: pick.day, start: pick.start }), { ok: true as const }),
    onCancel: async (id: string) => (dispatch({ type: "cancel", visitId: id }), { ok: true as const }),
  }
  // A link to another page of the account or the pay page opens it in the flow instead of leaving the story.
  const catchLinks = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[href]")
    const href = a?.getAttribute("href")
    if (!href || !/^\/(account|pay|book)/.test(href)) return
    e.preventDefault()
    e.stopPropagation()
    nav(href)
  }
  const { route } = s
  const invoice = s.jobs.flatMap((j) => j.invoices).find((i) => route.page === "pay" && i.id === route.invoiceId)
  const job = s.jobs.find((j) => j.id === "job_invoiced")!
  const bill = { number: invoice?.number ?? "INV-2027-0001", firstName: "Andrea", lines: [{ name: "Repair", description: "One hour on site, parts at cost.", quantity: 1, unitPrice: 115 }], tax: 0, total: 115, dueOn: invoice?.dueOn ?? "2027-12-01", paidOn: null, status: "sent" as const, receiptUrl: null }
  const shown = route.page === "visit" ? s.jobs.find((j) => j.visits.some((v) => v.id === route.id)) : undefined
  const canceledNow = route.page === "visit" && shown?.visits.find((v) => v.id === route.id)?.status === "skipped"
  const current = canceledNow ? "canceled" : s.stage

  let body: React.ReactNode
  const withNav = (el: React.ReactNode, at: string) => (
    <div className="bg-cream">
      <AccountNav firstName="Andrea" current={at} />
      {el}
    </div>
  )
  switch (route.page) {
    case "visits":
      body = withNav(<VisitsScreen customer={andrea} jobs={s.jobs} today={TODAY} times={s.times} />, "/account/visits")
      break
    case "details":
      body = withNav(<DetailsScreen customer={andrea} />, "/account/details")
      break
    case "visit":
      body = shown ? withNav(<VisitScreen customer={andrea} job={shown} visitId={route.id} today={TODAY} times={s.times} offers={offers.v1} days={[]} {...actions} />, "/account/visits") : null
      break
    case "pay":
      body = <PayScreen bill={bill} payAction={async () => void dispatch({ type: "pay" })} />
      break
    case "paid":
      body = <PaidPage />
      break
    case "receipt":
      body = withNav(<ReceiptScreen receipt={receiptOf} />, "/account/visits")
      break
    default:
      body = withNav(<HomeScreen customer={andrea} jobs={s.jobs} today={TODAY} pass={pass} times={s.times} offers={offers} {...actions} />, "/account")
  }
  void job
  const hasV1 = s.jobs.flatMap((j) => j.visits).some((v) => v.id === "v1" && v.status === "scheduled")
  return (
    <FlowFrame
      steps={ACCOUNT_STEPS}
      current={current}
      onStartOver={onStartOver}
      texts={s.texts}
      onLink={nav}
      actions={
        hasV1 && (
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "onMyWay" })}>
            Preview: Ryan taps On my way
          </Button>
        )
      }
      notice={
        s.notice && (
          <p role="status" className="flex items-center justify-between gap-3 bg-navy px-4 py-2 text-sm text-white">
            {s.notice}
            <button type="button" className="underline" onClick={() => dispatch({ type: "dismiss" })}>
              Dismiss
            </button>
          </p>
        )
      }
    >
      <div data-slot="flow-screen" onClickCapture={catchLinks}>
        {body}
      </div>
    </FlowFrame>
  )
}
