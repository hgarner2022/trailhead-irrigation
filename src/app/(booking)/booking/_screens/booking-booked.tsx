"use client"

import Link from "next/link"
import { AddToCalendarLinks } from "@/components/blocks/AddToCalendarLinks"
import { BookedCard, type BookedVisitLine } from "@/components/blocks/BookedCard"
import { channelWords, type ContactChannel } from "@/components/blocks/ContactPreference"
import { photoCount } from "@/components/blocks/PhotoPicker"
import { clock12, type DayTimePick } from "@/lib/booking/day-time"
import { QUOTE_DONE } from "@/lib/booking/services"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { longDay } from "@/lib/portal/words"
import { phoneWords } from "./booking-form-model"

// The last screen: no Back and no Continue, because there is nothing to go back to. A booking shows the booked card with the exact time, "You added 2 photos", what happens next on a trail line,
// Add to calendar, the way into your Trailhead account and "Back to the website". A request (a service we quote, or a booking with no open day) has no card and no day: "Thanks. We've got your
// request." and the contact the customer gave, never a time we do not know; a request for a quote adds Ryan's number as plain help. The words follow how the customer asked to be reached. Pure props.

const LINK = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"
const BLOCK_LINK = `${LINK} inline-flex min-h-11 items-center`

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

/** A Season Pass bought on a date: its name, one card line per visit (the exact day and time or the preference), and the visits that have an exact day for the reminder and the calendar. */
export interface BookedPass {
  name: string
  lines: BookedVisitLine[]
  exact: { name: string; day: string; start: string }[]
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
  /** no day was offered or taken: a request about a day */
  callback?: boolean
  quote?: boolean
  onOpenAccount?: () => void
  /** a Season Pass: the card lists every visit */
  pass?: BookedPass
  /** "Visa ending 4242" or "No card" */
  card?: string
}

export function BookingBooked({ service, where, channel, phone, email, pick, photos, callback, quote, onOpenAccount, pass, card }: BookingBookedProps) {
  const links = (
    <div data-slot="done-links" className="mt-8 flex flex-col items-start">
      <p data-slot="done-account" className="text-base text-muted-foreground">
        {"Change your day, see receipts and pay in "}
        <Link href="/account" onClick={onOpenAccount ? (e) => (e.preventDefault(), onOpenAccount()) : undefined} className={LINK}>
          your Trailhead account
        </Link>
        .
      </p>
      <Link href="/" className={BLOCK_LINK}>
        Back to the website
      </Link>
    </div>
  )
  const cardLine = card && (
    <div data-slot="done-card" className="mt-4">
      <p className="text-sm text-muted-foreground">Card</p>
      <p className="text-base text-foreground">{card}</p>
    </div>
  )
  const photoLine = photos > 0 && <p data-slot="done-photos" className="mt-4 text-base text-foreground">{`You added ${photoCount(photos)}.`}</p>
  if (pass && !quote && !callback) {
    const sent = channel === "text" ? `We're texting your confirmation to ${phoneWords(phone)}.` : channel === "email" ? `We're emailing your confirmation to ${email}.` : `We're texting your confirmation to ${phoneWords(phone)} and emailing it to ${email}.`
    return (
      <div>
        <h2 className="mb-5 font-display text-4xl leading-none text-navy">{`Your ${pass.name} is set up.`}</h2>
        <BookedCard service={pass.name} visits={pass.lines} where={where} status="Set up" />
        {photoLine}
        {cardLine}
        <Trail
          lines={[
            { key: "now", lead: "Now", text: sent },
            ...pass.exact.map((v) => ({ key: v.name, lead: longDay(dayBefore(v.day)), text: `A reminder by ${channelWords(channel)}: Ryan is coming tomorrow at ${clock12(v.start)} for your ${v.name.toLowerCase()}.` })),
            { key: "after", lead: "After each visit", text: "Your card is charged and we email your receipt." },
          ]}
        />
        {pass.exact.length > 0 && (
          <div className="mt-6">
            <AddToCalendarLinks googleHref="https://calendar.google.com/calendar/render?action=TEMPLATE" icsHref="/api/visits/v1/calendar.ics?token=t" />
          </div>
        )}
        {links}
      </div>
    )
  }
  if (quote || callback || !pick?.day || !pick.start) {
    const dest = channel === "email" ? email : channel === "text" ? phoneWords(phone) : `${phoneWords(phone)} and ${email}`
    return (
      <div>
        <h2 className="font-display text-4xl leading-none text-navy">{QUOTE_DONE}</h2>
        <p className="mt-3 text-base text-foreground">{`${service} at ${where}.`}</p>
        {photoLine}
        <p data-slot="done-contact" className="mt-4 text-base text-foreground">
          {`We'll use ${dest} to get back to you${quote ? " about your quote" : " about a day"}.`}
        </p>
        {quote && (
          <p data-slot="done-help" className="mt-4 text-base text-muted-foreground">
            {"Questions? Call Ryan at "}
            <a href={PHONE_TEL} className={LINK}>
              {PHONE_DISPLAY}
            </a>
            .
          </p>
        )}
        <div className="mt-6">
          <Link href="/" className={BLOCK_LINK}>
            Back to the website
          </Link>
        </div>
      </div>
    )
  }
  const now = channel === "text" ? `We're texting your confirmation to ${phoneWords(phone)}.` : channel === "email" ? `We're emailing your confirmation to ${email}.` : `We're texting your confirmation to ${phoneWords(phone)} and emailing it to ${email}.`
  return (
    <div>
      <h2 className="mb-5 font-display text-4xl leading-none text-navy">{`Your ${service.toLowerCase()} is booked.`}</h2>
      <BookedCard service={service} day={longDay(pick.day)} time={clock12(pick.start)} where={where} />
      {photoLine}
      {cardLine}
      <Trail
        lines={[
          { key: "now", lead: "Now", text: now },
          { key: "before", lead: longDay(dayBefore(pick.day)), text: `A reminder by ${channelWords(channel)}: Ryan is coming tomorrow at ${clock12(pick.start)}.` },
          { key: "after", lead: "After the visit", text: "You pay by card, check, Venmo or cash. We email your receipt." },
        ]}
      />
      <div className="mt-6">
        <AddToCalendarLinks googleHref="https://calendar.google.com/calendar/render?action=TEMPLATE" icsHref="/api/visits/v1/calendar.ics?token=t" />
      </div>
      {links}
    </div>
  )
}
