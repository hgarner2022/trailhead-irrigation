"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { BookingReview } from "@/components/blocks/BookingReview"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import { FlowShell } from "@/components/blocks/FlowShell"
import type { PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ServicePicker } from "@/components/blocks/ServicePicker"
import { fixtureCalendarDays, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { passPlanFor, preferenceVisits } from "@/lib/booking/pass-visits"
import { TERMS_VERSION } from "@/lib/season-pass"
import { OnFileMark } from "@/components/blocks/OnFileMark"
import { accessOf, emailDiffers, fixtureKnown } from "@/lib/booking/known-address"
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
import { BookingContact, TermsLine } from "./booking-contact"
import { CalendarGroups } from "./booking-day"
import { QuoteDetails, ServiceDetails } from "./booking-details"
import { dayGroups, heldPicksOf, heldPrefsOf, type OffersFor } from "./booking-groups"
import { bookedPassOf, upsellPrices } from "./booking-pass-model"
import { PreferenceGroups, preferenceQuestion } from "./booking-preference"
import { LeaveDialog } from "./booking-leave"
import { StepField, StepProblems } from "./booking-problems"
import type { BookingFormProps } from "./booking-form-types"
import { useKnownProperty } from "./use-known-property"
import { useStepHistory } from "./use-step-history"
import { ACTIONS, CONFIRM_BOOK, CONFIRM_PASS, NO_EXTRAS, QUESTIONS, QUOTE_QUESTIONS, SEND_REQUEST, areaState, callbackMode, canContinue, cardWords, hasEntries, happensWords, problemList, reviewRows, stepTotal, stepsFor, townOf, type CardChoice, type Extras, type FormStep } from "./booking-form-model"

// The customer's booking form (docs/plans/2026-11-19-booking-form-design.md), one question per screen on the FlowShell, every heading a plain name: Address, Service, Day, Contact, Card, Review. The address is the
// type-ahead (the ZIP decides the area; a repeat customer is recognised by it alone, with no sign-in and nothing personal shown), then the service: one card per service that opens in place and holds what is
// included, zones, questions, access, a note and photos, and on a single turn-on or blowout "Upgrade to a Season Pass". Then the day as a calendar, who we reach, a card (the card on file only to the email on
// file), a review, the booked card. A service we quote is address, services, "Details" and contact with no day. Back is the browser's Back; Close asks only once something is entered. Nothing is kept before contact.

export type { Booked, BookingFormProps, BookingProgress, Requested } from "./booking-form-types"

const TYPING = new Set(["text", "email", "tel", "radio"])
const PASS_KEY = "season-pass"
const SINGLE_PASS = new Set(["spring-turn-on", "fall-blowout"])
const defaultOffers: OffersFor = (_k, m, _t, from, until) => fixtureCalendarDays(m, from, until)

export function BookingForm({ catalogue = CATALOGUE, today = "2027-04-14", initial = {}, offersFor = defaultOffers, known = fixtureKnown, places = fixturePlaces, prototype = false, onBooked, onRequested, onOpenAccount, onStep }: BookingFormProps) {
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
  // Agreement to the terms is pressing Continue on the contact step: the time and the version are recorded then, source "booking" (Hannah, Nov 23 2026).
  const [termsAt, setTermsAt] = useState<string | null>(initial.termsAt ?? null)
  // The customer pressed Change on the review step: Continue takes them straight back to it.
  const [fromConfirm, setFromConfirm] = useState(false)
  const [addressTyped, setAddressTyped] = useState(false)
  const [typed, setTyped] = useState<TypedValues | undefined>()
  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const town = townOf(fields)
  // A repeat customer is recognised by the address alone (Hannah, Nov 23 2026): nothing personal is shown, the yard's zone count and controller prefill, and the card on file is offered on the card step to the email on file only.
  const { property, offered, otherCard, setOtherCard, filled, prefillOnce } = useKnownProperty({ place: fields.place, email: fields.email, known, other: initial.other, contactStep: step === "contact" && !quote, fields, setField: (f, v) => set(f, v) })
  const cardNow: CardChoice = card === "file" && !offered ? null : card
  const first = useRef(true)

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
    // The first problem's own field takes focus and scrolls into view; the summary takes it when no field can.
    const surface = document.querySelector("[data-slot=flow-surface]")
    const first = problemList(step, answers)[0]
    ;((first && surface?.querySelector<HTMLElement>(first.field)) ?? document.getElementById("step-problems"))?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presses])
  useEffect(() => {
    if (step === "done" && quote && service) onRequested?.({ serviceKey: service.key, serviceName: service.name, firstName: fields.firstName, lastName: fields.lastName, phone: fields.phone, email: fields.email, channel, street: street || "", town: town ?? "", words: fields.accessNote.trim(), photos })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  useEffect(() => {
    if (step === "done" && !quote && !callback && service && pick?.day && pick.start) onBooked?.({ service: service.name, day: pick.day, start: pick.start, street: street || "480 Briggs St", town: town ?? "Erie", firstName: fields.firstName || "Andrea", email: fields.email, phone: fields.phone, channel, photos: photos.length, marketing: true, card: cardWords(cardNow, offered), onFile: Boolean(property), emailDiffers: emailDiffers(property, fields.email), consent: { termsVersion: TERMS_VERSION, at: termsAt ?? new Date().toISOString(), source: "booking", marketingEmail: true, marketingText: false } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const next = () => {
    if (!valid) {
      setAttempted(true)
      return setPresses((n) => n + 1)
    }
    if (step === "contact" && !quote) setTermsAt(new Date().toISOString())
    // The yard's non-sensitive facts of a property on file prefill once: the zone count and the controller.
    if (step === "address")
      prefillOnce((p, access) => {
        set("zones", p.zones)
        if (fields.access === null) set("access", access)
        if (p.controller) setExtras((x) => ({ ...x, brand: x.brand || p.controller! }))
      })
    // An email that is no longer the one on file takes the card on file away: the card step asks again, as for a new customer.
    if (step === "contact" && card === "file" && !offered) {
      setCard(null)
      return go("card")
    }
    if (step === "card") setCard(offered && !otherCard ? "file" : "saved")
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
  // A service chosen on its card ("Choose this service" in the open card). Opening a card to read it chooses nothing. The answers that are about the visit start over, the ones about the yard stay.
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
  // "Upgrade to a Season Pass": the same address and answers, down the pass path; turned off, back to the single visit.
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
  const upsell = (key: string) => (SINGLE_PASS.has(key) && lists.bookable.some((e) => e.key === PASS_KEY) ? { on: false, onChange: makePass, prices: upsellPrices(today, fields.zones) } : key === PASS_KEY && upsellFrom ? { on: true, onChange: makePass, prices: upsellPrices(today, fields.zones) } : undefined)
  // Enter moves on from a one-line field or a chosen card on any step; never from a button, a box, a textarea or the address list.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = e.target as HTMLInputElement
    if (e.key !== "Enter" || e.defaultPrevented || el.tagName !== "INPUT" || !TYPING.has(el.type) || el.getAttribute("role") === "combobox" || done) return
    e.preventDefault()
    next()
  }

  const bookedPass: BookedPass | undefined = service?.kind === "pass" && plan ? { ...bookedPassOf(service.name, plan, heldPicks, heldPrefs), detail: [town, `${fields.zones} zones`].filter(Boolean).join(" · ") } : undefined
  const confirmLabel = quote || callback ? SEND_REQUEST : service?.kind === "pass" ? CONFIRM_PASS : CONFIRM_BOOK
  const label = step === "confirm" ? confirmLabel : step === "contact" && quote ? SEND_REQUEST : step === "card" && (card === "saved" || (offered && !otherCard)) ? "Continue" : (ACTIONS[step] ?? "Continue")
  // Continue is never off and no hint sits above it (Hannah, Nov 25 2026): a press with something missing names it at the top of the step, focuses its field and outlines it, and the message clears as the choice is made.
  const deadEnd = step === "address" && areaState(fields.place) === "outside"
  const stepError = problems[0]?.message
  const details = { note: fields.accessNote, onNote: (t: string) => set("accessNote", t), photos, onAddPhotos: addPhotos, onRemovePhoto: (n: string) => setPhotos((prev) => prev.filter((p) => p.name !== n)), prototype }

  let body: React.ReactNode
  switch (step) {
    case "service":
      body = (
        <>
          <p className="-mt-3 mb-6 text-base text-muted-foreground">Choose what you need.</p>
          <StepField error={stepError}><ServicePicker entries={lists.bookable} value={serviceKey} onChange={choose} defaultOpen={initial.service} onRequestQuote={startQuote} /></StepField>
        </>
      )
      break
    case "quote-service":
      body = <StepField error={stepError}><ServicePicker entries={lists.quotable} value={serviceKey} onChange={choose} mode="quote" /></StepField>
      break
    case "address":
      body = (
        <>
          <AddressStep state={fields} attempted={attempted} places={places} showAccess={false} onTypedChange={setAddressTyped} onTypedValues={setTyped} onType={(text) => dispatch({ type: "typeAddress", text })} onPick={(place) => dispatch({ type: "pickPlace", place })} set={set} />
          {property && <OnFileMark className="mt-4" />}
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
      body = quote || !service ? <QuoteDetails {...details} /> : <ServiceDetails service={service} plan={service.kind === "pass" ? passPlanFor(today) : null} zones={fields.zones} onZones={(n) => set("zones", n)} access={fields.access} onAccess={(a) => set("access", a)} attempted={attempted} extras={extras} onExtras={setExtras} onFile={property ? { zones: fields.zones === property.zones, access: fields.access === accessOf(property) } : undefined} upsell={upsell(service.key)} {...details} />
      break
    case "day":
      body = <CalendarGroups error={stepError} groups={groups} picks={heldPicks} onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))} note={when} onNote={setWhen} />
      break
    case "preference":
      body = plan && <PreferenceGroups visits={preferenceVisits(plan)} prefs={heldPrefs} onPref={(k, p) => setPrefs((prev) => ({ ...prev, [k]: p }))} />
      break
    case "card":
      body = <BookingCard saved={card === "saved"} pass={service?.kind === "pass"} onSkip={skipCard} onFile={offered ?? undefined} other={otherCard} onOther={setOtherCard} prototype={prototype} />
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
            filled={filled}
          />
          {quote && <p data-slot="quote-happens" className="mt-8 text-base text-foreground">{happensWords({ channel, phone: fields.phone, email: fields.email, quote: true, callback: false })}</p>}
        </>
      )
      break
    case "confirm":
      body = service && <BookingReview rows={reviewRows({ service, fields, town, pick, plan, picks: heldPicks, prefs: heldPrefs, when, callback, channel, photos: photos.length, quote, extras, card: cardNow, cardOnFile: offered, onFile: Boolean(property), go: change })} happens={happensWords({ channel, phone: fields.phone, email: fields.email, quote, callback, pass: service.kind === "pass" })} />
      break
    default:
      body = <BookingBooked service={service?.name ?? "Visit"} where={[street, town].filter(Boolean).join(", ")} channel={channel} phone={fields.phone} email={fields.email} pick={quote || callback ? undefined : pick} photos={photos.length} callback={callback} quote={quote} onOpenAccount={onOpenAccount} pass={bookedPass} card={cardWords(cardNow, offered)} />
  }

  return (
    <div onKeyDown={onKeyDown}>
      <FlowShell question={heading} step={Math.min(at + 1, total)} total={total} notice={<StepProblems problems={problems} />} onBack={back} onNext={next} nextLabel={label} legal={step === "contact" && !quote ? <TermsLine /> : undefined} done={done} onClose={dirty && !done ? () => setLeaving(true) : undefined}>
        {body}
      </FlowShell>
      <LeaveDialog open={leaving} onOpenChange={setLeaving} />
    </div>
  )
}
