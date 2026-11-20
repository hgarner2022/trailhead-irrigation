"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { BookingReview } from "@/components/blocks/BookingReview"
import { BookingSummary, type SummaryPart } from "@/components/blocks/BookingSummary"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import { FlowShell } from "@/components/blocks/FlowShell"
import type { PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ServicePicker } from "@/components/blocks/ServicePicker"
import { ZipCheck } from "@/components/blocks/ZipCheck"
import { zipCheck } from "@/lib/booking/zip"
import { clock12, fixtureDayTimes, startDay, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import type { Pass } from "@/lib/admin/types"
import type { PlaceProvider } from "@/lib/places"
import { fixturePlaces } from "@/lib/places/fixture"
import { shortDay } from "@/lib/portal/words"
import { AddressStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address"
import { DoneStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-done"
import { ErrorSummary } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-errors"
import type { CheckoutFields, CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { useCheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/use-checkout-state"
import { BookingBooked } from "./booking-booked"
import { BookingContact } from "./booking-contact"
import { DayTimeGroups, type DayGroup } from "./booking-day"
import { BookingDetails, QuoteDetails } from "./booking-details"
import { ACTIONS, CONFIRM_BOOK, DAY_HINT, QUESTIONS, QUOTE_QUESTIONS, SEND_REQUEST, SERVICE_HINT, ZIP_HINT, callbackMode, canContinue, happensWords, problemsFor, reviewRows, stepTotal, stepsFor, townOf, type FormStep } from "./booking-form-model"

// The customer's booking form (docs/plans/2026-11-19-booking-form-design.md), one question per screen on the FlowShell, in Jobber's order for the first screens: zip code, then the services with
// their lengths, then who we reach (and how: text, email or both, asked once), the address, the service details (zones with the price, access, a note, photos), the day and an exact
// start time from the open slots, and a confirm step that says what happens, then the booked card. A service we quote has the same first five screens and no day; the way into it is
// "Need a quote? Request one" under the list. Only services bookable online are in the list. Every step has Back, "Step 3 of 7" over the question and the primary button fixed at the bottom
// on a phone. Nothing is sent: the screen holds the answers and tells its host through `onBooked` and `onStep`.

export interface Booked {
  service: string
  day: string
  start: string
  street: string
  town: string
  firstName: string
  email: string
  phone: string
  channel: ContactChannel
  photos: number
  /** ticked "Send me tips and offers from Trailhead by email" */
  marketing: boolean
}

export interface BookingProgress {
  step: FormStep
  steps: FormStep[]
  quote: boolean
  service: ServiceEntry | null
  address: string
  town: string | null
  firstName: string
  email: string
  pick: DayTimePick | undefined
}

export interface BookingFormProps {
  /** the services offered to book; the fixture list by default */
  entries?: readonly ServiceEntry[]
  today?: string
  /** open on a step with earlier answers filled in; stories use it */
  initial?: { step?: FormStep; zip?: string; service?: string; quote?: boolean; fields?: Partial<CheckoutState>; picks?: Record<string, DayTimePick>; when?: string; channel?: ContactChannel; photos?: PickedPhoto[]; attempted?: boolean }
  /** the open days for a visit; the fixture days by default, `[]` for a full calendar */
  offersFor?: (key: string, minutes: number, town: string | null) => DayTimeOffer[]
  /** the pass the booked step shows for a Season Pass */
  pass?: Pass
  places?: PlaceProvider
  /** told once when a day is booked */
  onBooked?: (booked: Booked) => void
  /** "Done" and the account links on the last screen */
  onOpenAccount?: () => void
  /** told on every step change with where the form is; the clickable flow story reads it */
  onStep?: (info: BookingProgress) => void
}

const PASS_VISITS = [{ key: "turn-on", heading: "Your spring turn-on" }, { key: "blowout", heading: "Your fall blowout" }] as const
const LEAVE = { href: "/", label: "Back to the website" }
const TYPING = new Set(["text", "email", "tel"])

export function BookingForm({ entries = SERVICES, today = "2027-04-14", initial = {}, offersFor = (_k, m, t) => fixtureDayTimes(m, t ?? "Erie"), pass, places = fixturePlaces, onBooked, onOpenAccount, onStep }: BookingFormProps) {
  const [fields, dispatch] = useCheckoutState({ today, ...initial.fields })
  const [zip, setZip] = useState(initial.zip ?? "")
  const [quote, setQuote] = useState(initial.quote ?? false)
  const [serviceKey, setServiceKey] = useState<string | null>(initial.service ?? null)
  const service = [...entries, ...QUOTE_SERVICES].find((e) => e.key === serviceKey) ?? null
  const steps = stepsFor(service, quote)
  const [step, setStep] = useState<FormStep>(initial.step ?? "zip")
  const [attempted, setAttempted] = useState(initial.attempted ?? false)
  const [picks, setPicks] = useState<Record<string, DayTimePick>>(initial.picks ?? {})
  const [when, setWhen] = useState(initial.when ?? "")
  const [channel, setChannel] = useState<ContactChannel>(initial.channel ?? "text")
  const [photos, setPhotos] = useState<PickedPhoto[]>(initial.photos ?? [])
  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const town = townOf(fields)
  const zipTown = (() => {
    const z = zipCheck(zip)
    return z.state === "ok" ? z.town : null
  })()
  const first = useRef(true)

  const groups: DayGroup[] = useMemo(() => {
    if (!service || service.kind === "quote") return []
    const minutes = service.minutes ?? 60
    const at = town ?? zipTown
    return service.kind === "pass" ? PASS_VISITS.map((v) => ({ key: v.key, heading: v.heading, minutes, offers: offersFor(v.key, minutes, at) })) : [{ key: "visit", minutes, offers: offersFor("visit", minutes, at) }]
  }, [service, town, zipTown, offersFor])
  // The best day starts selected on each visit; a time is never selected for the customer.
  const heldPicks = Object.fromEntries(groups.map((g) => [g.key, picks[g.key] ?? { day: startDay(g.offers), start: null }]))
  const answers = { zip, service, fields, picks: heldPicks, offers: Object.fromEntries(groups.map((g) => [g.key, g.offers as DayTimeOffer[]])), when }
  const valid = canContinue(step, answers)
  const callback = !quote && callbackMode(answers)
  const at = steps.indexOf(step)
  const done = step === "done"
  const total = stepTotal(steps)
  const pick = heldPicks.visit
  const street = fields.place?.line1 ?? fields.address

  useEffect(() => {
    onStep?.({ step, steps, quote, service, address: street, town, firstName: fields.firstName, email: fields.email, pick })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, serviceKey, quote])
  // Each step opens at the top with its first field focused, as the checkout does; nothing moves on the first render.
  useEffect(() => {
    if (first.current) return void (first.current = false)
    window.scrollTo?.(0, 0)
    document.querySelector<HTMLElement>("[data-slot=flow-surface] [data-autofocus]")?.focus({ preventScroll: true })
  }, [step])
  useEffect(() => {
    if (step === "done" && !quote && !callback && service && pick?.day && pick.start) {
      onBooked?.({ service: service.name, day: pick.day, start: pick.start, street: street || "480 Briggs St", town: town ?? "Erie", firstName: fields.firstName || "Andrea", email: fields.email, phone: fields.phone, channel, photos: photos.length, marketing: fields.marketingEmail })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const next = () => {
    if (!valid) return setAttempted(true)
    setAttempted(false)
    setStep(steps[Math.min(at + 1, steps.length - 1)]!)
  }
  const back = () => {
    setAttempted(false)
    setStep(steps[Math.max(at - 1, 0)]!)
  }
  const goTo = (s: FormStep) => {
    setAttempted(false)
    setStep(s)
  }
  const choose = (key: string) => {
    setServiceKey(key)
    setPicks({})
  }
  const startQuote = () => {
    setQuote(true)
    setServiceKey(null)
    setStep("quote-service")
  }
  const addPhotos = (p: PickedPhoto[]) => setPhotos((prev) => [...prev, ...p.filter((x) => !prev.some((y) => y.name === x.name))])
  // Enter moves on from a one-line field on the zip and contact steps; never from a button, a box, a textarea or the address list.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement
    if (e.key !== "Enter" || e.defaultPrevented || el.tagName !== "INPUT" || !TYPING.has((el as HTMLInputElement).type) || (step !== "zip" && step !== "contact")) return
    e.preventDefault()
    next()
  }

  const dayPart = pick?.day && pick.start && !callback ? `${shortDay(pick.day)} at ${clock12(pick.start)}` : null
  const parts: SummaryPart[] = [
    ...(service && at > steps.indexOf(quote ? "quote-service" : "service") ? [{ label: service.name, what: "service", onChange: () => goTo(quote ? "quote-service" : "service") }] : []),
    ...(street && at > steps.indexOf("address") ? [{ label: street, what: "address", onChange: () => goTo("address") }] : []),
    ...(dayPart && steps.indexOf("day") >= 0 && at > steps.indexOf("day") ? [{ label: dayPart, what: "day and time", onChange: () => goTo("day") }] : []),
  ]
  const confirmLabel = quote || callback ? SEND_REQUEST : CONFIRM_BOOK
  const label = step === "confirm" ? confirmLabel : (ACTIONS[step] ?? "Continue")
  const problems = !valid && attempted ? problemsFor(step, answers) : []
  const question = done ? (quote ? "Request sent" : callback ? "Request sent" : "Booked") : ((quote ? QUOTE_QUESTIONS[step] : undefined) ?? QUESTIONS[step])
  // Continue is off only where the screen says why: a choice not yet made (service, a start time) or a dead end (a zip or an address we do not serve). Everywhere else it stays on and a press names what is missing.
  const deadEnd = (step === "zip" && zipCheck(zip).state === "outside") || (step === "address" && fields.place !== null && !valid)
  const off = !valid && (deadEnd || step === "service" || step === "quote-service" || step === "day")
  const hint = step === "day" ? DAY_HINT : step === "service" || step === "quote-service" ? SERVICE_HINT : step === "zip" ? ZIP_HINT : undefined

  let body: React.ReactNode
  switch (step) {
    case "zip":
      body = <ZipCheck value={zip} onChange={setZip} attempted={attempted} />
      break
    case "service":
    case "quote-service":
      body = <ServicePicker entries={quote ? QUOTE_SERVICES : entries} value={serviceKey} onChange={choose} onRequestQuote={quote ? undefined : startQuote} />
      break
    case "contact":
      body = <BookingContact fields={fields} set={set} channel={channel} onChannel={setChannel} attempted={attempted} terms={!quote} />
      break
    case "address":
      body = <AddressStep state={fields} attempted={attempted} places={places} showAccess={false} onType={(text) => dispatch({ type: "typeAddress", text })} onPick={(place) => dispatch({ type: "pickPlace", place })} set={set} />
      break
    case "details": {
      const shared = { note: fields.accessNote, onNote: (t: string) => set("accessNote", t), photos, onAddPhotos: addPhotos, onRemovePhoto: (n: string) => setPhotos((prev) => prev.filter((p) => p.name !== n)) }
      body = quote || !service ? <QuoteDetails {...shared} /> : <BookingDetails service={service} zones={fields.zones} onZones={(n) => set("zones", n)} access={fields.access} onAccess={(a) => set("access", a)} attempted={attempted} {...shared} />
      break
    }
    case "day":
      body = <DayTimeGroups groups={groups} picks={heldPicks} onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))} town={town ?? zipTown} note={when} onNote={setWhen} />
      break
    case "confirm":
      body = service && (
        <BookingReview
          rows={reviewRows({ service, fields, town: town ?? zipTown, zip: fields.place?.zip || zip, pick, when, callback, channel, photos: photos.length, quote, go: goTo })}
          happens={happensWords({ channel, phone: fields.phone, email: fields.email, quote, callback })}
        />
      )
      break
    default:
      body =
        service?.kind === "pass" && pass && !callback ? (
          <DoneStep pass={pass} email={fields.email} onDone={onOpenAccount} />
        ) : (
          <BookingBooked service={service?.name ?? "Visit"} where={[street, town].filter(Boolean).join(", ")} channel={channel} phone={fields.phone} email={fields.email} pick={quote || callback ? undefined : pick} photos={photos.length} callback={callback} quote={quote} onDone={onOpenAccount} />
        )
  }

  return (
    <div onKeyDown={onKeyDown}>
      <FlowShell
        question={question}
        step={Math.min(at + 1, total)}
        total={total}
        summary={!done && step !== "confirm" && parts.length > 0 ? <BookingSummary parts={parts} /> : undefined}
        onBack={back}
        onNext={next}
        nextLabel={label}
        nextDisabled={off}
        hint={hint}
        wide={step === "day" || step === "service" || step === "quote-service"}
        done={done}
        leave={LEAVE}
      >
        {body}
        {attempted && <ErrorSummary problems={problems} />}
      </FlowShell>
    </div>
  )
}
