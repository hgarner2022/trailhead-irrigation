"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { BookingReview } from "@/components/blocks/BookingReview"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import { FlowShell } from "@/components/blocks/FlowShell"
import type { PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ServicePicker } from "@/components/blocks/ServicePicker"
import { fixtureDayTimes, startDay, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { bookingEntries, visitMinutes } from "@/lib/booking/pass-entry"
import { exactVisits, passPlanFor, preferenceOfDay, preferenceVisits } from "@/lib/booking/pass-visits"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import type { TimingPreference } from "@/lib/admin/types"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { fixturePlaces } from "@/lib/places/fixture"
import { AddressStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { useCheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/use-checkout-state"
import { BookingCard } from "./booking-card"
import { BookingBooked, type BookedPass } from "./booking-booked"
import { BookingContact } from "./booking-contact"
import { BookingPass } from "./booking-pass"
import { DayTimeGroups, type DayGroup } from "./booking-day"
import { BookingDetails, QuoteDetails } from "./booking-details"
import { bookedPassOf } from "./booking-pass-model"
import { PreferenceGroups, VISIT_HEADINGS, preferenceQuestion } from "./booking-preference"
import { StepProblems } from "./booking-problems"
import type { BookingFormProps } from "./booking-form-types"
import { useStepHistory } from "./use-step-history"
import { ACTIONS, CONFIRM_BOOK, CONFIRM_PASS, DAY_HINT, NO_EXTRAS, QUESTIONS, QUOTE_QUESTIONS, SEND_REQUEST, SERVICE_HINT, areaState, callbackMode, canContinue, cardWords, hasEntries, happensWords, problemList, reviewRows, stepTotal, stepsFor, townOf, type CardChoice, type Extras, type FormStep } from "./booking-form-model"

// The customer's booking form (docs/plans/2026-11-19-booking-form-design.md), one question per screen on the FlowShell. It opens on the address, the checkout's type-ahead with its typed fallback
// (Hannah, Nov 20 2026: no zip step, the address qualifies the yard; the city and zip come from the chosen address and an address outside the six cities stops at once with the way out), then the
// services with their lengths, the service details (zones with the price, access, the questions that belong to the service, a note, photos), the day and an exact start time from the open slots,
// and only then who we reach (and how: text, email or both, asked once) with the terms, so an abandoned booking leaves nothing; then a card (Stripe's setup form, drawn), a confirm step that says what
// happens, then the booked card. A service we quote is the address, services, "Tell Ryan about it" and contact ("Send to Ryan") with no day, no card and no confirm. Navigation (docs/plans/2026-11-19-booking-
// form-design.md, "Navigation, second pass"): Back is the one way back and is the browser's Back; there is no summary of answers over the steps; the only Change links are on the confirm step, and a Change
// there returns to the confirm step when the customer continues. Close at the top right asks only once something is entered; the heading takes focus and the page title follows each step; a failed
// Continue puts a summary at the top and focus on the first bad field. Nothing is sent, and nothing is kept before the contact step is submitted.

export type { Booked, BookingFormProps, BookingProgress, Requested } from "./booking-form-types"

const addDay = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10)
const TYPING = new Set(["text", "email", "tel", "radio"])

export function BookingForm({ entries = SERVICES, today = "2027-04-14", initial = {}, offersFor = (_k, m, t, from) => fixtureDayTimes(m, t ?? "Erie", from), places = fixturePlaces, onBooked, onRequested, onOpenAccount, onStep }: BookingFormProps) {
  const [fields, dispatch] = useCheckoutState({ today, ...initial.fields })
  const [quote, setQuote] = useState(initial.quote ?? false)
  const [serviceKey, setServiceKey] = useState<string | null>(initial.service ?? null)
  // The list for the date: the Season Pass holds only the visits still ahead, and a single turn-on or blowout opens by the same windows.
  const listed = useMemo(() => bookingEntries(entries, today), [entries, today])
  const service = [...listed, ...QUOTE_SERVICES].find((e) => e.key === serviceKey) ?? null
  const plan = useMemo(() => (service?.kind === "pass" ? passPlanFor(today) : null), [service, today])
  const steps = stepsFor(service, quote, plan)
  const [step, setStep] = useState<FormStep>(initial.step ?? "address")
  const [attempted, setAttempted] = useState(initial.attempted ?? false)
  const [presses, setPresses] = useState(initial.attempted ? 1 : 0)
  const [picks, setPicks] = useState<Record<string, DayTimePick>>(initial.picks ?? {})
  const [when, setWhen] = useState(initial.when ?? "")
  const [prefs, setPrefs] = useState<Record<string, TimingPreference>>(initial.prefs ?? {})
  const [channel, setChannel] = useState<ContactChannel>(initial.channel ?? "text")
  const [photos, setPhotos] = useState<PickedPhoto[]>(initial.photos ?? [])
  const [extras, setExtras] = useState<Extras>({ ...NO_EXTRAS, ...initial.extras })
  const [leaving, setLeaving] = useState(initial.leaving ?? false)
  const [card, setCard] = useState<CardChoice>(initial.card ?? null)
  // The customer pressed Change on the confirm step: Continue takes them straight back to it.
  const [fromConfirm, setFromConfirm] = useState(false)
  const [addressTyped, setAddressTyped] = useState(false)
  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const town = townOf(fields)
  const first = useRef(true)
  const leaveLink = useRef<HTMLAnchorElement>(null)

  const groups: DayGroup[] = useMemo(() => {
    if (!service || service.kind === "quote") return []
    const tomorrow = addDay(today, 1)
    // A pass asks a day only for a visit that is open now: its own length, and days from tomorrow or the day its window opens, to the day it closes.
    if (plan) return exactVisits(plan).map((v) => ({ key: v.kind, heading: VISIT_HEADINGS[v.kind], minutes: visitMinutes(v.kind), offers: offersFor(v.kind, visitMinutes(v.kind), town, v.opens > tomorrow ? v.opens : tomorrow).filter((o) => o.day <= v.closes) }))
    const minutes = service.minutes ?? 60
    return [{ key: "visit", minutes, offers: offersFor("visit", minutes, town, tomorrow) }]
  }, [service, plan, town, today, offersFor])
  // The best day starts selected on each visit; a time is never selected for the customer.
  const heldPicks = Object.fromEntries(groups.map((g) => [g.key, picks[g.key] ?? { day: startDay(g.offers), start: null }]))
  // The preference is kept per visit kind for every season: asked for a visit with no day, and for a kind booked exactly it starts as the part of the window of the day picked.
  const heldPrefs = Object.fromEntries(
    (plan?.visits ?? []).map((v) => {
      const day = heldPicks[v.kind]?.day
      return [v.kind, v.mode === "exact" ? (day ? preferenceOfDay(v, day) : "recommended") : (prefs[v.kind] ?? "recommended")]
    }),
  ) as Record<string, TimingPreference>
  const answers = { service, fields, addressTyped, picks: heldPicks, offers: Object.fromEntries(groups.map((g) => [g.key, g.offers as DayTimeOffer[]])), when, prefs: heldPrefs }
  const valid = canContinue(step, answers)
  const callback = !quote && callbackMode(answers)
  const at = steps.indexOf(step)
  const done = step === "done"
  const total = stepTotal(steps)
  const pick = heldPicks.visit
  const street = fields.place?.line1 ?? fields.address
  const problems = attempted && !valid ? problemList(step, answers) : []
  const dirty = hasEntries({ service, fields, when, photos: photos.length })

  // One browser-history entry per step: the phone's Back button goes to the previous step and never out of the form.
  const history = useStepHistory(step, setStep, done)
  const go = (to: FormStep) => {
    setAttempted(false)
    history.push(to)
  }
  // A Change link on the confirm step: the step opens with the answer in it, and Continue returns to the confirm step (GOV.UK check answers). Changing the address or the service changes what comes
  // after it, so those go on step by step.
  const change = (to: FormStep) => {
    setFromConfirm(to !== "address" && to !== "service" && to !== "quote-service")
    go(to)
  }

  useEffect(() => {
    onStep?.({ step, steps, quote, service, address: street, town, firstName: fields.firstName, email: fields.email, pick })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, serviceKey, quote])
  // Every step change moves focus to the heading and names the page for a screen reader; nothing moves on the first render.
  const heading = (done ? (quote || callback ? "Request sent" : service?.kind === "pass" ? "Set up" : "Booked") : step === "preference" && plan ? preferenceQuestion(preferenceVisits(plan)) : ((quote ? QUOTE_QUESTIONS[step] : undefined) ?? QUESTIONS[step])) as string
  useEffect(() => {
    const before = document.title
    document.title = done ? `${heading} | Trailhead Lawn & Irrigation` : `${heading} Step ${at + 1} of ${total} | Book online | Trailhead Lawn & Irrigation`
    return () => void (document.title = before)
  }, [heading, at, total, done])
  useEffect(() => {
    if (step === "confirm") setFromConfirm(false)
    if (first.current) return void (first.current = false)
    window.scrollTo?.(0, 0)
    document.getElementById("flow-heading")?.focus({ preventScroll: true })
  }, [step])
  // A Continue that could not pass puts focus on the first field that is wrong, or on the summary when no field can take it.
  useEffect(() => {
    if (presses === 0 || valid) return
    const surface = document.querySelector("[data-slot=flow-surface]")
    ;(surface?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? document.getElementById("step-problems"))?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presses])
  useEffect(() => {
    if (step === "done" && quote && service) {
      onRequested?.({ serviceKey: service.key, serviceName: service.name, firstName: fields.firstName, lastName: fields.lastName, phone: fields.phone, email: fields.email, channel, street: street || "", town: town ?? "", words: fields.accessNote.trim(), photos })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  useEffect(() => {
    if (step === "done" && !quote && !callback && service && pick?.day && pick.start) {
      onBooked?.({ service: service.name, day: pick.day, start: pick.start, street: street || "480 Briggs St", town: town ?? "Erie", firstName: fields.firstName || "Andrea", email: fields.email, phone: fields.phone, channel, photos: photos.length, marketing: fields.marketingEmail, card: cardWords(card) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const next = () => {
    if (!valid) {
      setAttempted(true)
      return setPresses((n) => n + 1)
    }
    if (step === "card") setCard("saved")
    go(fromConfirm ? "confirm" : steps[Math.min(at + 1, steps.length - 1)]!)
  }
  // "Not now" on the card step, for a one-off only: no card is kept and the form goes on.
  const skipCard = () => {
    setCard("skipped")
    go(steps[Math.min(at + 1, steps.length - 1)]!)
  }
  // Back is the browser's Back: the same step the phone's Back button would show. With nothing behind it in this form, it goes to the step before.
  const back = () => {
    setAttempted(false)
    if (!history.back()) setStep(steps[Math.max(at - 1, 0)]!)
  }
  const choose = (key: string) => {
    setServiceKey(key)
    setPicks({})
    setPrefs({})
    setExtras(NO_EXTRAS)
  }
  const startQuote = () => {
    setQuote(true)
    setServiceKey(null)
    go("quote-service")
  }
  const addPhotos = (p: PickedPhoto[]) => setPhotos((prev) => [...prev, ...p.filter((x) => !prev.some((y) => y.name === x.name))])
  // Enter moves on from a one-line field or a chosen card on any step; never from a button, a box, a textarea or the address list.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = e.target as HTMLInputElement
    if (e.key !== "Enter" || e.defaultPrevented || el.tagName !== "INPUT" || !TYPING.has(el.type) || el.getAttribute("role") === "combobox" || done) return
    e.preventDefault()
    next()
  }

  const bookedPass: BookedPass | undefined = service?.kind === "pass" && plan ? bookedPassOf(service.name, plan, heldPicks, heldPrefs) : undefined
  const confirmLabel = quote || callback ? SEND_REQUEST : service?.kind === "pass" ? CONFIRM_PASS : CONFIRM_BOOK
  const label = step === "confirm" ? confirmLabel : step === "contact" && quote ? SEND_REQUEST : step === "card" && card === "saved" ? "Continue" : (ACTIONS[step] ?? "Continue")
  // Continue is off only where the screen says why: a choice not yet made (service, a start time) or a dead end (an address we do not serve). Everywhere else it stays on and a press names what is missing.
  const area = areaState(fields.place)
  const deadEnd = step === "address" && area === "outside"
  const off = !valid && (deadEnd || step === "service" || step === "quote-service" || step === "day")
  const hint = step === "day" ? DAY_HINT : step === "service" || step === "quote-service" ? SERVICE_HINT : undefined
  const outsideArea = step === "address" && area === "outside"

  let body: React.ReactNode
  switch (step) {
    case "service":
    case "quote-service":
      body = <ServicePicker entries={quote ? QUOTE_SERVICES : listed} value={serviceKey} onChange={choose} onRequestQuote={quote ? undefined : startQuote} />
      break
    case "address":
      body = (
        <>
          <AddressStep state={fields} attempted={attempted} places={places} showAccess={false} onTypedChange={setAddressTyped} onType={(text) => dispatch({ type: "typeAddress", text })} onPick={(place) => dispatch({ type: "pickPlace", place })} set={set} />
          {outsideArea && (
            <p data-slot="address-help" className="mt-4 text-base text-muted-foreground">
              {"Not sure? Call Ryan at "}
              <a href={PHONE_TEL} className="font-semibold text-primary-deep underline underline-offset-2">
                {PHONE_DISPLAY}
              </a>
              .
            </p>
          )}
        </>
      )
      break
    case "details": {
      const shared = { note: fields.accessNote, onNote: (t: string) => set("accessNote", t), photos, onAddPhotos: addPhotos, onRemovePhoto: (n: string) => setPhotos((prev) => prev.filter((p) => p.name !== n)) }
      body = quote || !service ? <QuoteDetails {...shared} /> : <BookingDetails service={service} plan={plan} zones={fields.zones} onZones={(n) => set("zones", n)} access={fields.access} onAccess={(a) => set("access", a)} attempted={attempted} extras={extras} onExtras={setExtras} {...shared} />
      break
    }
    case "day":
      body = <DayTimeGroups groups={groups} picks={heldPicks} onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))} note={when} onNote={setWhen} />
      break
    case "preference":
      body = plan && <PreferenceGroups visits={preferenceVisits(plan)} prefs={heldPrefs} onPref={(k, p) => setPrefs((prev) => ({ ...prev, [k]: p }))} />
      break
    case "pass":
      body = <BookingPass />
      break
    case "card":
      body = <BookingCard saved={card === "saved"} pass={service?.kind === "pass"} onSkip={skipCard} />
      break
    case "contact":
      body = (
        <>
          <BookingContact fields={fields} set={set} channel={channel} onChannel={setChannel} attempted={attempted} terms={!quote} />
          {quote && (
            <p data-slot="quote-happens" className="mt-8 text-base text-foreground">
              {happensWords({ channel, phone: fields.phone, email: fields.email, quote: true, callback: false })}
            </p>
          )}
        </>
      )
      break
    case "confirm":
      body = service && (
        <BookingReview
          rows={reviewRows({ service, fields, town, pick, plan, picks: heldPicks, prefs: heldPrefs, when, callback, channel, photos: photos.length, quote, extras, card, go: change })}
          happens={happensWords({ channel, phone: fields.phone, email: fields.email, quote, callback, pass: service.kind === "pass" })}
        />
      )
      break
    default:
      body = <BookingBooked service={service?.name ?? "Visit"} where={[street, town].filter(Boolean).join(", ")} channel={channel} phone={fields.phone} email={fields.email} pick={quote || callback ? undefined : pick} photos={photos.length} callback={callback} quote={quote} onOpenAccount={onOpenAccount} pass={bookedPass} card={cardWords(card)} />
  }

  return (
    <div onKeyDown={onKeyDown}>
      <FlowShell
        question={heading}
        step={Math.min(at + 1, total)}
        total={total}
        notice={<StepProblems problems={problems} />}
        onBack={back}
        onNext={next}
        nextLabel={label}
        nextDisabled={off}
        hint={hint}
        done={done}
        onClose={dirty && !done ? () => setLeaving(true) : undefined}
      >
        {body}
      </FlowShell>
      {/* Where Close goes once the customer has said so; a link, so the host can catch it. */}
      <Link ref={leaveLink} href="/" tabIndex={-1} aria-hidden className="sr-only">
        Back to the website
      </Link>
      <ConfirmDialog
        title="Leave without booking?"
        message="Your answers aren't saved."
        confirmLabel="Leave"
        dismissLabel="Keep booking"
        open={leaving}
        onOpenChange={setLeaving}
        onConfirm={async () => {
          leaveLink.current?.click()
          return { ok: true }
        }}
      />
    </div>
  )
}
