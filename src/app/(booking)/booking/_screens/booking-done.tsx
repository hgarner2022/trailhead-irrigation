"use client"

import Link from "next/link"
import { AddToCalendarLinks } from "@/components/blocks/AddToCalendarLinks"
import { BookedCard } from "@/components/blocks/BookedCard"
import { Button } from "@/components/ui/button"
import { arrivalWindow, clock12, type DayTimePick } from "@/lib/booking/day-time"
import { QUOTE_DONE } from "@/lib/booking/services"
import { longDay } from "@/lib/portal/words"

// The last screen (design section 4.7): the booked card, then what happens next on a trail line (the checkout's own pattern), the email line with the way into the Trailhead account,
// Add to calendar and Done. A quoted request has no card and no day: "Ryan will call you", what the call is for and the same email line. Pure props.

const LINK = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"

const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function Trail({ lines }: { lines: { key: string; lead: string; text: string }[] }) {
  return (
    <section data-slot="done-next" aria-labelledby="done-next-heading" className="mt-10">
      <h2 id="done-next-heading" className="text-xs font-semibold uppercase tracking-wide text-primary-dark">
        What happens next
      </h2>
      <ol className="mt-5 ml-1.5 border-l-2 border-navy/15">
        {lines.map((l) => (
          <li key={l.key} className="relative pb-6 pl-6 last:pb-0">
            <span aria-hidden className="absolute top-[0.55rem] -left-[0.4375rem] size-3 rounded-full border-2 border-cream bg-primary" />
            <p className="font-display text-2xl leading-none text-navy">{l.lead}</p>
            <p className="mt-1.5 text-base text-foreground">{l.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export interface BookingDoneProps {
  service: string
  where: string
  email: string
  /** the booked day and time; absent for a quoted request */
  pick?: DayTimePick
  /** the card kept, "Visa ending 4242"; absent when the customer pays another way */
  card?: string | null
  price?: string
  onDone?: () => void
}

export function BookingDone({ service, where, email, pick, card, price, onDone }: BookingDoneProps) {
  const email_line = (
    <p data-slot="done-email" className="mt-8 text-base text-muted-foreground">
      {`We emailed your ${pick ? "booking" : "request"} to ${email}, with a link to `}
      <Link href="/account" className={LINK}>
        your Trailhead account
      </Link>
      .
    </p>
  )
  if (!pick?.day || !pick.start) {
    return (
      <div>
        <h2 className="font-display text-4xl leading-none text-navy">{QUOTE_DONE}</h2>
        <p className="mt-3 text-base text-foreground">{`${service} at ${where}.`}</p>
        <Trail lines={[{ key: "call", lead: "Soon", text: "Ryan calls to set a time to look at the yard, and puts the price in writing before any work. He reads what you wrote first." }]} />
        {email_line}
        <Button size="lg" variant="outline" className="mt-8" onClick={onDone}>
          Done
        </Button>
      </div>
    )
  }
  const window = arrivalWindow(pick.start)
  return (
    <div>
      <h2 className="mb-5 font-display text-4xl leading-none text-navy">{`Your ${service.toLowerCase()} is booked.`}</h2>
      <BookedCard service={service} day={longDay(pick.day)} time={clock12(pick.start)} window={window} where={where} />
      <Trail
        lines={[
          { key: "now", lead: "Now", text: "We emailed your booking." },
          { key: "before", lead: longDay(dayBefore(pick.day)), text: `A text confirms your time. Ryan arrives ${window}.` },
          { key: "after", lead: "After the visit", text: card && price ? `${price} to the ${card}, and your receipt by email.` : "Ryan asks how you'd like to pay, and your receipt arrives by email." },
        ]}
      />
      <div className="mt-6">
        <AddToCalendarLinks googleHref="https://calendar.google.com/calendar/render?action=TEMPLATE" icsHref="/api/visits/v1/calendar.ics?token=t" />
      </div>
      {email_line}
      <Button size="lg" className="mt-8" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
