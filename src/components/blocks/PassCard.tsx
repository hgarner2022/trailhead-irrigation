"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import Image from "next/image"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Pass, PassVisit } from "@/lib/admin/types"
import { shortDate, writtenDate } from "@/lib/admin/format"
import { SHEEN_REST, attachPointer, attachTilt, canRequestTilt, frameWriter, reducedMotion, requestTilt } from "./pass-card-sheen"

// A wallet card at credit card proportions: the reserved moment at the end of
// the Season Pass checkout, the top of the customer's pass page, and a thumbnail
// in the admin side panel. The artwork fills the card; the name, pass number
// and the three visits are live text over it. The sheen is a blended gradient
// layer under the text that slides with the pointer on a laptop and with the
// phone's tilt, and eases back to rest when the pointer leaves. It is the only
// holographic effect on the site.

export interface PassCardProps {
  pass: Pass
  /**
   * full: 640px wide by default with `max-w-full`, so the parent controls the
   * width by constraining it. thumb: 160px wide, first name and season only,
   * static sheen.
   */
  size?: "full" | "thumb"
  /** holo: the artwork with the baked-in rainbow; the live sheen is halved */
  art?: "flat" | "holo"
  /** false: static sheen, no listeners */
  interactive?: boolean
  /** Passed to `next/image`: true where the card is the hero image, as at the end of checkout and on the pass page */
  priority?: boolean
  className?: string
}

const ART = { flat: "/images/pass-card-art.webp", holo: "/images/pass-card-art-holo.webp" }
const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Turn-on", inspection: "Inspection", blowout: "Blowout" }
const REST_STYLE = { "--sheen-x": SHEEN_REST.x, "--sheen-y": SHEEN_REST.y } as CSSProperties
const never = () => () => {}

function describe(pass: Pass): string {
  const head = `Season Pass ${pass.season} for ${pass.firstName}, ${pass.town}`
  if (pass.status === "cancelled") return `${head}, cancelled`
  const blowout = pass.visits.find((v) => v.kind === "blowout")
  if (blowout?.completedAt) return `${head}, blowout done on ${writtenDate(blowout.completedAt)}`
  return `${head}, blowout reserved for the week of ${writtenDate(pass.blowoutWeek)}`
}

function VisitCell({ visit, pass }: { visit: PassVisit; pass: Pass }) {
  const reserved = visit.kind === "blowout" && !visit.completedAt
  const value = visit.completedAt
    ? shortDate(visit.completedAt)
    : visit.scheduledAt
      ? shortDate(visit.scheduledAt)
      : reserved
        ? `Week of ${shortDate(pass.blowoutWeek)}`
        : visit.window
  return (
    <div data-slot="pass-visit" data-kind={visit.kind} className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] uppercase leading-tight tracking-wide text-white/70 @max-[440px]:text-[10px]">
        <span className={cn(reserved && "@max-[440px]:hidden")}>{VISIT_NAMES[visit.kind]}</span>
        {reserved && (
          <span className="rounded-full bg-primary-light/20 px-1.5 py-px text-[9px] font-semibold tracking-wider text-primary-light @max-[440px]:bg-transparent @max-[440px]:px-0 @max-[440px]:text-[10px] @max-[440px]:font-normal @max-[440px]:tracking-wide">
            Reserved
          </span>
        )}
      </div>
      <div className={cn("mt-0.5 flex items-center gap-1 text-sm font-medium leading-tight @max-[440px]:text-xs", reserved && "font-semibold text-primary-light")}>
        <span className="truncate">{value}</span>
        {visit.completedAt && (
          <>
            <Check className="size-3.5 shrink-0 text-primary-light" strokeWidth={3} aria-hidden />
            <span className="sr-only">done</span>
          </>
        )}
      </div>
    </div>
  )
}

function Sheen({ art, live }: { art: "flat" | "holo"; live: boolean }) {
  return (
    <div
      data-slot="pass-card-sheen"
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-1/2 mix-blend-overlay",
        "translate-x-[calc((var(--sheen-x)_-_0.5)*40%)] translate-y-[calc((var(--sheen-y)_-_0.5)*40%)]",
        art === "holo" ? "opacity-40" : "opacity-80",
        live && "transition-[translate] duration-400 ease-out group-data-[sheen-tracking]:transition-none motion-reduce:transition-none",
      )}
    >
      <div className="absolute inset-0 bg-linear-150 from-transparent from-34% via-primary-light/50 via-44% to-transparent to-52%" />
      <div className="absolute inset-0 bg-linear-150 from-transparent from-46% via-white/75 via-50% to-transparent to-54%" />
      <div className="absolute inset-0 bg-linear-150 from-transparent from-56% via-navy/40 via-63% to-transparent to-70%" />
    </div>
  )
}

export function PassCard({ pass, size = "full", art = "flat", interactive = true, priority = false, className }: PassCardProps) {
  const ref = useRef<HTMLElement>(null)
  // iOS gates the tilt sensor behind a tap; null means not asked yet.
  const gated = useSyncExternalStore(never, canRequestTilt, () => false)
  const [granted, setGranted] = useState<boolean | null>(null)
  const cancelled = pass.status === "cancelled"
  const live = interactive && size === "full" && !cancelled

  useEffect(() => {
    const el = ref.current
    if (!el || !live || reducedMotion()) return
    const writer = frameWriter(el)
    const stopPointer = attachPointer(el, writer)
    const stopTilt = gated && !granted ? never() : attachTilt(el, writer)
    return () => {
      stopPointer()
      stopTilt()
      writer.cancel()
    }
  }, [live, gated, granted])

  const askTilt = async () => setGranted(await requestTilt())

  return (
    <article
      ref={ref}
      data-slot="pass-card"
      data-size={size}
      data-art={art}
      data-status={pass.status}
      aria-label={describe(pass)}
      style={REST_STYLE}
      className={cn(
        "@container group relative isolate aspect-[8/5] overflow-hidden rounded-lg bg-navy shadow-lg",
        size === "thumb" ? "w-40" : "w-[640px] max-w-full",
        className,
      )}
    >
      <Image
        src={ART[art]}
        alt=""
        fill
        priority={priority}
        sizes={size === "thumb" ? "160px" : "(max-width: 768px) 100vw, 640px"}
        className={cn("object-cover", cancelled && "grayscale")}
      />
      {!cancelled && <Sheen art={art} live={live} />}
      <div aria-hidden className="absolute inset-0 bg-radial-[at_top_left] from-background/80 from-0% via-background/35 via-35% to-transparent to-65%" />

      {size === "thumb" ? (
        <>
          <div className="absolute left-2.5 top-2.5">
            <p className="font-display text-lg font-semibold leading-none text-navy">{pass.firstName}</p>
            <p className="mt-0.5 font-display text-xs text-navy/80">{pass.season}</p>
          </div>
          {cancelled && (
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-navy/85 px-2 py-0.5 text-[10px] uppercase leading-tight tracking-wide text-white">
              Cancelled
            </span>
          )}
        </>
      ) : (
        <>
          <div data-slot="pass-card-name" className="absolute left-5 top-5 max-w-[45%] @max-[440px]:left-4 @max-[440px]:top-4">
            <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-navy @max-[440px]:text-[10px] @max-[440px]:tracking-[0.12em]">
              Trailhead Lawn &amp; Irrigation
            </p>
            <p className="mt-2 font-display text-4xl font-semibold leading-none text-navy @max-[440px]:mt-1.5 @max-[440px]:text-3xl">{pass.firstName}</p>
            <p className="mt-1 font-display text-xl leading-tight text-navy/80 @max-[440px]:text-lg">Season Pass {pass.season}</p>
            <p className="mt-1.5 text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-navy/80 @max-[440px]:text-[10px]">
              {pass.town} · {pass.zones} zones
            </p>
          </div>
          {live && gated && granted === null && (
            <Button
              size="sm"
              variant="ghost"
              onClick={askTilt}
              aria-label="Turn on the tilt shine"
              className="absolute right-3 top-3 h-7 rounded-lg bg-background/70 px-2.5 text-xs text-navy before:absolute before:-inset-2 before:content-['']"
            >
              Tilt
            </Button>
          )}
          <div
            data-slot="pass-card-band"
            className="absolute inset-x-0 bottom-0 flex items-center gap-4 bg-navy/85 px-5 py-2.5 text-white backdrop-blur-sm @max-[440px]:gap-2 @max-[440px]:px-4 @max-[440px]:py-2"
          >
            {cancelled ? (
              <span className="text-sm font-medium">Cancelled</span>
            ) : (
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-3 @max-[440px]:gap-2">
                {pass.visits.map((visit) => (
                  <VisitCell key={visit.kind} visit={visit} pass={pass} />
                ))}
              </div>
            )}
            <span className="ml-auto shrink-0 font-display text-sm tabular-nums text-white/80 @max-[440px]:text-xs">{pass.number}</span>
          </div>
        </>
      )}
    </article>
  )
}
