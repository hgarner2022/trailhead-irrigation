// Made-up data for every email, so a story (and the audit render) can show each one through the same renderer the sender uses.
// Nothing here is real: the names, numbers and links are invented, and nothing is ever sent from it.
import type { VisitFacts } from "./format"
import type { EmailKind } from "./render"

export const ORIGIN = "https://www.trailheadirrigation.com"
const base = { origin: ORIGIN, firstName: "Andrea", accountUrl: `${ORIGIN}/account`, signInUrl: `${ORIGIN}/account/sign-in?email=andrea%40example.com` }
const visit: VisitFacts = { id: "v1", name: "spring turn-on", day: "2027-05-05", startTime: "08:00", who: "Ryan", address: "480 Briggs St", location: "480 Briggs St, Erie", icsUrl: `${ORIGIN}/api/visits/v1/calendar.ics?token=abc`, visitUrl: `${ORIGIN}/account/visits/v1?t=abc` }
const blowout: VisitFacts = { ...visit, id: "v2", name: "fall blowout", day: "2027-10-05", icsUrl: `${ORIGIN}/api/visits/v2/calendar.ics?token=def` }
const lines = [
  { name: "Repair", amount: 145, quantity: 1, unitPrice: 145 },
  { name: "Extra zones", amount: 20, quantity: 2, unitPrice: 10 },
]
const invoice = { ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", address: "480 Briggs St", who: "Ryan", day: "2027-05-04", lines, amount: 165, subtotal: 165, tax: 13, total: 178, dueOn: "2027-05-21", payUrl: `${ORIGIN}/pay/inv1?token=abc` }

/** The data each kind renders from. */
export const EMAIL_FIXTURES: Record<EmailKind, Record<string, unknown>> = {
  "purchase-confirmation": {
    ...base, passNumber: "TH-2027-0004", season: 2027, town: "Erie", address: "480 Briggs St", passImageUrl: `${ORIGIN}/api/pass-image/p1?token=t`, cardLast4: "4242",
    lines: [{ name: "Spring turn-on", amount: 145 }, { name: "Fall blowout", amount: 95 }],
    visits: [
      { kind: "turn-on", name: "spring turn-on", amount: 145, visit, fallback: "" },
      { kind: "blowout", name: "fall blowout", amount: 95, visit: blowout, fallback: "", note: "Your first choice, Friday, October 1, filled up, so we put it on Tuesday, October 5." },
    ],
  },
  "booking-confirmation": { ...base, serviceName: "spring turn-on", visit },
  "date-set": { ...base, visit },
  "date-moved": { ...base, visit },
  "day-before": { ...base, visit },
  "date-confirm": { ...base, visit },
  receipt: { ...base, serviceName: "repair", address: "480 Briggs St", paidOn: "2027-05-05", card: "Visa ending 4242", amount: 178, who: "Ryan", day: "2027-05-05", number: "R-1A2B3C4D", lines, subtotal: 165, tax: 13, total: 178, nextLine: "Your fall blowout is planned for early October.", receiptUrl: "https://pay.stripe.com/r/1" },
  invoice,
  "invoice-reminder": invoice,
  "card-failed": { ...base, amount: 145, visitName: "spring turn-on", card: "Visa ending 4242", address: "480 Briggs St", updateUrl: "https://billing.stripe.com/s/1" },
  "card-expiring": { ...base, card: "Visa ending 4242", cardState: "expires in July 2027", left: 190, updateUrl: "https://billing.stripe.com/s/2" },
  cancelled: { ...base, season: 2027 },
  "visit-cancelled": { ...base, serviceName: "spring turn-on", address: "480 Briggs St", day: "2027-05-05", paid: 0, visitUrl: `${ORIGIN}/account/visits/v1?t=abc` },
  renewal: { ...base, season: 2028, town: "Erie", buyUrl: `${ORIGIN}/season-pass` },
  "not-closed-crew": { origin: ORIGIN, visits: [{ customer: "Andrea", name: "spring turn-on", day: "2027-05-04", town: "Erie" }, { customer: "Ben", name: "fall blowout", day: "2027-10-04", town: "Lafayette" }] },
  "admin-alert": { origin: ORIGIN, title: "New Season Pass: Andrea, Erie, 8 zones", detail: "Andrea in Erie bought a 2027 Season Pass.", path: "/admin/jobs" },
}

/** The sign-in email is not in the registry (the auth route renders it), so it has its own input. */
export const SIGN_IN_FIXTURE = { url: `${ORIGIN}/account/sign-in/verify?token=abc123`, host: "www.trailheadirrigation.com" }

/** The subject line a person reads, one entry per story. */
export const EMAIL_LABELS: Record<EmailKind | "sign-in", string> = {
  "purchase-confirmation": "Purchase confirmation",
  "booking-confirmation": "Booking confirmation",
  "date-set": "Day set",
  "date-moved": "Day moved",
  "day-before": "Day before",
  "date-confirm": "Two weeks out",
  receipt: "Receipt",
  invoice: "Invoice",
  "invoice-reminder": "Invoice reminder",
  "card-failed": "Card failed",
  "card-expiring": "Card expiring",
  cancelled: "Season Pass canceled",
  "visit-cancelled": "Visit canceled",
  renewal: "Renewal",
  "not-closed-crew": "Not marked done (crew)",
  "admin-alert": "Admin alert",
  "sign-in": "Sign in link",
}

/**
 * The visit report each service carries: the job's checklist template for that service (the labels on the job page: `REPAIR_STEPS` in components/blocks/Checklist.tsx
 * and `TRIP_STEPS` in the admin trip fixtures; src/emails/visit-report.test.ts holds them equal), the first `done` items ticked, and the photos Ryan shared with
 * the customer (`shown_to_customer` on a visit that is done). No notes and no captions: the data has none to show.
 */
export const REPORT_STEPS: Record<"repair" | "spring turn-on" | "fall blowout" | "July inspection", readonly string[]> = {
  repair: ["Walk the zones", "Find the leak", "Fix what we can", "Set the controller", "Walk the customer through it"],
  "spring turn-on": ["Pressure test", "Run every zone", "Set the controller", "Note broken heads"],
  "fall blowout": ["Shut the water", "Blow out each zone", "Drain the backflow", "Set the controller to off"],
  "July inspection": ["Run every zone", "Adjust heads", "Check the controller schedule"],
}
export const REPORT_PHOTOS = ["/images/sprinkler-head.jpg", "/images/sprinkler-repair.jpg"]
/** `origin` is the site's for an email (a photo's address must be absolute there) and empty for a page (`""`, a path on the same site). */
export function reportFor(service: keyof typeof REPORT_STEPS, done?: number, photos = 2, origin = ORIGIN): import("./visit-report").VisitReportData {
  const steps = REPORT_STEPS[service]
  return { items: steps.map((label, n) => ({ label, done: n < (done ?? steps.length) })), photos: REPORT_PHOTOS.slice(0, photos).map((url) => ({ url: `${origin}${url}` })) }
}
/** The repair of the receipt and invoice stories: four of its five items ticked (the customer was out for the walk-through) and two photos. */
export const REPORT_FIXTURE = reportFor("repair", 4, 2)
