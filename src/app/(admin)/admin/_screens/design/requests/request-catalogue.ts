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
