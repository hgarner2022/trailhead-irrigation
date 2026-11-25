import type { ContactChannel } from "@/components/blocks/ContactPreference"
import type { PickedPhoto } from "@/components/blocks/PhotoPicker"
import type { DayTimePick } from "@/lib/booking/day-time"
import type { ServiceEntry } from "@/lib/booking/services"
import type { TimingPreference } from "@/lib/admin/types"
import type { KnownProperty } from "@/lib/booking/known-address"
import type { PlaceProvider, PlaceSuggestion } from "@/lib/places"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import type { CardChoice, Extras, FormStep } from "./booking-form-model"
import type { OffersFor } from "./booking-groups"

// The booking form's public shapes: what it tells its host when a day is booked (`Booked`), what it reports on every step (`BookingProgress`) and the props a story or the walkthrough gives it.

export interface Booked {
  service: string
  day: string
  start: string
  street: string
  town: string
  firstName: string
  email: string
  phone: string
  channel: ContactChannel
  photos: number
  /** the booking is the opt-in for tips and offers by email (Hannah, Nov 25 2026: "we get this by booking"); always true here, and recorded in `consent` */
  marketing: boolean
  /** "Visa ending 4242" or "No card" */
  card: string
  /** the address is a property Trailhead already holds: the booking links to that customer and property */
  onFile: boolean
  /** the address is on file but the email typed is not the one on file: it still books, as the same property, and the office is told ("Email differs from the one on file") */
  emailDiffers: boolean
  /** what pressing Continue on the contact step gave, recorded then and appended to the customer's consent history: agreement to the booking terms and the Trailhead terms of service (version and time), tips and offers by email as given, marketing texts never. Source "booking" (shown as "booking form"). */
  consent: { termsVersion: string; at: string; source: "booking"; marketingEmail: true; marketingText: false }
}

/** What a request for a quote holds when "Send to Ryan" is pressed: the person's own words, photos and address (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.3). It becomes a request in the admin, held outside Customers until Ryan accepts it. */
export interface Requested {
  serviceKey: string
  serviceName: string
  firstName: string
  lastName: string
  phone: string
  email: string
  channel: ContactChannel
  street: string
  town: string
  /** "Tell Ryan about it" */
  words: string
  photos: PickedPhoto[]
}

export interface BookingProgress {
  step: FormStep
  steps: FormStep[]
  quote: boolean
  service: ServiceEntry | null
  address: string
  town: string | null
  firstName: string
  email: string
  pick: DayTimePick | undefined
}

export interface BookingFormProps {
  /** the booking catalogue Settings holds: every service with its Online value (Book a day, We quote, Off); the form derives both of its lists from it. The backend's rows by default. */
  catalogue?: readonly ServiceEntry[]
  today?: string
  /** open on a step with earlier answers filled in; stories use it */
  initial?: { step?: FormStep; service?: string; quote?: boolean; fields?: Partial<CheckoutState>; picks?: Record<string, DayTimePick>; prefs?: Record<string, TimingPreference>; upsellFrom?: string; other?: boolean; termsAt?: string; when?: string; channel?: ContactChannel; photos?: PickedPhoto[]; extras?: Partial<Extras>; card?: CardChoice; attempted?: boolean; leaving?: boolean }
  /** the open days for a visit, from `from` (the first day it may be offered: tomorrow, or the day its window opens) to `until` (the day its window closes); the fixture days by default, `[]` for a full calendar */
  offersFor?: OffersFor
  /** the property Trailhead already holds for a picked address, found by its normalized street and ZIP; the stand-in knows one, the live form asks the server. Nothing personal comes back from it. */
  known?: (place: PlaceSuggestion) => KnownProperty | null
  /** Storybook only: prototype helpers (the note that the card form is drawn, "Add 2 sample photos"). Off in the customer screen. */
  prototype?: boolean
  places?: PlaceProvider
  /** told once when a day is booked */
  onBooked?: (booked: Booked) => void
  /** told once when a request for a quote is sent: the walkthrough passes it on to Requests in the admin */
  onRequested?: (request: Requested) => void
  /** the account link on the last screen */
  onOpenAccount?: () => void
  /** told on every step change with where the form is; the clickable flow story reads it */
  onStep?: (info: BookingProgress) => void
}

