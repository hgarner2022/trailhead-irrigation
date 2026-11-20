"use client"

import Link from "next/link"
import { AddToCalendarLinks } from "@/components/blocks/AddToCalendarLinks"
import { BookedCard } from "@/components/blocks/BookedCard"
import { channelWords, type ContactChannel } from "@/components/blocks/ContactPreference"
import { photoCount } from "@/components/blocks/PhotoPicker"
import { Button } from "@/components/ui/button"
import { clock12, type DayTimePick } from "@/lib/booking/day-time"
import { QUOTE_DONE } from "@/lib/booking/services"
import { longDay } from "@/lib/portal/words"
import { phoneWords } from "./booking-form-model"

// The last screen: the booked card with the exact time, "You added 2 photos", what happens next on a trail line, Add to calendar, and the way into your Trailhead account. A request for a
// quote has no card and no day ("Thanks, Ryan will call you by tomorrow."); a booking with no open day says Ryan will call. The words follow how the customer asked to be reached. Pure props.

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
            <span aria-hidden className="absolute top-[0.55rem] -left-[0.4375rem] size-3 rounded-full border-2 border-background bg-primary" />
            <p className="font-display text-2xl leading-none text-navy">{l.lead}</p>
            <p className="mt-1.5 text-base text-foreground">{l.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export interface BookingBookedProps {
  service: string
  where: string
  channel: ContactChannel
  phone: string
  email: string
  /** the booked day and time; absent for a request or a booking with no open day */
  pick?: DayTimePick
  photos: number
  /** "Ryan will call you": no day was offered or taken */
  callback?: boolean
  quote?: boolean
  onDone?: () => void
}

export function BookingBooked({ service, where, channel, phone, email, pick, photos, callback, quote, onDone }: BookingBookedProps) {
  const account = (
    <p data-slot="done-account" className="mt-8 text-base text-muted-foreground">
      {quote ? "Your request is saved in " : "Change your day, see receipts and pay in "}
      <Link href="/account" className={LINK}>
        your Trailhead account
      </Link>
      .
    </p>
  )
  const photoLine = photos > 0 && <p data-slot="done-photos" className="mt-4 text-base text-foreground">{`You added ${photoCount(photos)}. Ryan sees ${photos === 1 ? "it" : "them"} before the visit.`}</p>
  if (quote || callback || !pick?.day || !pick.start) {
    return (
      <div>
        <h2 className="font-display text-4xl leading-none text-navy">{quote ? QUOTE_DONE : "Ryan will call you."}</h2>
        <p className="mt-3 text-base text-foreground">{`${service} at ${where}.`}</p>
        {photoLine}
        <Trail
          lines={[
            quote
              ? { key: "call", lead: "By tomorrow", text: `Ryan calls ${phoneWords(phone)} to set a time to look at the yard, and puts the price in writing before any work.` }
              : { key: "call", lead: "Soon", text: `Ryan calls ${phoneWords(phone)} to find a day that works. Nothing is booked until you both agree.` },
            { key: "now", lead: "Now", text: `We're sending a copy of your ${quote ? "request" : "details"} to ${channel === "email" ? email : channel === "text" ? phoneWords(phone) : `${phoneWords(phone)} and ${email}`}.` },
          ]}
        />
        {account}
        <Button size="lg" variant="outline" className="mt-8" onClick={onDone}>
          Done
        </Button>
      </div>
    )
  }
  const now = channel === "text" ? `We're texting your confirmation to ${phoneWords(phone)}.` : channel === "email" ? `We're emailing your confirmation to ${email}.` : `We're texting your confirmation to ${phoneWords(phone)} and emailing it to ${email}.`
  return (
    <div>
      <h2 className="mb-5 font-display text-4xl leading-none text-navy">{`Your ${service.toLowerCase()} is booked.`}</h2>
      <BookedCard service={service} day={longDay(pick.day)} time={clock12(pick.start)} where={where} />
      {photoLine}
      <Trail
        lines={[
          { key: "now", lead: "Now", text: now },
          { key: "before", lead: longDay(dayBefore(pick.day)), text: `A reminder by ${channelWords(channel)}: Ryan is coming tomorrow at ${clock12(pick.start)}.` },
          { key: "after", lead: "After the visit", text: "Ryan asks how you'd like to pay: card, check, Venmo or cash. Your receipt arrives by email." },
        ]}
      />
      <div className="mt-6">
        <AddToCalendarLinks googleHref="https://calendar.google.com/calendar/render?action=TEMPLATE" icsHref="/api/visits/v1/calendar.ics?token=t" />
      </div>
      {account}
      <Button size="lg" className="mt-8" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
