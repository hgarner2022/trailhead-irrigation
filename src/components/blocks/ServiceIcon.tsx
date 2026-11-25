import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

// One drawn pictogram per service on the booking form's service cards: navy line work with a single orange part, every one on the same 32 grid at the same 1.75 stroke, in a 56px tile.
// Each draws itself once (strokes marked `data-draw`, `data-pop`, `data-turn` and `data-rise`, animated by the `.svc-icon` rules in
// app/base.css, where the motion tokens live); nothing loops, and under prefers-reduced-motion the finished drawing is simply shown.
// The parent replays a drawing by changing the element's `key`. `delay` staggers the cards on first appearance. A service with no
// drawing of its own gets the plain water drop. Decorative: always aria-hidden. Pure props, no client code.

export type ServiceIconName = "season-pass" | "spring-turn-on" | "fall-blowout" | "inspection" | "repair" | "rachio-install" | "water-efficiency" | "quote" | "drop"

const NAMES = new Set<string>(["season-pass", "spring-turn-on", "fall-blowout", "inspection", "repair", "rachio-install", "water-efficiency", "quote"])
/** The drawing for a service key; the plain drop when the service has none. */
export const iconFor = (key: string): ServiceIconName => (NAMES.has(key) ? (key as ServiceIconName) : "drop")

export interface ServiceIconProps {
  name: ServiceIconName
  /** milliseconds before the drawing starts: the cards' stagger on first load */
  delay?: number
  className?: string
}

/** `--d`: when a part starts inside its icon's drawing, in ms. */
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties
const draw = (ms = 0) => ({ "data-draw": true, pathLength: 1, style: d(ms) })
const pop = (ms = 0) => ({ "data-pop": true, style: d(ms) })

function parts(name: ServiceIconName, accent: string): ReactNode {
  switch (name) {
    // The logo's sun coming up over its horizon, five rays drawing out.
    case "season-pass":
      return (
        <>
          <defs>
            <clipPath id="svc-sky">
              <rect x="0" y="0" width="32" height="22" />
            </clipPath>
          </defs>
          <path d="M4 22.5h24" />
          <path d="M9 26.5h14" opacity=".45" />
          <g clipPath="url(#svc-sky)" className={accent}>
            <g data-rise>
              <path d="M10 22.5a6 6 0 0 1 12 0" fill="currentColor" fillOpacity=".18" />
              <path d="M16 13.5V10" {...draw(260)} />
              <path d="M20.25 14.6 22 11.6" {...draw(320)} />
              <path d="M11.75 14.6 10 11.6" {...draw(320)} />
              <path d="M23.4 17.75 26.4 16" {...draw(380)} />
              <path d="M8.6 17.75 5.6 16" {...draw(380)} />
            </g>
          </g>
        </>
      )
    // A sprinkler head; its arcs of water draw outward.
    case "spring-turn-on":
      return (
        <>
          <path d="M7 27h18" />
          <path d="M16 27v-6" />
          <path d="M12.5 21h7" />
          <g className={accent}>
            <path d="M16 17.5V9" {...draw(120)} />
            <path d="M13.5 18c-.8-4-3.6-6.6-8-7.2" {...draw(200)} />
            <path d="M18.5 18c.8-4 3.6-6.6 8-7.2" {...draw(200)} />
            <circle cx="16" cy="6" r="1" fill="currentColor" stroke="none" {...pop(520)} />
            <circle cx="3.6" cy="12.6" r="1" fill="currentColor" stroke="none" {...pop(580)} />
            <circle cx="28.4" cy="12.6" r="1" fill="currentColor" stroke="none" {...pop(580)} />
          </g>
        </>
      )
    // Air through the lines, and the first snowflake.
    case "fall-blowout":
      return (
        <>
          <path d="M4 14h10.5a3 3 0 1 0-3-3" {...draw(0)} />
          <path d="M4 19h17.5a3 3 0 1 1-3 3" {...draw(100)} />
          <path d="M4 24h7" {...draw(200)} />
          <g className={accent} {...pop(420)}>
            <path d="M24 5.5v7M21 7.25l6 3.5M27 7.25l-6 3.5" />
          </g>
        </>
      )
    // A clipboard, checked.
    case "inspection":
      return (
        <>
          <path d="M11.5 7H10a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1.5" />
          <rect x="11.500" y="4.500" width="9" height="5" rx="1.500" />
          <path d="m12 18 3 3 5.500-6.500" className={accent} {...draw(220)} />
        </>
      )
    // A wrench that makes a small turn on its nut.
    case "repair":
      return (
        <>
          <g data-turn>
            <path d="M18.7 10.300a1 1 0 0 0 0 1.400l1.600 1.600a1 1 0 0 0 1.400 0l3.770-3.770a6 6 0 0 1-7.940 7.940l-6.910 6.910a2.120 2.120 0 0 1-3-3l6.910-6.910a6 6 0 0 1 7.940-7.940l-3.760 3.760z" />
          </g>
          <g className={accent}>
            <path d="M25.500 20.500v3M24 22h3" {...draw(360)} />
            <circle cx="9.100" cy="22.900" r=".9" fill="currentColor" stroke="none" {...pop(300)} />
          </g>
        </>
      )
    // The controller on the wall, finding the Wi-Fi.
    case "rachio-install":
      return (
        <>
          <rect x="8" y="13" width="16" height="14" rx="3" />
          <circle cx="16" cy="20" r="3" />
          <g className={accent}>
            <circle cx="16" cy="10" r="1.100" fill="currentColor" stroke="none" {...pop(120)} />
            <path d="M13.200 7.600a4 4 0 0 1 5.600 0" {...draw(260)} />
            <path d="M10.700 5.200a7.500 7.500 0 0 1 10.600 0" {...draw(380)} />
          </g>
        </>
      )
    // A drop of water with a leaf in it.
    case "water-efficiency":
      return (
        <>
          <path d="M16 4.500c4.300 5 7.500 8.800 7.500 13a7.500 7.500 0 0 1-15 0c0-4.200 3.200-8 7.500-13z" {...draw(0)} />
          <g className={accent}>
            <path d="M12.500 22c0-4.300 2.900-6.800 7.200-6.800 0 4.300-2.900 7.200-7.200 6.800z" fill="currentColor" fillOpacity=".18" {...draw(260)} />
            <path d="m12.500 22 4.200-4.200" {...draw(420)} />
          </g>
        </>
      )
    // A written quote: a page with its lines and a small mark.
    case "quote":
      return (
        <>
          <path d="M9 5h10l5 5v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          <path d="M19 5v5h5" />
          <path d="M11 15h10" {...draw(80)} />
          <path d="M11 19h10" {...draw(160)} />
          <path d="M11 23h5" className={accent} {...draw(260)} />
        </>
      )
    default:
      return <path d="M16 4.500c4.300 5 7.500 8.800 7.500 13a7.500 7.500 0 0 1-15 0c0-4.200 3.200-8 7.500-13z" {...draw(0)} />
  }
}

export function ServiceIcon({ name, delay = 0, className }: ServiceIconProps) {
  return (
    <svg
      data-slot="service-icon"
      data-icon={name}
      aria-hidden
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ "--svc-delay": `${delay}ms` } as CSSProperties}
      className={cn("svc-icon size-9 text-navy", className)}
    >
      {parts(name, "text-primary")}
    </svg>
  )
}
