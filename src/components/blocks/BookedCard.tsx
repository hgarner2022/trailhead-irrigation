"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { CARD_ART, REST_STYLE, Sheen, useSheen } from "./PassCard"

// The confirmation card at the end of a booking, the second face of the holographic PassCard (Hannah, Nov 19 2026): the same wallet-card artwork, size, wash and live sheen,
// reading the service, the day with its exact time once ("Tuesday, April 20 at 10:30 am"), the street and who is coming. Never an arrival window. No booking number on it.
// A Season Pass (Nov 23 2026, Hannah: "you can't even see the card") is the clean wallet card with nothing dark over the art, exactly like the account's PassCard: the name, "Season Pass 2027", "Set up" and
// the town and zones when known. It has no day band; its visits are a plain list under the card (`booking-pass-visits.tsx`). Pure props apart from the sheen, which is the PassCard's own.

export interface BookedVisitLine {
  /** "Spring turn-on" */
  name: string
  /** "Tuesday, April 27 at 10:30 am" or "Preference: Our recommended, mid May" */
  when: string
  /** a preference's line of what happens next: "We'll schedule it about two weeks before and tell you the day." */
  note?: string
}

export interface BookedCardProps {
  /** "Sprinkler repair" */
  service: string
  /** "Tuesday, April 20"; a Season Pass leaves it out */
  day?: string
  /** "10:30 am" */
  time?: string
  /** a Season Pass: "Erie · 8 zones" under the status, as on the account's card; the visits are a list under the card */
  detail?: string
  /** "123 Briggs St, Erie" */
  where: string
  /** "Ryan" */
  who?: string
  /** the word under the name: "Booked", or "Set up" for a Season Pass, which is a setup and not an order */
  status?: string
  /** false: static sheen, no listeners */
  interactive?: boolean
  className?: string
}

export function BookedCard({ service, day, time, detail, where, who = "Ryan", status = "Booked", interactive = true, className }: BookedCardProps) {
  const { ref } = useSheen(interactive)
  const pass = day === undefined
  const label = pass ? `${service}, ${status.toLowerCase()}${detail ? `, ${detail}` : ""}` : `${service}, booked ${day} at ${time}, ${where}`
  return (
    <article
      ref={ref}
      data-slot="booked-card"
      aria-label={label}
      style={REST_STYLE}
      className={cn("@container group relative isolate aspect-[8/5] w-[640px] max-w-full overflow-hidden rounded-lg bg-navy shadow-lg", className)}
    >
      <Image src={CARD_ART.holo} alt="" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
      <Sheen art="holo" live={interactive} />
      <div aria-hidden className="absolute inset-0 bg-radial-[at_top_left] from-background/80 from-0% via-background/35 via-35% to-transparent to-65%" />
      <div className="absolute left-5 top-5 max-w-[60%] @max-[440px]:left-4 @max-[440px]:top-4">
        <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-navy @max-[440px]:text-[10px] @max-[440px]:tracking-[0.12em]">Trailhead Lawn &amp; Irrigation</p>
        <p className="mt-2 font-display text-4xl font-semibold leading-none text-navy @max-[440px]:mt-1.5 @max-[440px]:text-3xl">{service}</p>
        <p className="mt-1 font-display text-xl leading-tight text-navy/80 @max-[440px]:text-lg">{status}</p>
        {detail && <p className="mt-1.5 text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-navy/80 @max-[440px]:text-[10px]">{detail}</p>}
      </div>
      {pass ? null : (
        <div data-slot="booked-card-band" className="absolute inset-x-0 bottom-0 space-y-0.5 bg-navy/85 px-5 py-3 text-white backdrop-blur-sm @max-[440px]:px-4 @max-[440px]:py-2.5">
          <p className="font-display text-3xl leading-none @max-[440px]:text-2xl">
            {day} <span className="text-primary-light">{`at ${time}`}</span>
          </p>
          <p className="text-sm text-white/85 @max-[440px]:text-xs">{`${where}. ${who} is coming.`}</p>
        </div>
      )}
    </article>
  )
}
