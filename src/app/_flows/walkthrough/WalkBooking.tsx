"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { BookingSummary, type SummaryPart } from "@/components/blocks/BookingSummary"
import { FlowShell } from "@/components/blocks/FlowShell"
import { ServicePicker } from "@/components/blocks/ServicePicker"
import { FormRow } from "@/components/blocks/FormRow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fixtureDayTimes, startDay, clock12, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { shortDay } from "@/lib/portal/words"
import { fixturePlaces } from "@/lib/places/fixture"
import { AddressStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address"
import { ContactStep, ZonesStep } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-steps"
import { ErrorSummary } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-errors"
import { useCheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/use-checkout-state"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { DayTimeGroups, type DayGroup } from "@/app/(booking)/booking/_screens/booking-day"
import { CardStep } from "@/app/(booking)/booking/_screens/booking-card"
import { DetailsStep } from "@/app/(booking)/booking/_screens/booking-details"
import { BookingDone } from "@/app/(booking)/booking/_screens/booking-done"
import { ACTIONS, DAY_HINT, QUESTIONS, SEND_REQUEST, canContinue, money, priceFor, stepsFor, townOf, type BookingStep } from "@/app/(booking)/booking/_screens/booking-model"
import { ContactPreference, type ContactChannel } from "./ContactPreference"

// The booking form in full, as the first step of the customer walkthrough (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 7, step 1):
// the real BookingFlow's screens in its order (only services we book, with "Need a quote? Request one" for the rest; the address type-ahead; a day
// and an exact start time from the open slots; contact), plus the three the live flow does not have yet, built here from its parts: the contact
// preference asked once under the contact fields, an optional "Add photos", and a confirm step before the booked card. Done is the holographic
// BookedCard naming the exact time, "You added 2 photos" when photos were added, and "your Trailhead account" opens the account. Nothing is sent.

type WalkStep = BookingStep | "photos"
const QUESTION: Record<WalkStep, string> = { ...QUESTIONS, photos: "Want to add photos?", card: "Look it over and confirm." }
const PASS_VISITS = [{ key: "turn-on", heading: "Your spring turn-on" }, { key: "blowout", heading: "Your fall blowout" }] as const
const SAMPLE = [
  { name: "zone-3-head.jpg", src: "/images/sprinkler-spray-head-lawn.jpg" },
  { name: "garden-bed.jpg", src: "/images/micro-spray-garden-bed.jpg" },
]

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
}

/** The steps for a service: the booking's, with Add photos before the confirm step of a visit (not a pass, not a quote). */
export function walkSteps(service: ServiceEntry | null, quote: boolean): WalkStep[] {
  const base = stepsFor(service, quote)
  return !quote && service && service.kind !== "pass" && service.kind !== "quote" ? base.flatMap((s): WalkStep[] => (s === "card" ? ["photos", "card"] : [s])) : base
}

function PhotosStep({ photos, onAdd, onClear }: { photos: { name: string; src: string }[]; onAdd: (p: { name: string; src: string }[]) => void; onClear: () => void }) {
  return (
    <div data-slot="booking-photos" className="space-y-6">
      <FormRow label="Photos" hint={photos.length ? `${photos.length} added.` : "Optional. A photo of the yard or the problem helps Ryan come ready."}>
        <Input type="file" accept="image/*" multiple onChange={(e) => onAdd(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, src: URL.createObjectURL(f) })))} className="h-auto min-h-11 text-base" />
      </FormRow>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => onAdd(SAMPLE)}>Add 2 sample photos</Button>
        {photos.length > 0 && <Button type="button" variant="ghost" className="min-h-11" onClick={onClear}>Remove them</Button>}
      </div>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <li key={p.name} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
              <Image src={p.src} alt={p.name} fill unoptimized sizes="320px" className="object-cover" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function WalkBooking({ onBooked, onOpenAccount, today = "2027-04-14" }: { onBooked: (b: Booked) => void; onOpenAccount: () => void; today?: string }) {
  const [fields, dispatch] = useCheckoutState({ today })
  const [quote, setQuote] = useState(false)
  const list = quote ? QUOTE_SERVICES : SERVICES
  const [serviceKey, setServiceKey] = useState<string | null>(null)
  const service = [...SERVICES, ...QUOTE_SERVICES].find((e) => e.key === serviceKey) ?? null
  const steps = walkSteps(service, quote)
  const [step, setStep] = useState<WalkStep>("service")
  const [attempted, setAttempted] = useState(false)
  const [picks, setPicks] = useState<Record<string, DayTimePick>>({})
  const [note, setNote] = useState("")
  const [details, setDetails] = useState("")
  const [files, setFiles] = useState<string[]>([])
  const [photos, setPhotos] = useState<{ name: string; src: string }[]>([])
  const [channel, setChannel] = useState<ContactChannel>("text")
  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const town = townOf(fields)

  const groups: DayGroup[] = useMemo(() => {
    if (!service || service.kind === "quote") return []
    const minutes = service.minutes ?? 60
    const offers = () => fixtureDayTimes(minutes, town ?? "Erie")
    return service.kind === "pass" ? PASS_VISITS.map((v) => ({ key: v.key, heading: v.heading, minutes, offers: offers() })) : [{ key: "visit", minutes, offers: offers() }]
  }, [service, town])
  const held = (key: string, offers: readonly DayTimeOffer[]): DayTimePick => picks[key] ?? { day: startDay(offers), start: null }
  const heldPicks = Object.fromEntries(groups.map((g) => [g.key, held(g.key, g.offers)]))
  const answers = { service, fields, picks: heldPicks, offers: Object.fromEntries(groups.map((g) => [g.key, g.offers as DayTimeOffer[]])) }
  const valid = step === "photos" ? true : canContinue(step as BookingStep, answers)
  const at = steps.indexOf(step)
  const done = step === "done"
  const pick = heldPicks.visit

  // Told once, when Done is reached: the booking, so the texts step can show what this customer got.
  useEffect(() => {
    if (step === "done" && !quote && service && pick?.day && pick.start) {
      onBooked({ service: service.name, day: pick.day, start: pick.start, street: fields.place?.line1 ?? fields.address ?? "480 Briggs St", town: town ?? "Erie", firstName: fields.firstName || "Andrea", email: fields.email, phone: fields.phone, channel, photos: photos.length })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

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
  const goTo = (s: WalkStep) => setStep(s)

  const parts: SummaryPart[] = [
    ...(service && at > 0 ? [{ label: service.name, what: "service", onChange: () => goTo(steps[0]!) }] : []),
    ...(service?.perZone && !quote && steps.indexOf("zones") >= 0 && at > steps.indexOf("zones") ? [{ label: `${fields.zones} zones`, what: "zones", onChange: () => goTo("zones") }] : []),
    ...(town && steps.indexOf("address") >= 0 && at > steps.indexOf("address") ? [{ label: town, what: "address", onChange: () => goTo("address") }] : []),
    ...(pick?.day && pick.start && steps.indexOf("day") >= 0 && at > steps.indexOf("day") ? [{ label: `${shortDay(pick.day)} at ${clock12(pick.start)}`, what: "day and time", onChange: () => goTo("day") }] : []),
  ]
  const finish = !done && quote && at === steps.length - 2
  const label = finish ? SEND_REQUEST : step === "photos" ? (photos.length ? "Continue" : "Skip photos") : step === "card" ? "Confirm and book" : ACTIONS[step as BookingStep]
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
                <p data-slot="booking-price" className="mt-10 font-display text-5xl leading-none text-navy tabular-nums">{money(priceFor(service, fields.zones))}</p>
                <p className="mt-2 text-base text-muted-foreground">{service.kind === "pass" ? "per season, paid after each visit" : "per visit, charged after the visit"}</p>
              </>
            )
          }
        />
      )
      break
    case "address":
      body = <AddressStep state={fields} attempted={attempted} places={fixturePlaces} onType={(text) => dispatch({ type: "typeAddress", text })} onPick={(place) => dispatch({ type: "pickPlace", place })} set={set} />
      break
    case "day":
      body = <DayTimeGroups groups={groups} picks={heldPicks} onPick={(k, p) => setPicks((prev) => ({ ...prev, [k]: p }))} town={town} note={note} onNote={setNote} />
      break
    case "details":
      body = <DetailsStep text={details} onText={setDetails} files={files} onFiles={setFiles} />
      break
    case "contact":
      body = (
        <>
          <ContactStep state={fields} set={set} attempted={attempted} terms={quote ? "none" : "booking"} />
          <ContactPreference value={channel} onChange={setChannel} />
        </>
      )
      break
    case "photos":
      body = <PhotosStep photos={photos} onAdd={(p) => setPhotos((prev) => [...prev, ...p.filter((x) => !prev.some((y) => y.name === x.name))])} onClear={() => setPhotos([])} />
      break
    case "card":
      body = service && <CardStep service={service} fields={fields} picks={heldPicks} onSkip={() => setStep("done")} />
      break
    default:
      body = (
        <>
          {photos.length > 0 && !quote && (
            <p data-slot="done-photos" className="mb-5 text-base text-foreground">{`You added ${photos.length} photo${photos.length === 1 ? "" : "s"}. Ryan sees ${photos.length === 1 ? "it" : "them"} before the visit.`}</p>
          )}
          <BookingDone service={service?.name ?? "Visit"} where={[fields.place?.line1, town].filter(Boolean).join(", ")} email={fields.email} pick={quote ? undefined : pick} card="Visa ending 4242" price={service ? money(priceFor(service, fields.zones)) : undefined} onDone={onOpenAccount} />
        </>
      )
  }

  return (
    <FlowShell
      question={done && !quote ? "Booked" : done ? "Request sent" : QUESTION[step]}
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
