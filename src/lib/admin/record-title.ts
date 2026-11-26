// The one title rule of every record page (Hannah, Nov 25 2026; docs/DESIGN.md "Record titles"). A page is titled with the record's OWN name,
// never another record's: a job is its service, a quote and an invoice their number, a request "Request from <person>", a customer their name.
// The line under it says who it is for and one key fact, and the browser tab carries both, so two jobs for one customer never read the same.
// Pure: every page asks here, no page writes its own.

export interface RecordHeading {
  /** the h1 */
  title: string
  /** the one muted line under it; empty when there is nothing to say */
  subtitle: string
  /** the browser tab: the title and who it is for */
  tab: string
}

const line = (...parts: (string | undefined | null | false)[]) => parts.filter(Boolean).join(" · ")
const TAB_SUFFIX = "Trailhead admin"
const tabOf = (...parts: (string | undefined)[]) => line(...parts, TAB_SUFFIX)

/** "Sprinkler repair" over "for Andrea Dalton · Added Nov 18". `detail` is the key fact: when it was added or sold. */
export function jobHeading({ service, customer, detail }: { service: string; customer: string; detail?: string }): RecordHeading {
  return { title: service, subtitle: line(`for ${customer}`, detail), tab: tabOf(`${service} for ${customer}`) }
}

/** A Season Pass job is named with its season, "Season Pass 2027", read from the pass number (TH-2027-0008) so the 2026 and 2027 passes of one customer differ. */
export function passService(passNumber: string): string {
  const season = /^TH-(\d{4})-/.exec(passNumber)?.[1]
  return season ? `Season Pass ${season}` : "Season Pass"
}

/** "Q-2026-0005" over "New sprinkler system installation for Dana Whitfield · From a request". */
export function quoteHeading({ number, service, customer, detail }: { number: string; service: string; customer: string; detail?: string }): RecordHeading {
  return { title: number, subtitle: line(`${service} for ${customer}`, detail), tab: tabOf(number, `${service} for ${customer}`) }
}

/** "INV-2026-0042" over "Sprinkler repair for Marcus Bell · Sent Nov 12". */
export function invoiceHeading({ number, service, customer, detail }: { number: string; service: string; customer: string; detail?: string }): RecordHeading {
  return { title: number, subtitle: line(`${service} for ${customer}`, detail), tab: tabOf(number, `${service} for ${customer}`) }
}

/** "Request from Rosa Delgado" over "Larger sprinkler repair · Came in Nov 9". `askedFor` is left out when the person did not say. */
export function requestHeading({ name, askedFor, detail }: { name: string; askedFor?: string; detail?: string }): RecordHeading {
  const title = `Request from ${name}`
  return { title, subtitle: line(askedFor, detail), tab: tabOf(title, askedFor) }
}

/** The customer's name over "Customer since Apr 2026 · 480 Briggs St, Erie". */
export function customerHeading({ name, detail }: { name: string; detail?: string }): RecordHeading {
  return { title: name, subtitle: detail ?? "", tab: tabOf(name, "Customer") }
}
