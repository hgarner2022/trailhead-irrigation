"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { BookingReview } from "@/components/blocks/BookingReview"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import { FlowShell } from "@/components/blocks/FlowShell"
import type { PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ServicePicker } from "@/components/blocks/ServicePicker"
import { fixtureCalendarDays, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { passPlanFor, preferenceVisits } from "@/lib/booking/pass-visits"
import { fixtureRecognise } from "@/lib/booking/returning"
import { CATALOGUE, bookableOf, quotableOf } from "@/lib/booking/services"
import type { TimingPreference } from "@/lib/admin/types"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { fixturePlaces } from "@/lib/places/fixture"
import { AddressStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address"
import type { TypedValues } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address-typed"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { useCheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/use-checkout-state"
import { BookingCard } from "./booking-card"
import { BookingBooked, type BookedPass } from "./booking-booked"
import { BookingContact } from "./booking-contact"
import { CalendarGroups } from "./booking-day"
import { QuoteDetails, ServicePanel } from "./booking-details"
import { dayGroups, heldPicksOf, heldPrefsOf, type OffersFor } from "./booking-groups"
import { bookedPassOf } from "./booking-pass-model"
import { PreferenceGroups, preferenceQuestion } from "./booking-preference"
import { StepProblems } from "./booking-problems"
import { ReturningBlock } from "./booking-returning"
import type { BookingFormProps } from "./booking-form-types"
import { useReturning } from "./use-returning"
import { useStepHistory } from "./use-step-history"
import { ACTIONS, CONFIRM_BOOK, CONFIRM_PASS, DAY_HINT, NO_EXTRAS, QUESTIONS, QUOTE_QUESTIONS, SEND_REQUEST, SERVICE_HINT, areaState, callbackMode, canContinue, cardWords, hasEntries, happensWords, problemList, reviewRows, stepTotal, stepsFor, townOf, type CardChoice, type Extras, type FormStep } from "./booking-form-model"

// The customer's booking form (docs/plans/2026-11-19-booking-form-design.md), one question per screen on the FlowShell, every heading a plain name: Address, Service, Day, Contact, Card, Review. It opens on the
// address, the type-ahead box (the checkout's: typed fields only after a search finds nothing, the ZIP decides the area), then the service: one card per service that opens in place and holds what is
// included, the zones with the price, the questions that belong to it, access, a note and photos, so a booking has no details step (Hannah, Nov 22 2026); on a single turn-on or blowout the open card also offers
// "Make it a Season Pass". Then the day as a calendar with the soonest open day selected and an exact start time, and only then who we reach (a returning customer verifies by a link before any saved detail is shown),
// so an abandoned booking leaves nothing; then a card (Stripe's setup form, drawn), a review that says what happens, then the booked card. A service we quote is the address, services, "Details" and contact
// ("Send to Ryan") with no day, no card and no review. Back is the one way back and is the browser's Back; the only Change links are on the review step, and a Change there returns to it. Close asks only once
// something is entered. Nothing is sent, and nothing is kept before the contact step is submitted.

export type { Booked, BookingFormProps, BookingProgress, Requested } from "./booking-form-types"

const TYPING = new Set(["text", "email", "tel", "radio"])
const PASS_KEY = "season-pass"
const SINGLE_PASS = new Set(["spring-turn-on", "fall-blowout"])
const defaultOffers: OffersFor = (_k, m, _t, from, until) => fixtureCalendarDays(m, from, until)

export function BookingForm({ catalogue = CATALOGUE, today = "2027-04-14", initial = {}, offersFor = defaultOffers, recognise = fixtureRecognise, places = fixturePlaces, onBooked, onRequested, onOpenAccount, onStep }: BookingFormProps) {
  const [fields, dispatch] = useCheckoutState({ today, ...initial.fields })
  const [quote, setQuote] = useState(initial.quote ?? false)
  const [serviceKey, setServiceKey] = useState<string | null>(initial.service ?? null)
  // The customer turned a single turn-on or blowout into the pass: the single's key, so turning it off goes back.
  const [upsellFrom, setUpsellFrom] = useState<string | null>(initial.upsellFrom ?? null)
  const lists = useMemo(() => ({ bookable: bookingEntries(bookableOf(catalogue), today), quotable: quotableOf(catalogue) }), [catalogue, today])
  const service = [...lists.bookable, ...lists.quotable].find((e) => e.key === serviceKey) ?? null
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
  // The customer pressed Change on the review step: Continue takes them straight back to it.
  const [fromConfirm, setFromConfirm] = useState(false)
  const [addressTyped, setAddressTyped] = useState(false)
  const [typed, setTyped] = useState<TypedValues | undefined>()
  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const town = townOf(fields)
  const returning = useReturning({ initial, recognise, fields, active: step === "contact" && !quote, set, setChannel, setCard })
  const first = useRef(true)
  const leaveLink = useRef<HTMLAnchorElement>(null)

  const groups = useMemo(() => dayGroups({ service, plan, today, town, zones: fields.zones, offersFor }), [service, plan, today, town, fields.zones, offersFor])
  const heldPicks = heldPicksOf(groups, picks)
  const heldPrefs = heldPrefsOf(plan, heldPicks, prefs)
  const answers = { service, fields, addressTyped, typed, picks: heldPicks, offers: Object.fromEntries(groups.map((g) => [g.key, g.offers as DayTimeOffer[]])), when, prefs: heldPrefs }
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
  // A Change link on the review step: the step opens with the answer in it, and Continue returns to the review (GOV.UK check answers). Changing the address or the service changes what comes after it, so those
  // go on step by step.
  const change = (to: FormStep) => {
    setFromConfirm(to !== "address" && to !== "service" && to !== "quote-service")
    go(to)
  }

  useEffect(() => {
    onStep?.({ step, steps, quote, service, address: street, town, firstName: fields.firstName, email: fields.email, pick })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, serviceKey, quote])
  // Every step change moves focus to the heading and names the page for a screen reader; nothing moves on the first render.
  const heading = (done ? (quote || callback ? "Request sent" : "Booked") : step === "preference" && plan ? preferenceQuestion(preferenceVisits(plan)) : ((quote ? QUOTE_QUESTIONS[step] : undefined) ?? QUESTIONS[step])) as string
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
    if (step === "done" && quote && service) onRequested?.({ serviceKey: service.key, serviceName: service.name, firstName: fields.firstName, lastName: fields.lastName, phone: fields.phone, email: fields.email, channel, street: street || "", town: town ?? "", words: fields.accessNote.trim(), photos })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  useEffect(() => {
    if (step === "done" && !quote && !callback && service && pick?.day && pick.start) onBooked?.({ service: service.name, day: pick.day, start: pick.start, street: street || "480 Briggs St", town: town ?? "Erie", firstName: fields.firstName || "Andrea", email: fields.email, phone: fields.phone, channel, photos: photos.length, marketing: fields.marketingEmail, card: cardWords(card) })
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
  // A card pressed opens and picks its service; the open card pressed again closes it. The answers that are about the visit start over, the ones about the yard stay.
  const choose = (key: string | null) => {
    if (key === serviceKey) return setServiceKey(null)
    setServiceKey(key)
    setUpsellFrom(null)
    if (key !== serviceKey) {
      setPicks({})
      setPrefs({})
      setExtras(NO_EXTRAS)
    }
  }
  // "Make it a Season Pass": the same address and answers, down the pass path; turned off, back to the single visit.
  const makePass = (on: boolean) => {
    setPicks({})
    setPrefs({})
    if (on) {
      setUpsellFrom(serviceKey)
      setServiceKey(PASS_KEY)
    } else {
      setServiceKey(upsellFrom)
      setUpsellFrom(null)
    }
  }
  const startQuote = () => {
    setQuote(true)
    setServiceKey(null)
    go("quote-service")
  }
  const addPhotos = (p: PickedPhoto[]) => setPhotos((prev) => [...prev, ...p.filter((x) => !prev.some((y) => y.name === x.name))])
  const upsell = (key: string) => (SINGLE_PASS.has(key) && lists.bookable.some((e) => e.key === PASS_KEY) ? { on: false, onChange: makePass } : key === PASS_KEY && upsellFrom ? { on: true, onChange: makePass } : undefined)
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
  const deadEnd = step === "address" && areaState(fields.place) === "outside"
  const off = !valid && (deadEnd || (step === "service" && service === null) || step === "quote-service" || step === "day")
  const hint = step === "day" ? DAY_HINT : step === "service" && service === null ? SERVICE_HINT : step === "quote-service" ? SERVICE_HINT : undefined
  const details = { note: fields.accessNote, onNote: (t: string) => set("accessNote", t), photos, onAddPhotos: addPhotos, onRemovePhoto: (n: string) => setPhotos((prev) => prev.filter((p) => p.name !== n)) }

  let body: React.ReactNode
  switch (step) {
    case "service":
      body = (
        <ServicePicker
          entries={lists.bookable}
          value={serviceKey}
          onChange={choose}
          onRequestQuote={startQuote}
          renderPanel={(e) => <ServicePanel service={e} plan={e.kind === "pass" ? passPlanFor(today) : null} zones={fields.zones} onZones={(n) => set("zones", n)} access={fields.access} onAccess={(a) => set("access", a)} attempted={attempted} extras={extras} onExtras={setExtras} upsell={upsell(e.key)} {...details} />}
        />
      )
      break
    case "quote-service":
      body = <ServicePicker entries={lists.quotable} value={serviceKey} onChange={choose} />
      break
    case "address":
      body = (
        <>
          <AddressStep state={fields} attempted={attempted} places={places} showAccess={false} onTypedChange={setAddressTyped} onTypedValues={setTyped} onType={(text) => dispatch({ type: "typeAddress", text })} onPick={(place) => dispatch({ type: "pickPlace", place })} set={set} />
          {deadEnd && (
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
    case "details":
      body = <QuoteDetails {...details} />
      break
    case "day":
      body = <CalendarGroups groups={groups} picks={heldPicks} onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))} note={when} onNote={setWhen} />
      break
    case "preference":
      body = plan && <PreferenceGroups visits={preferenceVisits(plan)} prefs={heldPrefs} onPref={(k, p) => setPrefs((prev) => ({ ...prev, [k]: p }))} />
      break
    case "card":
      body = <BookingCard saved={card === "saved"} pass={service?.kind === "pass"} onSkip={skipCard} onReplace={returning.cardOnFile ? returning.replaceCard : undefined} />
      break
    case "contact":
      body = (
        <>
          <BookingContact
            fields={fields}
            set={set}
            channel={channel}
            onChannel={setChannel}
            attempted={attempted}
            terms={!quote}
            top={<ReturningBlock state={returning.state} via={returning.via} contact={{ email: fields.email, phone: fields.phone }} saved={returning.saved} street={[street, town].filter(Boolean).join(", ")} onFile={Boolean(returning.saved?.address.startsWith(street))} card={cardWords(card)} onSend={returning.send} onSkip={returning.skip} onOpenLink={returning.verify} onNotYou={returning.notYou} onChangeAddress={() => change("address")} onChangeCard={() => change("card")} />}
          />
          {quote && <p data-slot="quote-happens" className="mt-8 text-base text-foreground">{happensWords({ channel, phone: fields.phone, email: fields.email, quote: true, callback: false })}</p>}
        </>
      )
      break
    case "confirm":
      body = service && <BookingReview rows={reviewRows({ service, fields, town, pick, plan, picks: heldPicks, prefs: heldPrefs, when, callback, channel, photos: photos.length, quote, extras, card, go: change })} happens={happensWords({ channel, phone: fields.phone, email: fields.email, quote, callback, pass: service.kind === "pass" })} />
      break
    default:
      body = <BookingBooked service={service?.name ?? "Visit"} where={[street, town].filter(Boolean).join(", ")} channel={channel} phone={fields.phone} email={fields.email} pick={quote || callback ? undefined : pick} photos={photos.length} callback={callback} quote={quote} onOpenAccount={onOpenAccount} pass={bookedPass} card={cardWords(card)} />
  }

  return (
    <div onKeyDown={onKeyDown}>
      <FlowShell question={heading} step={Math.min(at + 1, total)} total={total} notice={<StepProblems problems={problems} />} onBack={back} onNext={next} nextLabel={label} nextDisabled={off} hint={hint} done={done} onClose={dirty && !done ? () => setLeaving(true) : undefined}>
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
