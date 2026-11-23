// A returning customer in the booking form, pure (docs/plans/2026-11-19-booking-form-design.md, "Repeat customers (Nov 22 2026)"). When the email or the phone at the contact step matches someone Trailhead
// already has, the form offers a sign-in link by text or email. Nothing about the person (not the name, not the address, not the card) is shown until the link is opened: an unverified visitor sees only
// the offer and where the link would go, masked. Opened, the contact fields, the preference and the card are filled in and stay changeable, and one line, "Not you?", puts them back. A visitor who leaves
// the form leaves nothing: the match is a lookup and stores nothing, and the link is sent only when it is pressed.
import type { ContactChannel } from "@/components/blocks/ContactPreference"

/** What Trailhead holds for a customer, as the form reads it once the customer has verified. */
export interface SavedCustomer {
  firstName: string
  lastName: string
  email: string
  phone: string
  channel: ContactChannel
  /** the saved property, one line */
  address: string
  /** "Visa ending 4242" */
  card: string
}

/** Where the form is with a returning customer: no match, the offer is showing, the link was sent, the customer verified, or said "Not you?" / "Continue without signing in". */
export type Returning = "none" | "offer" | "sent" | "verified" | "declined"

/** How the link is sent: to the phone by text, or to the email. */
export type LinkChannel = "text" | "email"

const digits = (s: string) => s.replace(/\D/g, "").slice(-10)

/** The stand-in lookup the stories use: one customer, found by her email or her phone. The live form asks the server, which answers the same way for every visitor. */
export const FIXTURE_SAVED: SavedCustomer = { firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com", phone: "(970) 555-0123", channel: "text", address: "480 Briggs St, Erie", card: "Visa ending 4242" }
export function fixtureRecognise(contact: { email: string; phone: string }): SavedCustomer | null {
  const email = contact.email.trim().toLowerCase()
  return (email !== "" && email === FIXTURE_SAVED.email) || (digits(contact.phone).length === 10 && digits(contact.phone) === digits(FIXTURE_SAVED.phone)) ? FIXTURE_SAVED : null
}

/** "(•••) •••-0123": the phone with all but the last four hidden. */
export const maskPhone = (phone: string) => `(•••) •••-${digits(phone).slice(6)}`

/** "a•••@example.com": the email with all but the first letter of the name hidden. */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.trim().split("@")
  return `${name.slice(0, 1)}•••@${domain}`
}

/** The words of the returning customer's block. */
export const RETURNING_WORDS = {
  offer: "Booked with us before? Get a link to use your saved details.",
  text: "Text me a link",
  email: "Email me a link",
  skip: "Continue without signing in",
  sent: (channel: LinkChannel, contact: { email: string; phone: string }) => `We sent a link to ${channel === "text" ? maskPhone(contact.phone) : maskEmail(contact.email)}.`,
  again: "Send it again",
  welcome: (firstName: string) => `Welcome back, ${firstName}.`,
  notYou: "Not you?",
} as const
