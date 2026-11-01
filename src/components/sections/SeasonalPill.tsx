"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"
import { getSeasonalPromo } from "@/lib/nav"

const noopSubscribe = () => () => {}
const promoKey = () => {
  const p = getSeasonalPromo(new Date())
  return `${p.href}|${p.label}`
}

// Resolved on the client so a page built in one month never shows a stale
// promo. The server snapshot is empty, which is the sanctioned way to let
// server and client render differently without a hydration mismatch.
export function SeasonalPill({ className, onDark }: { className?: string; onDark?: boolean }) {
  const key = useSyncExternalStore(noopSubscribe, promoKey, () => "")
  if (!key) return null
  const [href, label] = key.split("|")
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
        onDark
          ? "bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
          : "bg-stone text-foreground hover:bg-border/70",
        className
      )}
    >
      <span className="h-2 w-2 rounded-full bg-primary-light" aria-hidden="true" />
      {label}
    </Link>
  )
}
