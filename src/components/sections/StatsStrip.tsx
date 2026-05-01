"use client"

import { useEffect, useRef, useState } from "react"
import { Star, MapPin, Phone, Wrench } from "lucide-react"

// Quick credibility numbers for the homepage. Numbers count up from zero
// when the strip first enters the viewport — industry-standard polish that
// makes the stats feel more impressive without being gimmicky. Honors
// prefers-reduced-motion (snaps to final value instantly).

type Stat = {
  icon: typeof Star
  /** Numeric target. null = render `headline` as static text (e.g. "Same-day"). */
  target: number | null
  /** Decimal places when animating (e.g. 1 for "5.0"). */
  decimals?: number
  /** Suffix appended after the number (e.g. "★", "%", "+"). */
  suffix?: string
  /** Used when target === null (no animation). */
  headline?: string
  label: string
}

const STATS: Stat[] = [
  {
    icon: Star,
    target: 5.0,
    decimals: 1,
    suffix: " ★",
    label: "Google reviews",
  },
  {
    icon: Wrench,
    target: 100,
    suffix: "%",
    label: "Jobs done by Ryan personally",
  },
  {
    icon: MapPin,
    target: 5,
    suffix: "+",
    label: "Northern Colorado cities served",
  },
  {
    icon: Phone,
    target: null,
    headline: "Same-day",
    label: "Callbacks, every time",
  },
]

const DURATION_MS = 1200

export function StatsStrip() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    // Honor reduced motion: skip animation, render final values immediately.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setAnimate(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setAnimate(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="bg-background border-y border-border py-12 md:py-16"
      aria-label="Trailhead at a glance"
    >
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center gap-2"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-1">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-navy tracking-tight">
                {stat.target !== null ? (
                  <CounterValue
                    target={stat.target}
                    decimals={stat.decimals ?? 0}
                    suffix={stat.suffix}
                    play={animate}
                  />
                ) : (
                  stat.headline
                )}
              </p>
              <p className="text-sm text-muted-foreground leading-snug max-w-[180px]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CounterValue({
  target,
  decimals,
  suffix,
  play,
}: {
  target: number
  decimals: number
  suffix?: string
  /** Start the count when this becomes true. */
  play: boolean
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!play) return

    let frame = 0
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / DURATION_MS, 1)
      // easeOutCubic — feels snappy at start, settles at end
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [play, target])

  return (
    <>
      {value.toFixed(decimals)}
      {suffix}
    </>
  )
}
