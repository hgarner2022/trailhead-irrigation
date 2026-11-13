import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { checkoutEnabled } from "@/lib/flags"
import { MAX_ZONES, MIN_ZONES } from "@/lib/season-pass"
import { CheckoutFlow } from "./_screens/CheckoutFlow"

// The Season Pass checkout, served only while SEASON_PASS_CHECKOUT=on. Until
// the checkout is wired it renders the approved prototype with no callbacks.
// Dynamic so the flag is read on every request.
export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Season Pass checkout" }

/** The calendar year through October, the next year from November (wiring plan, decision 15). */
function seasonFor(today: Date): number {
  return today.getMonth() >= 10 ? today.getFullYear() + 1 : today.getFullYear()
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ zones?: string }> }) {
  if (!checkoutEnabled()) notFound()
  const { zones } = await searchParams
  const parsed = Number(zones)
  const initialZones = Number.isInteger(parsed) && parsed >= MIN_ZONES && parsed <= MAX_ZONES ? parsed : undefined
  return <CheckoutFlow season={seasonFor(new Date())} initialZones={initialZones} />
}
