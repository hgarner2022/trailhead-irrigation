"use client"

import { useEffect, useMemo, useState } from "react"
import { BookingSummary, type SummaryPart } from "@/components/blocks/BookingSummary"
import { FlowShell } from "@/components/blocks/FlowShell"
import { ServicePicker } from "@/components/blocks/ServicePicker"
import { fixtureDayTimes, startDay, clock12, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { shortDay } from "@/lib/portal/words"
import { fixturePlaces } from "@/lib/places/fixture"
import type { PlaceProvider } from "@/lib/places"
import type { Pass } from "@/lib/admin/types"
import { AddressStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address"
import { DoneStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-done"
import { ContactStep, ZonesStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-steps"
import { ErrorSummary } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-errors"
import { useCheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/use-checkout-state"
import type { CheckoutFields, CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { DayTimeGroups, type DayGroup } from "./booking-day"
import { CardStep } from "./booking-card"
import { DetailsStep } from "./booking-details"
import { BookingDone } from "./booking-done"
import { ACTIONS, DAY_HINT, QUESTIONS, SEND_REQUEST, canContinue, money, priceFor, stepsFor, townOf, type BookingStep } from "./booking-model"

// The booking flow at /booking, pure and over fixtures (docs/plans/2026-11-18-online-booking-design.md, with the day step replaced by a day and an exact start time). One question per screen
// on the FlowShell: the service (only services we book; "Need a quote? Request one" starts the request path), zones when the price depends on them, the address, the day and time, contact,
// the card and Done. The request path is the service we quote, the address, a few words and photos, contact and "Thanks, Ryan will call you by tomorrow", with no day and no card. Nothing is
// sent: Continue only moves. Continue stays off until the step has what it needs; on the day step that is a tapped start time.

export interface BookingFlowProps {
  /** the services offered to book; the fixture list by default */
  entries?: readonly ServiceEntry[]
  today?: string
  /** open on a step with earlier answers filled in; stories use it */
  initial?: { step?: BookingStep; service?: string; quote?: boolean; fields?: Partial<CheckoutState>; picks?: Record<string, DayTimePick>; note?: string; details?: string }
  /** the open days for a visit; the fixture days by default, `[]` for a full calendar */
  offersFor?: (key: string, minutes: number, town: string | null) => DayTimeOffer[]
  /** what Stripe or the server said when the card did not go through */
  cardFailure?: string
  /** the pass the Done step shows for a Season Pass */
  pass?: Pass
  places?: PlaceProvider
  onDone?: () => void
  /** told on every step change with where the flow is; the clickable flow story reads it for its strip and texts */
  onStep?: (info: BookingProgress) => void
}

export interface BookingProgress {
  step: BookingStep
  steps: BookingStep[]
  quote: boolean
  service: ServiceEntry | null
  address: string
  town: string | null
  firstName: string
  email: string
  pick: DayTimePick | undefined
}

const PASS_VISITS = [{ key: "turn-on", heading: "Your spring turn-on" }, { key: "blowout", heading: "Your fall blowout" }] as const

export function BookingFlow({ entries = SERVICES, today = "2027-04-14", initial = {}, offersFor = (_k, m, t) => fixtureDayTimes(m, t ?? "Erie"), cardFailure, pass, places = fixturePlaces, onDone, onStep }: BookingFlowProps) {
  const [fields, dispatch] = useCheckoutState({ today, ...initial.fields })
  const [quote, setQuote] = useState(initial.quote ?? false)
  const list = quote ? QUOTE_SERVICES : entries
  const [serviceKey, setServiceKey] = useState<string | null>(initial.service ?? null)
  const service = [...entries, ...QUOTE_SERVICES].find((e) => e.key === serviceKey) ?? null
  const steps = stepsFor(service, quote)
  const [step, setStep] = useState<BookingStep>(initial.step ?? steps[0]!)
  const [attempted, setAttempted] = useState(false)
  const [picks, setPicks] = useState<Record<string, DayTimePick>>(initial.picks ?? {})
  const [note, setNote] = useState(initial.note ?? "")
  const [details, setDetails] = useState(initial.details ?? "")
  const [files, setFiles] = useState<string[]>([])
  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const town = townOf(fields)

  const groups: DayGroup[] = useMemo(() => {
    if (!service || service.kind === "quote") return []
    const minutes = service.minutes ?? 60
    return service.kind === "pass" ? PASS_VISITS.map((v) => ({ key: v.key, heading: v.heading, minutes, offers: offersFor(v.key, minutes, town) })) : [{ key: "visit", minutes, offers: offersFor("visit", minutes, town) }]
  }, [service, town, offersFor])
  // The best day starts selected on each visit; a time is never selected for the customer.
  const held = (key: string, offers: readonly DayTimeOffer[]): DayTimePick => picks[key] ?? { day: startDay(offers), start: null }
  const heldPicks = Object.fromEntries(groups.map((g) => [g.key, held(g.key, g.offers)]))
  const answers = { service, fields, picks: heldPicks, offers: Object.fromEntries(groups.map((g) => [g.key, g.offers as DayTimeOffer[]])) }
  const valid = canContinue(step, answers)
  const at = steps.indexOf(step)
  const done = step === "done"
  useEffect(() => {
    onStep?.({ step, steps, quote, service, address: fields.place?.line1 ?? fields.address, town, firstName: fields.firstName, email: fields.email, pick: heldPicks.visit })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, serviceKey, quote])

  const next = () => {
    if (!valid) return setAttempted(true)
    setAttempted(false)
    setStep(steps[Math.min(at + 1, steps.length - 1)]!)
  }
  const back = () => setStep(steps[Math.max(at - 1, 0)]!)
  const choose = (key: string) => {
    setServiceKey(key)
    setPicks({})
  }
  const goTo = (s: BookingStep) => setStep(s)

  const pick = heldPicks.visit
  const parts: SummaryPart[] = [
    ...(service && at > 0 ? [{ label: service.name, what: "service", onChange: () => goTo(steps[0]!) }] : []),
    ...(service?.perZone && !quote && steps.indexOf("zones") >= 0 && at > steps.indexOf("zones") ? [{ label: `${fields.zones} zones`, what: "zones", onChange: () => goTo("zones") }] : []),
    ...(town && at > steps.indexOf("address") && steps.indexOf("address") >= 0 ? [{ label: town, what: "address", onChange: () => goTo("address") }] : []),
    ...(pick?.day && pick.start && at > steps.indexOf("day") && steps.indexOf("day") >= 0 ? [{ label: `${shortDay(pick.day)} at ${clock12(pick.start)}`, what: "day and time", onChange: () => goTo("day") }] : []),
  ]
  const finish = !done && at === steps.length - 2 && quote
  const label = finish ? SEND_REQUEST : ACTIONS[step]
  const problems = !valid && attempted ? [step === "contact" ? "Contact details" : step === "address" ? "Address" : "Your choice"] : []

  let body: React.ReactNode
  switch (step) {
    case "service":
    case "quote-service":
      body = <ServicePicker entries={list} value={serviceKey} onChange={choose} onRequestQuote={quote ? undefined : () => { setQuote(true); setServiceKey(null); setStep("quote-service") }} />
      break
    case "zones":
      body = (
        <ZonesStep
          state={fields}
          set={set}
          summary={
            service && (
              <>
                <p data-slot="booking-price" className="mt-10 font-display text-5xl leading-none text-navy tabular-nums">
                  {money(priceFor(service, fields.zones))}
                </p>
                <p className="mt-2 text-base text-muted-foreground">{service.kind === "pass" ? "per season, paid after each visit" : "per visit, charged after the visit"}</p>
              </>
            )
          }
        />
      )
      break
    case "address":
      body = <AddressStep state={fields} attempted={attempted} places={places} onType={(text) => dispatch({ type: "typeAddress", text })} onPick={(place) => dispatch({ type: "pickPlace", place })} set={set} />
      break
    case "day":
      body = <DayTimeGroups groups={groups} picks={heldPicks} onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))} town={town} note={note} onNote={setNote} />
      break
    case "details":
      body = <DetailsStep text={details} onText={setDetails} files={files} onFiles={setFiles} />
      break
    case "contact":
      body = <ContactStep state={fields} set={set} attempted={attempted} terms={quote ? "none" : "booking"} />
      break
    case "card":
      body = service && <CardStep service={service} fields={fields} picks={heldPicks} failure={cardFailure} onSkip={() => setStep("done")} />
      break
    default:
      body =
        service?.kind === "pass" && pass ? (
          <DoneStep pass={pass} email={fields.email} onDone={onDone} />
        ) : (
          <BookingDone service={service?.name ?? "Visit"} where={[fields.place?.line1, town].filter(Boolean).join(", ")} email={fields.email} pick={quote ? undefined : pick} card="Visa ending 4242" price={service ? money(priceFor(service, fields.zones)) : undefined} onDone={onDone} />
        )
  }

  return (
    <FlowShell
      question={done && !quote ? "Booked" : done ? "Request sent" : QUESTIONS[step]}
      step={at + 1}
      total={steps.length}
      summary={!done && parts.length > 0 ? <BookingSummary parts={parts} /> : undefined}
      onBack={back}
      onNext={next}
      nextLabel={label}
      nextDisabled={!valid}
      hint={step === "day" ? DAY_HINT : undefined}
      wide={step === "day" || step === "service" || step === "quote-service"}
      done={done}
    >
      {body}
      {attempted && <ErrorSummary problems={problems} />}
    </FlowShell>
  )
}
