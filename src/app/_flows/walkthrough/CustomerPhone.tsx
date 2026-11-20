"use client"

import { useEffect, useReducer, useState, type MouseEvent, type ReactNode } from "react"
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
import { channelWords, ContactPreference, type ContactChannel } from "./ContactPreference"
import { classifyHref, STEPS, stepOf, type StepKey, type Target, type Where } from "./routes"

import { allMessages, DEFAULT_FACTS, type TextFacts } from "./walk-texts"
import { PhoneInbox } from "./PhoneInbox"
import { MarketingSwitches } from "./MarketingSwitches"
import { MARKETING_MAIL, readChoice, writeChoice } from "./marketing-choice"
import { clearSent, writeSent } from "./request-bridge"
import { QuoteWalk } from "./QuoteWalk"
import { BookingForm, type Booked } from "@/app/(booking)/booking/_screens/BookingForm"
import { WAYS, type Way } from "./receipt-data"
import { ReceiptSet } from "./ReceiptViews"
import { LiveScreen } from "./LiveScreens"

// The customer side, one clickable prototype (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 7): Book online, the texts and emails that
// follow, the account (Home, Visits, a visit with Reschedule and Cancel), paying an invoice to its receipt, the Season Pass page and its renewal
// checkout, and Details. The real screens run over fixtures; a link to another of them is caught and opens it here, a link that leaves the
// prototype says so in the strip. Nothing is sent.

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

const START_HREF: Record<StepKey, string | null> = { book: null, texts: null, account: "/account", visits: "/account/visits/v1", pay: null, receipts: null, pass: null, details: "/account/details", quote: null }

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

/** The customer's phone: the real screens at their own width, with no frame of its own. When it sits in the presentation's frame it reports the lit step and obeys Back, Next, a step and Start over by message. */
export function CustomerPhone({ start = "book" }: { start?: Where }) {
  const [run, setRun] = useState(0)
  return <Run key={run} start={start} onStartOver={() => setRun((n) => n + 1)} />
}

function Run({ start, onStartOver }: { start: Where; onStartOver: () => void }) {
  const [s, dispatch] = useReducer(accountReducer, undefined, initialAccount)
  const [where, setWhere] = useState<Where>(start)
  const [placeholder, setPlaceholder] = useState<{ title: string; path: string } | null>(null)
  const [booked, setBooked] = useState<Booked | null>(null)
  const [channel, setChannel] = useState<ContactChannel>("text")
  // Marketing is off until the customer says so: by the box in the booking, or the switches in Details. The admin walkthrough reads the same choice.
  const [marketing, setMarketing] = useState<{ email: boolean; text: boolean }>(() => {
    writeChoice({})
    // a request sent from the booking form on an earlier run is forgotten with the rest
    clearSent()
    return { email: false, text: false }
  })
  const choose = (kind: "email" | "text", on: boolean) => {
    setMarketing((m) => ({ ...m, [kind]: on }))
    writeChoice({ ...readChoice(), [kind]: on })
    setNotice(`Marketing ${kind === "email" ? "emails" : "texts"} ${on ? "on" : "off"}`)
  }
  const [bookRun, setBookRun] = useState(0)
  // a link to a live screen already open (Use a different email, on the sent note) starts it again
  const [liveRun, setLiveRun] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [way, setWay] = useState<Way>("card")
  const [passDay, setPassDay] = useState<"april" | "november">("april")
  const facts: TextFacts = booked ? { service: booked.service.toLowerCase(), day: booked.day, start: booked.start, street: booked.street, town: booked.town, firstName: booked.firstName } : DEFAULT_FACTS
  const pref = booked?.channel ?? channel
  const accountPage = s.route.page

  const go = (target: Target, href: string) => {
    setNotice(null)
    switch (target.where) {
      case "outside":
        return setNotice(href.startsWith("tel:") || href.startsWith("mailto:") ? "That link calls or emails Trailhead. It does nothing in the prototype." : "That link leaves the prototype.")
      case "placeholder":
        setPlaceholder({ title: target.title, path: target.path })
        return setWhere("placeholder")
      case "account":
        dispatch({ type: "nav", href: target.href })
        return setWhere("account")
      case "book":
        setBookRun((n) => n + 1)
        return setWhere("book")
      case "sign-in":
      case "card-updated":
      case "season-pass-page":
        setLiveRun((n) => n + 1)
        return setWhere(target.where)
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
              <MarketingSwitches email={marketing.email} text={marketing.text} onEmail={(on) => choose("email", on)} onText={(on) => choose("text", on)} />
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
      body = <BookingForm key={bookRun} onRequested={(r) => writeSent({ id: `rq-sent-${Date.now().toString(36)}`, at: new Date().toISOString(), first: r.firstName, last: r.lastName, phone: r.phone, email: r.email, contact: r.channel, street: r.street, town: r.town, serviceKey: r.serviceKey, serviceName: r.serviceName, words: r.words, photos: r.photos.map((p) => ({ name: p.name, src: p.src })) })} onBooked={(b) => (setBooked(b), b.marketing && (setMarketing((m) => ({ ...m, email: true })), writeChoice({ ...readChoice(), email: true })))} onOpenAccount={() => open("/account")} />
      break
    case "quote":
      body = <QuoteWalk onOpenLink={open} />
      break
    case "texts":
      body = <PhoneInbox texts={[...allMessages(facts, pref), ...(marketing.email ? [MARKETING_MAIL] : [])]} onLink={open} onUnsubscribe={() => choose("email", false)} />
      break
    case "receipts": {
      const choice = WAYS.find((w) => w.way === way)!
      body = (
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <h1 className="font-display text-3xl font-semibold text-navy">Your receipt</h1>
          <p className="mt-1 text-base text-muted-foreground">You get a text, an email and a receipt page for one payment. Pick how it was paid to read each wording.</p>
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
    case "sign-in":
    case "card-updated":
    case "season-pass-page":
      body = <LiveScreen key={`${where}-${liveRun}`} which={where} onBack={() => open("/account")} onNotice={setNotice} />
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
  const at = current ? STEPS.findIndex((x) => x.key === current) : -1
  const jump = (key: StepKey) => {
    if (key === "book") return go({ where: "book" }, "/booking")
    if (key === "texts") return go({ where: "texts" }, "")
    if (key === "receipts") return go({ where: "receipts" }, "")
    if (key === "quote") return go({ where: "quote" }, "")
    if (key === "pass") return go({ where: "pass" }, "/account/pass")
    if (key === "pay") {
      const id = s.jobs.flatMap((j) => j.invoices)[0]?.id ?? "inv_1"
      return open(`/pay/${id}`)
    }
    open(START_HREF[key]!)
  }

  // The presentation around the phone asks for Back, Next, a step or Start over, and is told which step is lit: derived from the screen, never held apart.
  const stepKey = current ?? "none"
  useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({ walk: "state", step: stepKey }, "*")
  }, [stepKey])
  useEffect(() => {
    const onMessage = (e: globalThis.MessageEvent) => {
      const m = e.data as { walk?: string; cmd?: string; step?: StepKey } | null
      if (m?.walk !== "cmd") return
      if (m.cmd === "reset") onStartOver()
      else if (m.cmd === "go" && m.step) jump(m.step)
      else if (m.cmd === "next" && STEPS[at + 1]) jump(STEPS[at + 1]!.key)
      else if (m.cmd === "back" && at > 0) jump(STEPS[at - 1]!.key)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  })

  return (
    <div data-slot="flow-screen" data-where={where} data-page={where === "account" ? accountPage : undefined} data-step={stepKey} onClickCapture={catchLinks} className="min-h-svh bg-cream">
      {notice && (
        <p role="status" className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-navy px-4 py-2 text-sm text-white">
          {notice}
          <button type="button" className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </p>
      )}
      {body}
          </div>
  )
}

