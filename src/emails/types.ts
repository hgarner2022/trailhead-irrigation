import type { VisitFacts } from "./format"

export type { VisitFacts }

export interface RenderedEmail {
  subject: string
  text: string
  html: string
}

/** What every customer message carries: where links point, who it is for, and the two pass page links. */
export interface Base {
  origin: string
  firstName: string
  /** the pass page, plain (for a text) */
  passUrl: string
  /** the pass page behind the sign-in page with the customer's email filled in, so the button lands signed out people on a pre-filled form */
  signInUrl: string
}

export interface PurchaseConfirmationData extends Base {
  passNumber: string
  season: number
  town: string
  /** the signed URL of the pass card PNG */
  passImageUrl: string
  /** each visit on the pass: its charge, and its day with the window once it has one (else `fallback` says what happens) */
  visits: { kind: "turn-on" | "inspection" | "blowout"; name: string; amount: number; visit: VisitFacts | null; fallback: string; /** said when the day picked at checkout filled up before the card was saved */ note?: string }[]
  /** the last four of the card on file, or null */
  cardLast4: string | null
}
export interface VisitData extends Base {
  visit: VisitFacts
}
export interface ReceiptData extends Base {
  passNumber: string
  amount: number
  visitName: string
  /** "Visa ending 4242" or null */
  card: string | null
  /** the line that names the next visit */
  nextLine: string
  receiptUrl: string | null
}
export interface CardFailedData extends Base {
  passNumber: string
  amount: number | null
  /** null for a link request with no visit behind it */
  visitName: string | null
  updateUrl: string | null
}
export interface CardExpiringData extends Base {
  passNumber: string
  /** why: "expires in July 2027" or "was removed" */
  cardState: string
  /** dollars of visits still to come, 0 for none */
  left: number
  updateUrl: string | null
}
export interface CancelledData extends Base {
  passNumber: string
}
export interface RenewalData extends Base {
  season: number
  town: string
  /** the page that sells the pass */
  buyUrl: string
}
export interface BookingConfirmationData extends Base {
  serviceName: string
  visit: VisitFacts
}
export interface NotClosedCrewData {
  origin: string
  /** the visits whose day passed with no completion */
  visits: { customer: string; name: string; day: string; town: string }[]
}
export interface AdminAlertData {
  origin: string
  title: string
  detail: string
  /** an admin page path, "/admin/passes" */
  path: string
}
export interface SignInData {
  origin: string
  url: string
  host: string
}
