// A repeat customer in the booking form, recognised by their ADDRESS and nothing else (Hannah, Nov 23 2026: no sign-in and no emailed code; docs/plans/2026-11-23-booking-day-time-and-repeat-research.md,
// section 4). The normalized street and ZIP find the property. A found address is "On file": the booking links to that customer and property, so no duplicate is made. **Nothing personal is shown back**
// (no name, phone, email, card, gate code or access note), because anyone who knows an address could type it; only non-sensitive yard facts prefill (the zone count and the controller). The card on file is
// offered only after the contact step, and only when the email typed there is the email on file for that property's customer; otherwise the form asks for a card as for a new customer. Pure.
import type { PlaceSuggestion } from "@/lib/places"

/** What Trailhead holds for a property, as far as the form may read it: the yard's non-sensitive facts, whose email is on file and the card's brand and last four. None of it is shown until the rules below allow. */
export interface KnownProperty {
  /** the normalized street and ZIP (`addressKey`) */
  key: string
  /** non-sensitive yard facts that prefill */
  zones: number
  controller: string | null
  /** the email on file for the property's customer: compared, never shown */
  email: string
  /** "Visa ending 4242"; null when no card is on file */
  card: string | null
}

const WORDS: Record<string, string> = { street: "st", avenue: "ave", road: "rd", drive: "dr", lane: "ln", court: "ct", circle: "cir", boulevard: "blvd", place: "pl", way: "way", north: "n", south: "s", east: "e", west: "w" }

/** "480 Briggs Street" and "480 briggs st." are the same street. */
export function normalizeStreet(line1: string): string {
  return line1
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => WORDS[w] ?? w)
    .join(" ")
}

/** The key a property is found by: the normalized street and the five digit ZIP. An address with no ZIP has no key (nothing is matched on a street alone). */
export function addressKey(place: Pick<PlaceSuggestion, "line1" | "zip">): string | null {
  const zip = place.zip.replace(/\D/g, "").slice(0, 5)
  return zip.length === 5 && place.line1.trim() !== "" ? `${normalizeStreet(place.line1)}|${zip}` : null
}

export const sameEmail = (a: string, b: string) => a.trim() !== "" && a.trim().toLowerCase() === b.trim().toLowerCase()

/** The card to offer: the one on file, only when the email typed on the contact step is the one on file for the property's customer. */
export const cardToOffer = (known: KnownProperty | null, email: string): string | null => (known?.card && sameEmail(email, known.email) ? known.card : null)

/** A found address with another email: it books as the same property, and the office is told. */
export const emailDiffers = (known: KnownProperty | null, email: string): boolean => known !== null && email.trim() !== "" && !sameEmail(email, known.email)

/** The prototype's stand-in: one property, 480 Briggs St in Erie (80516), Andrea Dalton's. The live form asks the server, which answers the same way for every visitor. */
export const FIXTURE_KNOWN: KnownProperty = { key: "480 briggs st|80516", zones: 10, controller: "Rachio", email: "andrea.dalton@example.com", card: "Visa ending 4242" }
export const fixtureKnown = (place: Pick<PlaceSuggestion, "line1" | "zip"> | null): KnownProperty | null => (place && addressKey(place) === FIXTURE_KNOWN.key ? FIXTURE_KNOWN : null)

/** The words the form uses for it. The mark sits on the review's address row, beside nothing personal. */
export const PROPERTY_MARK = { onFile: "On file", fresh: "New" } as const
export const CARD_ON_FILE_WORDS = { use: "Use the card on file", other: "Use a different card" } as const
