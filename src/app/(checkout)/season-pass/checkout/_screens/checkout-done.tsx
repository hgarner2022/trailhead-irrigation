"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PassCard } from "@/components/blocks/PassCard"
import type { Pass } from "@/lib/admin/types"
import { fireSeasonPassPurchase } from "@/lib/analytics"
import { nextLines } from "./checkout-next"

/** The customer's pass page is behind the email sign-in; the address rides along so the box is already filled. */
export const passPageHref = (email: string) => `/account/sign-in?email=${encodeURIComponent(email)}`

/**
 * The last screen: the pass card as the hero, then what happens next on a trail line (a rail down the left, an orange stop for each
 * visit, the month in the display face), the email line, and the two actions.
 */
export function DoneStep({ pass, email, chosen, onSaveImage, onDone }: { pass: Pass; email: string; chosen?: readonly { kind: string; day: string }[]; onSaveImage?: () => void; onDone?: () => void }) {
  // The purchase event fires once, when the season is reserved; Done is terminal, so this mounts once per purchase.
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    fireSeasonPassPurchase({ number: pass.number, zones: pass.zones, passTotal: pass.visits.reduce((sum, v) => sum + v.amount, 0), inspection: pass.visits.some((v) => v.kind === "inspection") })
  }, [pass])
  const lines = nextLines(pass, chosen)
  return (
    <div>
      <PassCard pass={pass} art="flat" priority />
      <section data-slot="done-next" aria-labelledby="done-next-heading" className="mt-10">
        <h2 id="done-next-heading" className="text-xs font-semibold uppercase tracking-wide text-primary-dark">
          What happens next
        </h2>
        <ol className="mt-5 ml-1.5 border-l-2 border-navy/15">
          {lines.map((line) => (
            <li key={line.key} className="relative pb-6 pl-6 last:pb-0">
              <span aria-hidden className="absolute top-[0.55rem] -left-[0.4375rem] size-3 rounded-full border-2 border-cream bg-primary" />
              <p className="font-display text-2xl leading-none text-navy">{line.lead}</p>
              <p className="mt-1.5 text-base text-foreground">{line.text}</p>
              {line.note && (
                <p data-slot="done-day-moved" className="mt-1.5 text-base text-foreground">
                  {line.note}
                </p>
              )}
              {line.calendar && (
                <p data-slot="add-to-calendar" className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={line.calendar.google} target="_blank" rel="noreferrer">
                      Add to Google Calendar
                    </a>
                  </Button>
                  {line.calendar.ics && (
                    <Button asChild variant="outline" size="sm">
                      <a href={line.calendar.ics}>Add to Apple or Outlook calendar</a>
                    </Button>
                  )}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <p data-slot="done-email" className="mt-8 text-base text-muted-foreground">
        We emailed your pass and a link to{" "}
        <Link href={passPageHref(email)} className="font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep">
          your pass page
        </Link>{" "}
        to {email}.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={onSaveImage}>
          Save as image
        </Button>
        <Button size="lg" variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
