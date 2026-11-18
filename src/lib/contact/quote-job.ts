import "server-only"
import { asc } from "drizzle-orm"
import * as s from "@/db/schema"
import { ctxForJob, type CtxDeps } from "@/lib/admin/api-ctx"
import { callApi } from "@/api/core/call"
import { jobsCreate } from "@/api/v1/jobs/handlers"
import { SERVICE_TOWNS, SERVICE_ZIPS } from "@/lib/places"

/** What the contact form sends, as typed. */
export interface ContactInquiry {
  name: string
  email: string
  phone: string
  address?: string | null
  service: string
  message?: string | null
}

/** The catalogue service for the form's "Service Needed" choice: the three that map one to one, else the repair visit (the office quotes from the message). */
export function serviceKeyFor(service: string): string {
  const wanted = service.trim().toLowerCase()
  if (wanted === "full irrigation installs") return "install"
  if (wanted === "winterization") return "blowout"
  return "repair"
}

/** The town in a typed address: a service town named in it, else the town of a zip in it, else none. */
export function townOf(address: string): (typeof SERVICE_TOWNS)[number] | null {
  const lower = address.toLowerCase()
  const named = SERVICE_TOWNS.find((t) => new RegExp(`\\b${t.toLowerCase()}\\b`).test(lower))
  if (named) return named
  const zip = address.match(/\b\d{5}\b/)?.[0]
  return (zip && SERVICE_ZIPS[zip]) || null
}

/**
 * Writes the website's inquiry as a job that needs a quote (`jobs.create` with `needsQuote`), as the system, in Trailhead's
 * organization (the oldest, as the checkout does). With no database or no organization it does nothing; any other failure
 * throws, and the contact route catches it, because the email to Ryan has already gone and the visitor's answer never changes.
 * Nothing here logs the inquiry.
 */
export async function recordQuoteJob(inquiry: ContactInquiry, deps: CtxDeps = {}): Promise<{ jobId: string } | null> {
  if (!deps.database && !process.env.DATABASE_URL) return null
  const database = deps.database ? deps.database() : (await import("@/db")).db()
  const [org] = await database.select({ id: s.organization.id }).from(s.organization).orderBy(asc(s.organization.createdAt)).limit(1)
  if (!org) return null
  const ctx = await ctxForJob(org.id, { ...deps, database: () => database })
  const [firstName, ...rest] = inquiry.name.trim().split(/\s+/)
  const typed = inquiry.address?.trim() ?? ""
  const town = typed ? townOf(typed) : null
  // An address with no town we serve cannot be a property (the town is one of six); it goes in the notes, and the job takes the customer's newest property or the "Address needed" one.
  const notes = [inquiry.message?.trim(), typed && !town ? `Address given: ${typed}` : ""].filter(Boolean).join("\n\n")
  const out = await callApi(ctx, jobsCreate, {
    customer: { firstName: firstName || "Website", ...(rest.length ? { lastName: rest.join(" ") } : {}), email: inquiry.email.trim(), phone: inquiry.phone.trim().length >= 7 ? inquiry.phone.trim() : undefined },
    ...(typed.length >= 3 && town ? { property: { address: typed, town } } : {}),
    serviceKey: serviceKeyFor(inquiry.service),
    ...(notes ? { notes: notes.slice(0, 2000) } : {}),
    needsQuote: true,
  })
  return { jobId: out.id }
}
