import type { ContactChannel } from "@/components/blocks/ContactPreference"
import type { PickedPhoto } from "@/components/blocks/PhotoPicker"
import type { DayTimeOffer, DayTimePick } from "@/lib/booking/day-time"
import type { ServiceEntry } from "@/lib/booking/services"
import type { Pass } from "@/lib/admin/types"
import type { PlaceProvider } from "@/lib/places"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import type { Extras, FormStep } from "./booking-form-model"

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
  /** ticked "Send me tips and offers from Trailhead by email" */
  marketing: boolean
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
  /** the services offered to book; the catalogue's bookable ones by default */
  entries?: readonly ServiceEntry[]
  today?: string
  /** open on a step with earlier answers filled in; stories use it */
  initial?: { step?: FormStep; zip?: string; service?: string; quote?: boolean; fields?: Partial<CheckoutState>; picks?: Record<string, DayTimePick>; when?: string; channel?: ContactChannel; photos?: PickedPhoto[]; extras?: Partial<Extras>; attempted?: boolean; leaving?: boolean }
  /** the open days for a visit; the fixture days by default, `[]` for a full calendar */
  offersFor?: (key: string, minutes: number, town: string | null) => DayTimeOffer[]
  /** the pass the booked step shows for a Season Pass */
  pass?: Pass
  places?: PlaceProvider
  /** told once when a day is booked */
  onBooked?: (booked: Booked) => void
  /** the account link on the last screen */
  onOpenAccount?: () => void
  /** told on every step change with where the form is; the clickable flow story reads it */
  onStep?: (info: BookingProgress) => void
}

