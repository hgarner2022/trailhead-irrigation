"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { CARD_ART, REST_STYLE, Sheen, useSheen } from "./PassCard"

// The confirmation card at the end of a booking, the second face of the holographic PassCard (Hannah, Nov 19 2026): the same wallet-card artwork, size, wash and live sheen,
// reading the service, the day with its exact time once ("Tuesday, April 20 at 10:30 am"), the street and who is coming. Never an arrival window. No booking number on it.
// A Season Pass (Nov 20 2026) gives `visits` instead of a day: one line for every visit, either its exact day and time or "Preference: Early October" with the sentence that says when it is
// scheduled, on the same card; it grows to fit them. Pure props apart from the sheen, which is the PassCard's own.

export interface BookedVisitLine {
  /** "Spring turn-on" */
  name: string
  /** "Tuesday, April 27 at 10:30 am" or "Preference: Early October" */
  when: string
  /** a preference's line of what happens next: "We'll schedule it about two weeks before and tell you the day." */
  note?: string
}

export interface BookedCardProps {
  /** "Sprinkler repair" */
  service: string
  /** "Tuesday, April 20"; with `visits` it is left out */
  day?: string
  /** "10:30 am" */
  time?: string
  /** a Season Pass: one line per visit */
  visits?: readonly BookedVisitLine[]
  /** "123 Briggs St, Erie" */
  where: string
  /** "Ryan" */
  who?: string
  /** false: static sheen, no listeners */
  interactive?: boolean
  className?: string
}

export function BookedCard({ service, day, time, visits, where, who = "Ryan", interactive = true, className }: BookedCardProps) {
  const { ref } = useSheen(interactive)
  const several = Boolean(visits && visits.length > 0)
  const label = several ? `${service}, booked, ${visits!.map((v) => `${v.name} ${v.when}`).join(", ")}, ${where}` : `${service}, booked ${day} at ${time}, ${where}`
  const place = several ? "relative" : "absolute"
  return (
    <article
      ref={ref}
      data-slot="booked-card"
      aria-label={label}
      style={REST_STYLE}
      className={cn("@container group relative isolate w-[640px] max-w-full overflow-hidden rounded-lg bg-navy shadow-lg", several ? "flex min-h-[18rem] flex-col justify-between" : "aspect-[8/5]", className)}
    >
      <Image src={CARD_ART.holo} alt="" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
      <Sheen art="holo" live={interactive} />
      <div aria-hidden className="absolute inset-0 bg-radial-[at_top_left] from-background/80 from-0% via-background/35 via-35% to-transparent to-65%" />
      <div className={cn(place, "left-5 top-5 max-w-[60%] @max-[440px]:left-4 @max-[440px]:top-4", several && "m-5 @max-[440px]:m-4")}>
        <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-navy @max-[440px]:text-[10px] @max-[440px]:tracking-[0.12em]">Trailhead Lawn &amp; Irrigation</p>
        <p className="mt-2 font-display text-4xl font-semibold leading-none text-navy @max-[440px]:mt-1.5 @max-[440px]:text-3xl">{service}</p>
        <p className="mt-1 font-display text-xl leading-tight text-navy/80 @max-[440px]:text-lg">Booked</p>
      </div>
      {several ? (
        <div data-slot="booked-card-band" className="relative space-y-3 bg-navy/85 px-5 py-3 text-white backdrop-blur-sm @max-[440px]:px-4 @max-[440px]:py-2.5">
          <ul className="space-y-2.5">
            {visits!.map((v) => (
              <li key={v.name} data-slot="booked-card-visit">
                <p className="font-display text-2xl leading-none @max-[440px]:text-xl">
                  {v.name} <span className="text-primary-light">{v.when}</span>
                </p>
                {v.note && <p className="mt-1 text-sm text-white/85 @max-[440px]:text-xs">{v.note}</p>}
              </li>
            ))}
          </ul>
          <p className="text-sm text-white/85 @max-[440px]:text-xs">{visits!.some((v) => !v.note) ? `${where}. ${who} is coming.` : `${where}.`}</p>
        </div>
      ) : (
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
