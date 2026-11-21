import { CATALOGUE } from "@/lib/booking/services"
import { SERVICE_LIST } from "@/lib/services"

// What the catalogue says about a service a request asks for (Hannah, Nov 20 2026: "if it's a job that needs to be quoted first, like an install"). ONE flag
// drives the primary button of the request page and of New job: a service with no price in the catalogue (`price` undefined: the installation, the larger
// repair, Christmas lights) is quoted first, so its job reads Needs a quote until a line has a price and "Send a quote" is the primary button; a priced
// service (a repair visit, a Rachio install, the free consultation) can be a job right away and "Create job" stays primary. Read from the catalogue, never a list here.

export interface CatalogueEntry {
  name: string
  /** whole dollars the catalogue charges; 0 is free; undefined is quoted */
  price?: number
  /** true when the catalogue has a price, so the job needs no quote */
  priced: boolean
}

const norm = (s: string) =>
  s
    .replace(/ visit$/i, "")
    .replace(/,\s*(?:up to \d+|\d+ to \d+) zones$/i, "")
    .trim()
    .toLowerCase()

/** The catalogue row a request's service names ("Sprinkler repair" is the catalogue's "Sprinkler repair visit"). A service that is not named is unpriced. */
export function catalogueEntry(service: string): CatalogueEntry {
  const row = service ? SERVICE_LIST.find((s) => norm(s.name) === norm(service)) : undefined
  return { name: row?.name ?? service, price: row?.price, priced: row?.price !== undefined }
}

/** The service is quoted first: its price is not set in the catalogue. */
export const isQuoteFirst = (service: string) => !catalogueEntry(service).priced

// ------------------------------------------------------------------------------------------------------------------------------ the service a job is for

// "What is this for?" (Hannah, Nov 21 2026, from docs/plans/2026-11-21-request-conversion-research.md): turning a request into a job always says what the job is. The choices are the
// ONE booking catalogue (`src/lib/booking/services.ts`): every service a customer can book or ask a quote for, in the catalogue's order, then "Something else". The Season Pass is not
// among them (it is sold, never made from a request) and neither is a service set to Off. The price rule is the catalogue's, as for any job: a service with a price makes a job that can
// be scheduled, a service without one needs a quote, and "Something else" is a job with the name Ryan types and no price.

export interface ServiceChoice {
  key: string
  name: string
}

/** The catalogue's services Ryan can make a job for. */
export const SERVICE_CHOICES: readonly ServiceChoice[] = CATALOGUE.filter((s) => s.online !== "off" && s.kind !== "pass").map((s) => ({ key: s.key, name: s.name }))

export const SOMETHING_ELSE = { key: "else", name: "Something else" } as const

/** The choice a service name is, when the request or the job named a catalogue service ("Sprinkler repair visit" is "Sprinkler repair"); else undefined. */
export const choiceOf = (service: string): ServiceChoice | undefined => (service ? SERVICE_CHOICES.find((c) => norm(c.name) === norm(service)) : undefined)

/** What Ryan has picked in the picker: a catalogue key, or "else" with the name he typed. Empty until he chooses. */
export interface ServicePick {
  key: string
  other: string
}
export const NO_PICK: ServicePick = { key: "", other: "" }

/** The pick a service name starts as: its catalogue choice, or empty when it named none (a name that is not in the catalogue is not guessed at). */
export const pickOf = (service: string): ServicePick => {
  const c = choiceOf(service)
  return c ? { key: c.key, other: "" } : NO_PICK
}

/** What the pick comes to: the service's name and its catalogue price (undefined when the catalogue has none), or null while it is incomplete. */
export function pickedService(p: ServicePick): { name: string; price?: number; quoteFirst: boolean } | null {
  if (p.key === SOMETHING_ELSE.key) {
    const name = p.other.trim()
    return name ? { name, quoteFirst: true } : null
  }
  const c = SERVICE_CHOICES.find((x) => x.key === p.key)
  if (!c) return null
  const { price } = catalogueEntry(c.name)
  return { name: c.name, ...(price !== undefined ? { price } : {}), quoteFirst: price === undefined }
}

/** What is missing before the pick can be used, in words, or empty. */
export const pickMissing = (p: ServicePick): string => (p.key === SOMETHING_ELSE.key ? (p.other.trim() ? "" : "Name the job.") : pickedService(p) ? "" : "Choose what this is for.")
