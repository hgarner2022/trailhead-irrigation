import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

// The drawings a customer sees where there is nothing to show yet (EmptyState, `scene`): Trailhead's own world, a trail, the logo's sun, the mountains, a signpost, a compass.
// The same drawn system as ServiceIcon, one size up: navy line work with a single orange part, round caps and joins, here on a 48 grid at a 1.5 stroke so the line weighs the
// same at 56 to 72px as a service icon does at 36. Each draws itself once on first appearance and never again: it reuses ServiceIcon's own marks (`data-draw`, `data-pop`,
// `data-turn`, `data-rise`) and so the `.svc-icon` rules and the motion tokens in app/base.css, with no rule of its own. Nothing loops; under prefers-reduced-motion the
// finished drawing is simply shown. Decorative: always aria-hidden. Pure props, no client code.

export type TrailIconName = "trail" | "signpost" | "compass" | "photo" | "receipt"

export const TRAIL_ICONS: readonly TrailIconName[] = ["trail", "signpost", "compass", "photo", "receipt"]

export interface TrailIconProps {
  name: TrailIconName
  /** milliseconds before the drawing starts */
  delay?: number
  className?: string
}

/** `--d`: when a part starts inside its drawing, in ms. */
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties
const draw = (ms = 0) => ({ "data-draw": true, pathLength: 1, style: d(ms) })
const pop = (ms = 0) => ({ "data-pop": true, style: d(ms) })

function parts(name: TrailIconName, accent: string): ReactNode {
  switch (name) {
    // Nothing booked: two peaks, the logo's sun coming up between them, and a trail that winds from your feet to the pass.
    case "trail":
      return (
        <>
          <defs>
            <clipPath id="trail-sky">
              <path d="M0 0h48v30h-3L32 16l-9.500 10.200L15 14 4 30H0z" />
            </clipPath>
          </defs>
          <g clipPath="url(#trail-sky)" className={accent}>
            <g data-rise>
              <circle cx="25" cy="21" r="6.500" fill="currentColor" fillOpacity=".18" />
              <path d="M25 11.500V8.500" {...draw(300)} />
              <path d="M30.300 13.200 32 10.700" {...draw(360)} />
              <path d="M19.700 13.200 18 10.700" {...draw(360)} />
            </g>
          </g>
          <path d="M4 30 15 14l7.500 12.200" {...draw(0)} />
          <path d="M19 30 32 16l13 14" {...draw(120)} />
          <path d="M3 30h42" />
          <path d="M20 45c3-1 5-2 5-3.500 0-3-8-2.500-8-5.500 0-3 5-4 10-6" {...draw(460)} />
        </>
      )
    // No visits: the signpost at the trailhead, its board swinging level.
    case "signpost":
      return (
        <>
          <path d="M24 8v4M24 22v6M24 36v7" />
          <path d="M14 43h20" />
          <path d="M10 43c.500-2 1.500-3.500 3-4" opacity=".45" {...draw(360)} />
          <path d="M38 43c-.500-2-1.500-3.500-3-4" opacity=".45" {...draw(420)} />
          <g className={accent} data-turn style={{ transformBox: "view-box", transformOrigin: "24px 17px" }}>
            <path d="M13 12h20l5 5-5 5H13z" fill="currentColor" fillOpacity=".18" />
            <path d="M18 17h11" opacity=".7" />
          </g>
          <path d="M35 28H16l-4 4 4 4h19z" {...draw(240)} />
        </>
      )
    // A page that cannot be opened: a compass, its needle settling on the way.
    case "compass":
      return (
        <>
          <circle cx="24" cy="26" r="16" />
          <path d="M24 5v5" />
          <path d="M24 13.500v2M24 36.500v2M11.500 26h2M34.500 26h2" opacity=".45" />
          <g className={accent} data-turn style={{ transformBox: "view-box", transformOrigin: "24px 26px" }}>
            <path d="M30.500 19.500 27 29l-9.500 3.500L21 23z" fill="currentColor" fillOpacity=".18" />
          </g>
          <circle cx="24" cy="26" r="1.200" fill="currentColor" stroke="none" {...pop(380)} />
        </>
      )
    // No photos: a print with the peaks on it, the sun going up last.
    case "photo":
      return (
        <>
          <rect x="6" y="10" width="36" height="29" rx="3" {...draw(0)} />
          <path d="m6.500 33 9.500-11 7 8 5-5.500 13.500 11" {...draw(220)} />
          <g className={accent}>
            <circle cx="33" cy="18.500" r="3" fill="currentColor" fillOpacity=".18" {...pop(480)} />
          </g>
        </>
      )
    // No receipts: the slip off the roll, its lines, and the tick.
    case "receipt":
      return (
        <>
          <path d="M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3z" />
          <path d="M17 14h14" {...draw(80)} />
          <path d="M17 20h14" {...draw(160)} />
          <path d="M17 26h6" {...draw(240)} />
          <path d="m25 30 3 3 5.500-6.500" className={accent} {...draw(380)} />
        </>
      )
  }
}

export function TrailIcon({ name, delay = 0, className }: TrailIconProps) {
  return (
    <svg
      data-slot="trail-icon"
      data-icon={name}
      aria-hidden
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ "--svc-delay": `${delay}ms` } as CSSProperties}
      className={cn("svc-icon size-18 text-navy", className)}
    >
      {parts(name, "text-primary")}
    </svg>
  )
}
