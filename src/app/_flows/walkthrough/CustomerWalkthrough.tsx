"use client"

import { useEffect, useReducer, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { AccountNav } from "@/components/blocks/AccountNav"
import { Button } from "@/components/ui/button"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { fixtureDayTimes } from "@/lib/booking/day-time"
import { serviceFor } from "@/lib/services"
import { andrea, TODAY } from "@/app/(account)/account/_screens/account-fixtures"
import { DetailsScreen } from "@/app/(account)/account/_screens/DetailsScreen"
import { HomeScreen } from "@/app/(account)/account/_screens/HomeScreen"
import { ReceiptScreen } from "@/app/(account)/account/_screens/ReceiptScreen"
import { VisitScreen } from "@/app/(account)/account/_screens/VisitScreen"
import { VisitsScreen } from "@/app/(account)/account/_screens/VisitsScreen"
import { PassPageScreen } from "@/app/(account)/account/pass/_screens/PassPageScreen"
import { CheckoutFlow } from "@/app/(checkout)/season-pass/checkout/_screens/CheckoutFlow"
import { PayScreen } from "@/app/(checkout)/pay/[invoiceId]/_screens/PayScreen"
import PaidPage from "@/app/(checkout)/pay/[invoiceId]/paid/page"
import { accountReducer, initialAccount } from "../account-flow"
import { FlowFrame, TextStrip, type FlowStep } from "../FlowFrame"
import { channelWords, ContactPreference, type ContactChannel } from "./ContactPreference"
import { classifyHref, STEPS, stepOf, type StepKey, type Target, type Where } from "./routes"
import { allMessages, bookingMessages, DEFAULT_FACTS, type TextFacts } from "./walk-texts"
import { WalkBooking, type Booked } from "./WalkBooking"
import { WAYS, type Way } from "./receipt-data"
import { ReceiptSet } from "./ReceiptViews"

// The customer side, one clickable prototype (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 7): Book online, the texts and emails that
// follow, the account (Home, Visits, a visit with Reschedule and Cancel), paying an invoice to its receipt, the Season Pass page and its renewal
// checkout, and Details. The real screens run over fixtures; a link to another of them is caught and opens it here, a link that leaves the
// prototype says so in the strip. The right-hand panel is what she gets by text and email so far. Nothing is sent.

const pass = (snapshot.passes[0] as Pass) && ({ ...(snapshot.passes[0] as Pass), visits: (snapshot.passes[0] as Pass).visits.map((v) => ({ ...v, description: serviceFor(v.kind, (snapshot.passes[0] as Pass).zones)?.description })) } as Pass)
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
const RENEWAL = { passId: "p-last", season: 2028, firstName: "Andrea", lastName: "Anderson", email: "andrea@example.com", phone: "(970) 555-0123", place: { id: "property-1", label: "123 Trailhead Way, Erie, CO", line1: "123 Trailhead Way", town: "Erie", state: "CO", zip: "80516" }, zones: 8, inspection: false, needsCustomerHome: false, accessNote: "", card: { last4: "4242", expires: "2029-08" } }

const LINK_ONE = "/account/visits/v1?t=abc"
const START_HREF: Record<StepKey, string | null> = { book: null, texts: null, account: "/account", visits: "/account/visits", pay: null, receipts: null, pass: null, details: "/account/details" }

function Plain({ title, line, children }: { title: string; line: string; children?: ReactNode }) {
  return (
    <div data-slot="walkthrough-placeholder" className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold text-navy">{title}</h1>
      <section className="mt-4 rounded-lg border border-dashed border-border bg-card p-6">
        <p className="text-sm font-semibold text-navy">Not part of this prototype</p>
        <p className="mt-1 text-base text-muted-foreground">{line}</p>
        {children && <div className="mt-4">{children}</div>}
      </section>
    </div>
  )
}

export function CustomerWalkthrough({ start = "book" }: { start?: Where }) {
  const [run, setRun] = useState(0)
  return <Run key={run} start={start} onStartOver={() => setRun((n) => n + 1)} />
}

function Run({ start, onStartOver }: { start: Where; onStartOver: () => void }) {
  const [s, dispatch] = useReducer(accountReducer, undefined, initialAccount)
  const [where, setWhere] = useState<Where>(start)
  const [placeholder, setPlaceholder] = useState<{ title: string; path: string } | null>(null)
  const [booked, setBooked] = useState<Booked | null>(null)
  const [channel, setChannel] = useState<ContactChannel>("text")
  const [bookRun, setBookRun] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [way, setWay] = useState<Way>("card")
  const [passDay, setPassDay] = useState<"april" | "november">("april")
  // The booking's header and progress bar are fixed to the top of the window; the Flow strip is too, so they are moved down by the strip's own height (it wraps on a phone).
  const screen = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = screen.current
    const strip = el?.closest("[data-slot=flow-frame]")?.querySelector("nav[aria-label=Flow]")
    if (!el || !strip) return
    const set = () => el.style.setProperty("--strip-h", `${strip.getBoundingClientRect().height}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(strip)
    return () => ro.disconnect()
  }, [])

  const facts: TextFacts = booked ? { service: booked.service.toLowerCase(), day: booked.day, start: booked.start, street: booked.street, town: booked.town, firstName: booked.firstName } : DEFAULT_FACTS
  const pref = booked?.channel ?? channel
  const bookTexts = booked ? bookingMessages(facts, pref) : []
  const accountPage = s.route.page

  const go = (target: Target, href: string) => {
    setNotice(null)
    switch (target.where) {
      case "outside":
        return setNotice(`Outside the prototype: ${href}`)
      case "placeholder":
        setPlaceholder({ title: target.title, path: target.path })
        return setWhere("placeholder")
      case "account":
        dispatch({ type: "nav", href: target.href })
        return setWhere("account")
      case "book":
        setBookRun((n) => n + 1)
        return setWhere("book")
      default:
        return setWhere(target.where)
    }
  }
  const open = (href: string) => go(classifyHref(href), href)
  const catchLinks = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as HTMLElement).closest("a[href]")
    const href = a?.getAttribute("href")
    if (!href || href.startsWith("#")) return
    e.preventDefault()
    e.stopPropagation()
    open(href)
  }

  const actions = {
    onReschedule: async (id: string, day: string) => (dispatch({ type: "reschedule", visitId: id, day, start: s.times[id] ?? "10:30" }), { ok: true as const }),
    onRescheduleTime: async (id: string, pick: { day: string; start: string }) => (dispatch({ type: "reschedule", visitId: id, day: pick.day, start: pick.start }), { ok: true as const }),
    onCancel: async (id: string) => (dispatch({ type: "cancel", visitId: id }), { ok: true as const }),
  }
  const route = s.route
  const invoice = s.jobs.flatMap((j) => j.invoices).find((i) => route.page === "pay" && i.id === route.invoiceId)
  const shown = route.page === "visit" ? s.jobs.find((j) => j.visits.some((v) => v.id === route.id)) : undefined
  const bill = { number: invoice?.number ?? "INV-2027-0001", firstName: "Andrea", lines: [{ name: "Repair", description: "One hour on site, parts at cost.", quantity: 1, unitPrice: 115 }], tax: 0, total: 115, dueOn: invoice?.dueOn ?? "2027-12-01", paidOn: null, status: "sent" as const, receiptUrl: null }
  const withNav = (el: ReactNode, at: string) => (
    <div className="bg-cream">
      <AccountNav firstName="Andrea" current={at} />
      {el}
    </div>
  )

  const accountBody = () => {
    switch (route.page) {
      case "visits":
        return withNav(<VisitsScreen customer={andrea} jobs={s.jobs} today={TODAY} times={s.times} />, "/account/visits")
      case "details":
        return withNav(
          <>
            <DetailsScreen customer={andrea} />
            <div className="mx-auto max-w-3xl pb-10 container-padding-x">
              <ContactPreference value={channel} onChange={setChannel} name="details-preference" />
              <p className="mt-2 text-sm text-muted-foreground">{`We reach you by ${channelWords(channel)}.`}</p>
            </div>
          </>,
          "/account/details",
        )
      case "visit":
        return shown ? withNav(<VisitScreen customer={andrea} job={shown} visitId={route.id} today={TODAY} times={s.times} offers={offers.v1} days={[]} {...actions} />, "/account/visits") : null
      case "pay":
        return <PayScreen bill={bill} payAction={async () => void dispatch({ type: "pay" })} />
      case "paid":
        return <PaidPage />
      case "receipt":
        return withNav(<ReceiptScreen receipt={receiptOf} />, "/account/visits")
      default:
        return withNav(<HomeScreen customer={andrea} jobs={s.jobs} today={TODAY} pass={pass} times={s.times} offers={offers} {...actions} />, "/account")
    }
  }

  let body: ReactNode
  switch (where) {
    case "book":
      body = <WalkBooking key={bookRun} onBooked={setBooked} onOpenAccount={() => open("/account")} />
      break
    case "texts":
      body = (
        <div className="mx-auto max-w-md px-4 py-6">
          <h1 className="font-display text-3xl font-semibold text-navy">What she gets</h1>
          <p className="mt-1 text-base text-muted-foreground">{`By ${channelWords(pref)}, with the exact time. Each link opens the page it names.`}</p>
          <div className="mt-4"><TextStrip texts={allMessages(facts, pref)} onLink={open} /></div>
        </div>
      )
      break
    case "receipts": {
      const choice = WAYS.find((w) => w.way === way)!
      body = (
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <h1 className="font-display text-3xl font-semibold text-navy">Receipts</h1>
          <p className="mt-1 text-base text-muted-foreground">What she gets for one payment: a text, an email and the receipt page. Pick how it was paid to read each wording.</p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="How it was paid">
            {WAYS.map((w) => (
              <Button key={w.way} type="button" size="sm" variant={w.way === way ? "default" : "outline"} aria-pressed={w.way === way} onClick={() => setWay(w.way)}>{w.label}</Button>
            ))}
          </div>
          <ReceiptSet key={way} way={way} reference={choice.ref} />
        </div>
      )
      break
    }
    case "pass":
      body = (
        <div className="bg-cream">
          {withNav(
            <>
              <div className="mx-auto flex max-w-3xl gap-2 pt-6 container-padding-x" role="group" aria-label="Today in the prototype">
                <Button type="button" size="sm" variant={passDay === "april" ? "default" : "outline"} onClick={() => setPassDay("april")}>See it in April</Button>
                <Button type="button" size="sm" variant={passDay === "november" ? "default" : "outline"} onClick={() => setPassDay("november")}>See it from November 1</Button>
              </div>
              <PassPageScreen
                key={passDay}
                pass={pass}
                today={passDay === "april" ? "2027-04-14" : "2027-11-02"}
                onAddInspection={() => setNotice("The July inspection is added to your pass. It is charged after the visit.")}
                onSkip={() => setNotice("That visit is skipped. Your pass stays active.")}
                onPickDay={async () => ({ ok: true as const })}
                onCancel={async () => ({ ok: true as const })}
                onChangePreference={() => setNotice("Saved. We will use that timing.")}
              />
            </>,
            "/account/pass",
          )}
        </div>
      )
      break
    case "renew":
      body = <CheckoutFlow season={2028} today="2027-11-05" renewal={RENEWAL} onDone={() => open("/account/pass")} />
      break
    case "placeholder":
      body = (
        <Plain title={placeholder?.title ?? "Your Trailhead account"} line={`${placeholder?.path ?? "That page"} is a screen the customer side does not have in this prototype.`}>
          <Button type="button" variant="outline" onClick={() => open("/account")}>Back to your Trailhead account</Button>
        </Plain>
      )
      break
    default:
      body = accountBody()
  }

  const current: StepKey | null = stepOf(where, accountPage)
  const steps: FlowStep[] = STEPS.map(({ key, label }) => ({ key, label }))
  const at = current ? STEPS.findIndex((x) => x.key === current) : -1
  const nextStep = STEPS[at + 1]
  const jump = (key: StepKey) => {
    if (key === "book") return go({ where: "book" }, "/booking")
    if (key === "texts") return go({ where: "texts" }, "")
    if (key === "receipts") return go({ where: "receipts" }, "")
    if (key === "pass") return go({ where: "pass" }, "/account/pass")
    if (key === "pay") {
      const id = s.jobs.flatMap((j) => j.invoices)[0]?.id ?? "inv_1"
      return open(`/pay/${id}`)
    }
    open(START_HREF[key]!)
  }
  const jumpBar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jump to a step">
        {STEPS.map((x) => (
          <Button key={x.key} type="button" size="sm" variant={x.key === current ? "secondary" : "ghost"} onClick={() => jump(x.key)}>{x.label}</Button>
        ))}
      </div>
    </div>
  )
  void LINK_ONE

  return (
    <FlowFrame
      steps={steps}
      current={current ?? "none"}
      onStartOver={onStartOver}
      texts={[...bookTexts, ...s.texts]}
      onLink={open}
      actions={jumpBar}
      notice={
        <div data-slot="walkthrough-next" className="flex items-center justify-between gap-3 border-b border-border bg-stone px-4 py-2 text-sm">
          <p role="status" className="min-w-0 flex-1 text-foreground">
            {notice ? (
              <>
                {notice}{" "}
                <button type="button" className="underline" onClick={() => setNotice(null)}>Dismiss</button>
              </>
            ) : (
              "Click through the screen, or go on."
            )}
          </p>
          {nextStep && <Button type="button" size="sm" className="shrink-0" onClick={() => jump(nextStep.key)}>{`Next: ${nextStep.label}`}</Button>}
        </div>
      }
    >
      <div ref={screen} data-slot="flow-screen" className="[&_[data-slot=flow-shell]>header]:top-[calc(var(--strip-h,0px)+0.25rem)] [&_[data-slot=flow-shell]_[role=progressbar]]:top-[var(--strip-h,0px)]" data-where={where} data-page={where === "account" ? accountPage : undefined} onClickCapture={catchLinks}>
        {body}
      </div>
    </FlowFrame>
  )
}
