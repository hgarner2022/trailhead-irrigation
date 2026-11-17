import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { Base, VisitFacts } from "@/emails/types"
import { firstNameOf } from "@/lib/admin/people"
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

/** The visit as the messages know it, on `day` when the caller already knows the new one; null while it has no day. */
export async function loadVisitFacts(db: Database, visitId: string, origin: string, day?: string): Promise<VisitFacts | null> {
  const [row] = await db
    // `who` is the person's first name; `crew` keeps their truck label ("Truck 1") for one more season and goes in step 6. A person
    // who has left keeps their visits until the office moves them (Settings › People, Remove), so neither names them.
    .select({ visit: s.visit, address: s.property.address, town: s.property.town, gateCode: s.property.gateCode, contactName: s.property.contactName, truck: s.person.truck, person: s.person.name, personActive: s.person.active })
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
    crew: row.personActive && row.truck ? `${row.truck}` : null,
    who: row.personActive ? firstNameOf(row.person) : null,
    ...(row.gateCode ? { gateCode: row.gateCode } : {}),
    ...(row.contactName ? { contactName: row.contactName } : {}),
    location: `${row.address}, ${row.town}`,
    icsUrl: visitCalendarUrl(origin, row.visit.id),
  }
}
