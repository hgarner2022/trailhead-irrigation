import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { Base, VisitFacts } from "@/emails/types"
import { kindName } from "@/lib/pass/server/messages"
import { visitCalendarUrl } from "./tokens"

/** What every customer message carries: links built from the site origin, the sign-in link with the customer's email filled in. */
export function baseData(origin: string, customer: { firstName: string; email: string | null }): Base {
  return {
    origin,
    firstName: customer.firstName,
    passUrl: `${origin}/account/pass`,
    signInUrl: customer.email ? `${origin}/account/sign-in?email=${encodeURIComponent(customer.email)}` : `${origin}/account/sign-in`,
  }
}

/** "Ryan" from "Ryan Garner"; null for no person or a blank name, so a message says nothing about who rather than half a sentence. */
export function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0]
  return first ? first : null
}

/** The visit as the messages know it, on `day` when the caller already knows the new one; null while it has no day. */
export async function loadVisitFacts(db: Database, visitId: string, origin: string, day?: string): Promise<VisitFacts | null> {
  const [row] = await db
    // `who` is the person's first name; `crew` keeps their truck label ("Truck 1") for one more season and goes in step 6.
    .select({ visit: s.visit, address: s.property.address, town: s.property.town, truck: s.person.truck, person: s.person.name })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .leftJoin(s.person, eq(s.person.id, s.visit.personId))
    .where(eq(s.visit.id, visitId))
  const when = day ?? row?.visit.scheduledOn
  if (!row || !when) return null
  return {
    id: row.visit.id,
    name: kindName(row.visit.kind),
    day: when,
    startTime: row.visit.startTime,
    crew: row.truck ? `${row.truck}` : null,
    who: firstNameOf(row.person),
    location: `${row.address}, ${row.town}`,
    icsUrl: visitCalendarUrl(origin, row.visit.id),
  }
}
