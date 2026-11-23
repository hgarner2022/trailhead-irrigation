// A repeat customer in the booking form, pure (docs/plans/2026-11-23-booking-day-time-and-repeat-research.md, section 4). Someone who has booked before can use what Trailhead holds for them, but only after
// they prove the email is theirs with a six-digit code sent to it, typed in the form (a link would take them out of a half-finished booking). The offer is the same for every visitor ("Booked with us
// before?"): it never appears only for an email we know, which would tell anyone who types an email whether it is a customer. Nothing about the person (name, address, card) is shown until the code is
// right. Opened, the contact fields, how we reach them and the card are filled in and stay changeable, and one line, "Not you?", puts them back. A visitor who leaves leaves nothing: the code request stores
// nothing but its expiry. Matching the visit to the right customer, so there is never a duplicate, is the server's job after the contact step and needs no sign-in.
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import { maskEmail } from "@/lib/auth/mask-email"

/** What Trailhead holds for a customer, as the form reads it once the code is right. */
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

/** Where the form is with a repeat customer: not asked, asking for the email, the code sent, or verified. */
export type Returning = "none" | "asking" | "sent" | "verified"

/** The code is six digits. */
export const CODE_LENGTH = 6

/** The prototype's stand-in: one customer, and the code that is always right in Storybook. The live form asks the server, which answers the same way for every email. */
export const FIXTURE_SAVED: SavedCustomer = { firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com", phone: "(970) 555-0123", channel: "text", address: "480 Briggs St, Erie", card: "Visa ending 4242" }
export const FIXTURE_CODE = "123456"
export const fixtureRecognise = (email: string): SavedCustomer | null => (email.trim().toLowerCase() === FIXTURE_SAVED.email ? FIXTURE_SAVED : null)

/** The words of the repeat customer's block. */
export const RETURNING_WORDS = {
  offer: "Booked with us before?",
  start: "Use saved details",
  emailLabel: "Email",
  send: "Send code",
  cancel: "Cancel",
  sent: (email: string) => `We sent a code to ${maskEmail(email)}.`,
  codeLabel: "Code",
  confirm: "Confirm",
  again: "Send it again",
  wrong: "That code isn't right.",
  none: "We have no saved details for that email.",
  welcome: (firstName: string) => `Welcome back, ${firstName}.`,
  notYou: "Not you?",
} as const
