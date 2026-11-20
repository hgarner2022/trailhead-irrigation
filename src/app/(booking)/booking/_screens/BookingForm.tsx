"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { BookingReview } from "@/components/blocks/BookingReview"
import { BookingSummary, type SummaryPart } from "@/components/blocks/BookingSummary"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import { FlowShell } from "@/components/blocks/FlowShell"
import type { PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ServicePicker } from "@/components/blocks/ServicePicker"
import { ZipCheck } from "@/components/blocks/ZipCheck"
import { zipCheck } from "@/lib/booking/zip"
import { clock12, fixtureDayTimes, startDay, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { serviceability } from "@/lib/places"
import { fixturePlaces } from "@/lib/places/fixture"
import { shortDay } from "@/lib/portal/words"
import { AddressStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address"
import { DoneStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-done"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { useCheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/use-checkout-state"
import { BookingBooked } from "./booking-booked"
import { BookingContact } from "./booking-contact"
import { DayTimeGroups, type DayGroup } from "./booking-day"
import { BookingDetails, QuoteDetails } from "./booking-details"
import { StepProblems } from "./booking-problems"
import type { BookingFormProps } from "./booking-form-types"
import { useStepHistory } from "./use-step-history"
import { ACTIONS, CONFIRM_BOOK, DAY_HINT, NO_EXTRAS, QUESTIONS, QUOTE_QUESTIONS, SEND_REQUEST, SERVICE_HINT, ZIP_HINT, callbackMode, canContinue, hasEntries, happensWords, problemList, reviewRows, stepTotal, stepsFor, townOf, type Extras, type FormStep } from "./booking-form-model"

// The customer's booking form (docs/plans/2026-11-19-booking-form-design.md), one question per screen on the FlowShell, in Jobber's order for the first screens: zip code, then the services with
// their lengths, then the address, the service details (zones with the price, access, the questions that belong to the service, a note, photos), the day and an exact start time from the open
// slots, and only then who we reach (and how: text, email or both, asked once) with the terms, so an abandoned booking leaves nothing (Hannah, Nov 20 2026); a confirm step says what happens,
// then the booked card. A service we quote is zip, services, address, details and contact ("Send to Ryan") with no day and no confirm. Navigation and close: Close at the top right asks only once
// something is entered; every step is a browser-history entry so the phone's Back button goes to the previous step; Back is the same as the browser's Back; the heading takes focus and the page
// title follows each step; a failed Continue puts a summary at the top and focus on the first bad field. Nothing is sent, and nothing is kept before the contact step is submitted.

export type { Booked, BookingFormProps, BookingProgress, Requested } from "./booking-form-types"

const PASS_VISITS = [{ key: "turn-on", heading: "Your spring turn-on" }, { key: "blowout", heading: "Your fall blowout" }] as const
const TYPING = new Set(["text", "email", "tel", "radio"])

export function BookingForm({ entries = SERVICES, today = "2027-04-14", initial = {}, offersFor = (_k, m, t) => fixtureDayTimes(m, t ?? "Erie"), pass, places = fixturePlaces, onBooked, onRequested, onOpenAccount, onStep }: BookingFormProps) {
  const [fields, dispatch] = useCheckoutState({ today, ...initial.fields })
  const [zip, setZip] = useState(initial.zip ?? "")
  const [quote, setQuote] = useState(initial.quote ?? false)
  const [serviceKey, setServiceKey] = useState<string | null>(initial.service ?? null)
  const service = [...entries, ...QUOTE_SERVICES].find((e) => e.key === serviceKey) ?? null
  const steps = stepsFor(service, quote)
  const [step, setStep] = useState<FormStep>(initial.step ?? "zip")
  const [attempted, setAttempted] = useState(initial.attempted ?? false)
  const [presses, setPresses] = useState(initial.attempted ? 1 : 0)
  const [picks, setPicks] = useState<Record<string, DayTimePick>>(initial.picks ?? {})
  const [when, setWhen] = useState(initial.when ?? "")
  const [channel, setChannel] = useState<ContactChannel>(initial.channel ?? "text")
  const [photos, setPhotos] = useState<PickedPhoto[]>(initial.photos ?? [])
  const [extras, setExtras] = useState<Extras>({ ...NO_EXTRAS, ...initial.extras })
  const [leaving, setLeaving] = useState(initial.leaving ?? false)
  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const town = townOf(fields)
  const zipTown = (() => {
    const z = zipCheck(zip)
    return z.state === "ok" ? z.town : null
  })()
  const first = useRef(true)
  const leaveLink = useRef<HTMLAnchorElement>(null)

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
  const problems = attempted && !valid ? problemList(step, answers) : []
  const dirty = hasEntries({ zip, service, fields, when, photos: photos.length })

  // One browser-history entry per step: the phone's Back button goes to the previous step and never out of the form.
  const history = useStepHistory(step, setStep, done)
  const go = (to: FormStep) => {
    setAttempted(false)
    history.push(to)
  }

  useEffect(() => {
    onStep?.({ step, steps, quote, service, address: street, town, firstName: fields.firstName, email: fields.email, pick })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, serviceKey, quote])
  // Every step change moves focus to the heading and names the page for a screen reader; nothing moves on the first render.
  const heading = (done ? (quote || callback ? "Request sent" : "Booked") : ((quote ? QUOTE_QUESTIONS[step] : undefined) ?? QUESTIONS[step])) as string
  useEffect(() => {
    const before = document.title
    document.title = done ? `${heading} | Trailhead Lawn & Irrigation` : `${heading} Step ${at + 1} of ${total} | Book online | Trailhead Lawn & Irrigation`
    return () => void (document.title = before)
  }, [heading, at, total, done])
  useEffect(() => {
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
      onRequested?.({ serviceKey: service.key, serviceName: service.name, firstName: fields.firstName, lastName: fields.lastName, phone: fields.phone, email: fields.email, channel, street: street || "", town: town ?? zipTown ?? "", words: fields.accessNote.trim(), photos })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  useEffect(() => {
    if (step === "done" && !quote && !callback && service && pick?.day && pick.start) {
      onBooked?.({ service: service.name, day: pick.day, start: pick.start, street: street || "480 Briggs St", town: town ?? "Erie", firstName: fields.firstName || "Andrea", email: fields.email, phone: fields.phone, channel, photos: photos.length, marketing: fields.marketingEmail })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const next = () => {
    if (!valid) {
      setAttempted(true)
      return setPresses((n) => n + 1)
    }
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

  const dayPart = pick?.day && pick.start && !callback ? `${shortDay(pick.day)} at ${clock12(pick.start)}` : null
  const parts: SummaryPart[] = [
    ...(service && at > steps.indexOf(quote ? "quote-service" : "service") ? [{ label: service.name, what: "service", onChange: () => go(quote ? "quote-service" : "service") }] : []),
    ...(street && at > steps.indexOf("address") ? [{ label: street, what: "address", onChange: () => go("address") }] : []),
    ...(dayPart && steps.indexOf("day") >= 0 && at > steps.indexOf("day") ? [{ label: dayPart, what: "day and time", onChange: () => go("day") }] : []),
  ]
  const confirmLabel = quote || callback ? SEND_REQUEST : CONFIRM_BOOK
  const label = step === "confirm" ? confirmLabel : step === "contact" && quote ? SEND_REQUEST : (ACTIONS[step] ?? "Continue")
  // Continue is off only where the screen says why: a choice not yet made (service, a start time) or a dead end (a zip or an address we do not serve). Everywhere else it stays on and a press names what is missing.
  const deadEnd = (step === "zip" && zipCheck(zip).state === "outside") || (step === "address" && fields.place !== null && !valid)
  const off = !valid && (deadEnd || step === "service" || step === "quote-service" || step === "day")
  const hint = step === "day" ? DAY_HINT : step === "service" || step === "quote-service" ? SERVICE_HINT : step === "zip" ? ZIP_HINT : undefined
  const outsideArea = step === "address" && fields.place !== null && !serviceability(fields.place).ok

  let body: React.ReactNode
  switch (step) {
    case "zip":
      body = <ZipCheck value={zip} onChange={setZip} attempted={attempted} />
      break
    case "service":
    case "quote-service":
      body = <ServicePicker entries={quote ? QUOTE_SERVICES : entries} value={serviceKey} onChange={choose} onRequestQuote={quote ? undefined : startQuote} />
      break
    case "address":
      body = (
        <>
          <AddressStep state={fields} attempted={attempted} places={places} showAccess={false} onType={(text) => dispatch({ type: "typeAddress", text })} onPick={(place) => dispatch({ type: "pickPlace", place })} set={set} />
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
      body = quote || !service ? <QuoteDetails {...shared} /> : <BookingDetails service={service} zones={fields.zones} onZones={(n) => set("zones", n)} access={fields.access} onAccess={(a) => set("access", a)} attempted={attempted} extras={extras} onExtras={setExtras} {...shared} />
      break
    }
    case "day":
      body = <DayTimeGroups groups={groups} picks={heldPicks} onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))} town={town ?? zipTown} note={when} onNote={setWhen} />
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
          rows={reviewRows({ service, fields, town: town ?? zipTown, zip: fields.place?.zip || zip, pick, when, callback, channel, photos: photos.length, quote, extras, go })}
          happens={happensWords({ channel, phone: fields.phone, email: fields.email, quote, callback })}
        />
      )
      break
    default:
      body =
        service?.kind === "pass" && pass && !callback ? (
          <DoneStep pass={pass} email={fields.email} onDone={onOpenAccount} />
        ) : (
          <BookingBooked service={service?.name ?? "Visit"} where={[street, town].filter(Boolean).join(", ")} channel={channel} phone={fields.phone} email={fields.email} pick={quote || callback ? undefined : pick} photos={photos.length} callback={callback} quote={quote} onOpenAccount={onOpenAccount} />
        )
  }

  return (
    <div onKeyDown={onKeyDown}>
      <FlowShell
        question={heading}
        step={Math.min(at + 1, total)}
        total={total}
        summary={!done && step !== "confirm" && parts.length > 0 ? <BookingSummary parts={parts} /> : undefined}
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
