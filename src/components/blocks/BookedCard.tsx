import Image from "next/image"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// The confirmation card at the end of a booking (docs/plans/2026-11-18-online-booking-design.md section 4.7): the Trailhead badge, the service in the display face, the day big, the
// booked time and the half hour Ryan arrives in, the street and who is coming. It is the one moment the customer remembers, so it is a card of its own on navy; the Season Pass keeps the
// holographic PassCard. No booking number on it. Pure props, server-safe.

export interface BookedCardProps {
  /** "Sprinkler repair" */
  service: string
  /** "Tuesday, April 20" */
  day: string
  /** "10:30 am" */
  time: string
  /** "between 10:30 and 11:00 am" */
  window: string
  /** "123 Briggs St, Erie" */
  where: string
  /** "Ryan" */
  who?: string
  className?: string
}

export function BookedCard({ service, day, time, window, where, who = "Ryan", className }: BookedCardProps) {
  return (
    <Card data-slot="booked-card" className={cn("overflow-hidden border-navy bg-navy text-white", className)}>
      <div className="flex items-start gap-4 p-6">
        <span className="shrink-0 rounded-lg bg-white p-1.5">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-10 w-auto" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Booked</p>
          <p className="font-display text-3xl leading-none">{service}</p>
        </div>
      </div>
      <div className="space-y-1 border-t border-white/15 p-6">
        <p className="font-display text-4xl leading-none">{day}</p>
        <p className="font-display text-3xl leading-none text-primary-light">{`at ${time}`}</p>
        <p className="pt-2 text-base text-white/90">{`${who} arrives ${window}.`}</p>
        <p className="text-base text-white/85">{where}</p>
      </div>
    </Card>
  )
}
