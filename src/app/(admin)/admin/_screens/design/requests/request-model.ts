import type { PillStatus } from "@/components/blocks/StatusPill"
import { relativeTime } from "@/components/blocks/needs-attention-time"
import { FROM_ANDREA, photo } from "../job-fixtures"
import type { PhotoItem } from "@/lib/photos/types"

// A request, as the admin holds it (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.3 to 4.5; Hannah's answers of Nov 20 2026): a held record of
// someone who is not yet a customer. It keeps the person's own words and contact on its own row and never touches a customer, a property or a job until
// Ryan makes a job of it (Create job, or Send a quote), even when the email matches a customer already (the page shows the match). Spam never becomes a
// customer. Hannah, Nov 20 2026: a request has three states only, New, Seen and Archived; making the job MOVES the request into the job, so it leaves the
// Requests list and is never "accepted". Archived, with a reason, is the one typed state; New and Seen are read from facts. Pure data and functions.

export type RequestState = "new" | "seen" | "archived"
export const REQUEST_STATES: readonly RequestState[] = ["new", "seen", "archived"]

/** The reasons Ryan picks when he archives a request (the research, 4.4). */
export const ARCHIVE_REASONS = ["Spam", "Question answered", "Not a fit", "Duplicate"] as const
export type ArchiveReason = (typeof ARCHIVE_REASONS)[number]

export type RequestSource = "booking-quote" | "contact-form"
export const SOURCE_WORDS: Record<RequestSource, string> = { "booking-quote": "Booking form", "contact-form": "Contact form" }

export interface RequestData {
  id: string
  /** ISO time it came in */
  receivedAt: string
  source: RequestSource
  first: string
  last: string
  phone: string
  email: string
  /** how they want to be reached */
  contact: "text" | "email" | "both"
  street: string
  town: string
  /** the catalogue name of the service asked for; empty for a plain question */
  service: string
  /** the customer's own words, kept exactly */
  words: string
  photos: PhotoItem[]
  /** a staff event exists (the page was opened, or a note was written) */
  seen: boolean
  /** set when Ryan made a job of it: the job it became and the customer it was added to. The request has left the list; its address says where it went. */
  becameJob?: { jobId: string; customerId: string; at: string }
  archived?: { reason: ArchiveReason; at: string }
}

export const fullName = (r: Pick<RequestData, "first" | "last">) => `${r.first} ${r.last}`.trim()

/** New, Seen or Archived, read from the facts: archived wins, then whether anyone has looked. */
export function stateOf(r: RequestData): RequestState {
  if (r.archived) return "archived"
  return r.seen || r.becameJob ? "seen" : "new"
}

/** The requests that are still requests: one that became a job has left. */
export const openRequests = <T extends Pick<RequestData, "becameJob">>(list: readonly T[]): T[] => list.filter((r) => !r.becameJob)

export const REQUEST_PILL: Record<RequestState, { status: PillStatus; label: string }> = {
  new: { status: "request-new", label: "New" },
  seen: { status: "request-seen", label: "Seen" },
  archived: { status: "request-archived", label: "Archived" },
}

/** A customer the request is checked against when its page opens. Never stored: the match is a hint to Ryan, not an action. */
export interface KnownCustomer {
  id: string
  name: string
  email: string
  phone: string
  street: string
}
export interface Match {
  customer: KnownCustomer
  /** why they match: the same email, the same phone, or both */
  by: ("email" | "phone")[]
}

const digits = (s: string) => s.replace(/\D/g, "")

/** The customers of the prototype's world, for the match. The ids are the walkthrough's. */
export const KNOWN_CUSTOMERS: readonly KnownCustomer[] = [
  { id: "andrea", name: "Andrea Dalton", email: "andrea.dalton@example.com", phone: "(970) 555-0123", street: "480 Briggs St, Erie" },
  { id: "marcus", name: "Marcus Bell", email: "marcus.bell@example.com", phone: "(970) 555-0188", street: "91 Main St, Longmont" },
  { id: "dale", name: "Dale Whitaker", email: "dale.whitaker@example.com", phone: "(970) 555-0140", street: "212 Main St, Lafayette" },
  { id: "other-dana-cho", name: "Dana Cho", email: "dana.cho@example.com", phone: "(970) 555-0171", street: "18 Cedar Way, Erie" },
]

/** The customer a request matches by email (any case) or by phone digits; null when none does. */
export function matchOf(r: Pick<RequestData, "email" | "phone">, known: readonly KnownCustomer[] = KNOWN_CUSTOMERS): Match | null {
  const hits = known
    .map((customer) => {
      const by: Match["by"] = []
      if (r.email.trim() && customer.email.toLowerCase() === r.email.trim().toLowerCase()) by.push("email")
      if (digits(r.phone).length >= 7 && digits(customer.phone) === digits(r.phone)) by.push("phone")
      return { customer, by }
    })
    .filter((m) => m.by.length)
  // the email is the stronger sign: a shared phone only matches when no email does
  return hits.find((m) => m.by.includes("email")) ?? hits[0] ?? null
}

export const matchWords = (m: Match) => `Same ${m.by.join(" and ")}`

/** "2 hours ago", from `needs-attention-time`; the list's When. */
export const cameIn = (r: RequestData, now: string) => relativeTime(r.receivedAt, now)

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })
const CLOCK = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })
/** "Nov 18 at 4:02 pm". */
export const cameInOn = (iso: string) => `${DAY.format(new Date(iso))} at ${CLOCK.format(new Date(iso)).replace(" AM", " am").replace(" PM", " pm")}`

/** Today of the fixtures, the same moment as the job page's (Wed Nov 18 2026, 11:00 am Mountain). */
export const REQUESTS_NOW = "2026-11-18T18:00:00Z"

/** The number badge on the rail and in More: the requests that are New. */
export const newCount = (list: readonly RequestData[]) => openRequests(list).filter((r) => stateOf(r) === "new").length

/** The order of the Requests list: New first, then Seen and Archived, newest first inside each. */
export function listOrder(list: readonly RequestData[]): RequestData[] {
  const rank: Record<RequestState, number> = { new: 0, seen: 1, archived: 2 }
  return [...list].sort((a, b) => rank[stateOf(a)] - rank[stateOf(b)] || b.receivedAt.localeCompare(a.receivedAt))
}

export const SERVICE_FILTER = ["Christmas lights", "Larger sprinkler repair", "Sprinkler repair", "Free consultation"] as const

/** What the person did not name: a plain question has no service. */
export const serviceWords = (r: Pick<RequestData, "service">) => r.service || "Not said"

// ------------------------------------------------------------------------------------------------------------------------------ fixtures

const theirs = (n: number, at: string): PhotoItem => photo(n, { ...FROM_ANDREA, id: `rq-ph${n}`, visitId: "", jobId: "", customerId: "", createdAt: at })

export const REQUEST_FIXTURES: RequestData[] = [
  {
    id: "rq-rosa",
    receivedAt: "2026-11-18T16:02:00Z",
    source: "booking-quote",
    first: "Rosa",
    last: "Delgado",
    phone: "(970) 555-0166",
    email: "rosa.delgado@example.com",
    contact: "both",
    street: "212 Spruce Ct",
    town: "Louisville",
    service: "Christmas lights",
    words: "We would like the roofline and the two front trees done for the first weekend of December. The house is two stories. Pictures are of the front.",
    photos: [theirs(1, "2026-11-18T16:02:00Z"), theirs(2, "2026-11-18T16:02:00Z")],
    seen: false,
  },
  {
    id: "rq-andrea",
    receivedAt: "2026-11-18T13:12:00Z",
    source: "contact-form",
    first: "Andrea",
    last: "Dalton",
    phone: "(970) 555-0123",
    email: "Andrea.Dalton@example.com",
    contact: "text",
    street: "480 Briggs St",
    town: "Erie",
    service: "Larger sprinkler repair",
    words: "The back bed by the fence has no water at all. Zone 6 is dead and I think the line is cut. Can someone look at the whole zone?",
    photos: [],
    seen: false,
  },
  {
    id: "rq-kevin",
    receivedAt: "2026-11-17T21:30:00Z",
    source: "booking-quote",
    first: "Kevin",
    last: "Marsh",
    phone: "(970) 555-0182",
    email: "kevin.marsh@example.com",
    contact: "text",
    street: "18 Wren Ln",
    town: "Firestone",
    service: "Larger sprinkler repair",
    words: "Two zones in the front yard come on and the pressure is very low. A neighbor said it might be the valves. We have had it for six years.",
    photos: [theirs(3, "2026-11-17T21:30:00Z")],
    seen: true,
  },
  {
    id: "rq-tom",
    receivedAt: "2026-11-17T15:00:00Z",
    source: "contact-form",
    first: "Tom",
    last: "Ellis",
    phone: "(970) 555-0133",
    email: "tom.ellis@example.com",
    contact: "text",
    street: "64 Hollis Ct",
    town: "Louisville",
    service: "Sprinkler repair",
    words: "Two heads in the side yard are spraying the fence. Hoping someone can come this week.",
    photos: [],
    seen: true,
  },
  {
    id: "rq-beth",
    receivedAt: "2026-11-09T19:45:00Z",
    source: "booking-quote",
    first: "Beth",
    last: "Orr",
    phone: "(970) 555-0159",
    email: "beth.orr@example.com",
    contact: "email",
    street: "33 Aspen Ct",
    town: "Lafayette",
    service: "Christmas lights",
    words: "Front of the house and the porch columns, please. We are away until the 20th of December.",
    photos: [theirs(4, "2026-11-09T19:45:00Z")],
    seen: true,
    becameJob: { jobId: "q-beth", customerId: "other-beth-orr", at: "2026-11-10T15:00:00Z" },
  },
  {
    id: "rq-dana",
    receivedAt: "2026-11-13T15:20:00Z",
    source: "contact-form",
    first: "Dana",
    last: "Cho",
    phone: "(970) 555-0171",
    email: "dana.cho@example.com",
    contact: "text",
    street: "18 Cedar Way",
    town: "Erie",
    service: "Larger sprinkler repair",
    words: "Zone 3 has a geyser by the driveway after the blowout. I would like a price to redo that line.",
    photos: [],
    seen: true,
    becameJob: { jobId: "q-dana", customerId: "other-dana-cho", at: "2026-11-13T17:00:00Z" },
  },
  {
    id: "rq-ben",
    receivedAt: "2026-11-16T09:10:00Z",
    source: "contact-form",
    first: "Ben",
    last: "Harlan",
    phone: "",
    email: "ben@rankfast.example",
    contact: "email",
    street: "",
    town: "",
    service: "",
    words: "Hello, we can put your website at the top of Google in 7 days. Reply for a free report.",
    photos: [],
    seen: true,
    archived: { reason: "Spam", at: "2026-11-16T13:00:00Z" },
  },
  {
    id: "rq-june",
    receivedAt: "2026-11-12T22:05:00Z",
    source: "contact-form",
    first: "June",
    last: "Whitlow",
    phone: "(970) 555-0147",
    email: "june.whitlow@example.com",
    contact: "text",
    street: "9 Larkspur Way",
    town: "Broomfield",
    service: "",
    words: "Do you also mow lawns?",
    photos: [],
    seen: true,
    archived: { reason: "Not a fit", at: "2026-11-13T14:00:00Z" },
  },
]
