"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { CARD_ART, REST_STYLE, Sheen, useSheen } from "./PassCard"

// The confirmation card at the end of a booking, the second face of the holographic PassCard (Hannah, Nov 19 2026): the same wallet-card artwork, size, wash and live sheen,
// reading the service, the day with its exact time once ("Tuesday, April 20 at 10:30 am"), the street and who is coming. Never an arrival window. No booking number on it.
// The Season Pass shows its own face (PassCard). Pure props apart from the sheen, which is the PassCard's own.

export interface BookedCardProps {
  /** "Sprinkler repair" */
  service: string
  /** "Tuesday, April 20" */
  day: string
  /** "10:30 am" */
  time: string
  /** "123 Briggs St, Erie" */
  where: string
  /** "Ryan" */
  who?: string
  /** false: static sheen, no listeners */
  interactive?: boolean
  className?: string
}

export function BookedCard({ service, day, time, where, who = "Ryan", interactive = true, className }: BookedCardProps) {
  const { ref } = useSheen(interactive)
  return (
    <article
      ref={ref}
      data-slot="booked-card"
      aria-label={`${service}, booked ${day} at ${time}, ${where}`}
      style={REST_STYLE}
      className={cn("@container group relative isolate aspect-[8/5] w-[640px] max-w-full overflow-hidden rounded-lg bg-navy shadow-lg", className)}
    >
      <Image src={CARD_ART.holo} alt="" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
      <Sheen art="holo" live={interactive} />
      <div aria-hidden className="absolute inset-0 bg-radial-[at_top_left] from-background/80 from-0% via-background/35 via-35% to-transparent to-65%" />
      <div className="absolute left-5 top-5 max-w-[60%] @max-[440px]:left-4 @max-[440px]:top-4">
        <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-navy @max-[440px]:text-[10px] @max-[440px]:tracking-[0.12em]">Trailhead Lawn &amp; Irrigation</p>
        <p className="mt-2 font-display text-4xl font-semibold leading-none text-navy @max-[440px]:mt-1.5 @max-[440px]:text-3xl">{service}</p>
        <p className="mt-1 font-display text-xl leading-tight text-navy/80 @max-[440px]:text-lg">Booked</p>
      </div>
      <div data-slot="booked-card-band" className="absolute inset-x-0 bottom-0 space-y-0.5 bg-navy/85 px-5 py-3 text-white backdrop-blur-sm @max-[440px]:px-4 @max-[440px]:py-2.5">
        <p className="font-display text-3xl leading-none @max-[440px]:text-2xl">
          {day} <span className="text-primary-light">{`at ${time}`}</span>
        </p>
        <p className="text-sm text-white/85 @max-[440px]:text-xs">{`${where}. ${who} is coming.`}</p>
      </div>
    </article>
  )
}
