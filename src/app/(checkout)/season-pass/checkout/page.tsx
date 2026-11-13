import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { readOptionalEnv } from "@/lib/env"
import { checkoutEnabled } from "@/lib/flags"
import { MAX_ZONES, MIN_ZONES } from "@/lib/season-pass"
import { CheckoutClient } from "./CheckoutClient"
import { beginCheckout, finishCheckout } from "./actions"

// The Season Pass checkout, served only while SEASON_PASS_CHECKOUT=on. With
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set it is wired to the server actions in
// actions.ts and Stripe's embedded card form; without it, the approved prototype.
// Dynamic so the flag is read on every request.
export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Season Pass checkout" }

/**
 * The calendar year through October, the next year from November (wiring plan,
 * decision 15). The month is read in Mountain time, not the server's zone, so
 * the season turns over at midnight in Colorado on 1 November.
 */
function denverDay(today: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(today)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

function seasonFor(today: Date): number {
  const [year, month] = denverDay(today).split("-").map(Number)
  return month >= 11 ? year + 1 : year
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ zones?: string }> }) {
  if (!checkoutEnabled()) notFound()
  const { zones } = await searchParams
  const parsed = Number(zones)
  const initialZones = Number.isInteger(parsed) && parsed >= MIN_ZONES && parsed <= MAX_ZONES ? parsed : undefined
  const now = new Date()
  // With a publishable key the checkout is wired to the server actions and Stripe's card form; without one it is the prototype.
  const stripeKey = readOptionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
  return (
    <CheckoutClient
      season={seasonFor(now)}
      today={denverDay(now)}
      initialZones={initialZones}
      {...(stripeKey ? { stripeKey, onBegin: beginCheckout, onFinish: finishCheckout } : {})}
    />
  )
}
