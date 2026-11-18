// No `server-only` here on purpose: scripts/db-seed.ts runs this under tsx
// with its own database handle. It touches only the handle it is given.
import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "./types"
import * as s from "./schema"
import { lineForVisitKind } from "@/lib/jobs/lines"
import { insertLines } from "@/lib/jobs/write-lines"
import { SERVICE_LIST } from "@/lib/services"
import type { AdminData, Pass, Person, Town } from "@/lib/admin/types"

export interface SeedOptions {
  organizationId: string
  /** emails seeded as admins */
  admins: readonly string[]
  /** also seed the fixture passes with their customers, properties, consents and visits */
  passes?: boolean
  /** also seed the read-only Jobber mirror from the fixture */
  mirror?: boolean
}

/** Weeks ahead the scheduler commits each window (wiring plan, change 12): spring 4, July 4, fall 2. */
export const LEAD_WEEKS = { "turn-on": 4, inspection: 4, blowout: 2 } as const

const mountainDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" })
/** The Mountain-time calendar day (YYYY-MM-DD) of an instant. */
export function toMountainDay(iso: string): string {
  return mountainDay.format(new Date(iso))
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email
  const name = local.charAt(0).toUpperCase() + local.slice(1)
  return { name, initials: name.slice(0, 2).toUpperCase() }
}

function townRank(order: readonly Town[], towns: readonly Town[]) {
  const ranks = towns.map((t) => order.indexOf(t)).filter((i) => i >= 0)
  return ranks.length ? Math.min(...ranks) : 0
}

/** The truck row a snapshot person was made from: `person_truck-1` came from `truck-1`. Gone in step 6 with the truck table. */
const legacyTruckIdOf = (p: Pick<Person, "id">) => (p.id.startsWith("person_") ? p.id.slice("person_".length) : p.id)

/**
 * Inserts the organization, admins, people (and, until step 6, a truck row
 * per person with a truck), areas, settings and services always; the fixture
 * passes (with customers, properties, consents and visits) only with
 * `passes: true`; the mirror only with `mirror: true`. Every insert ignores a
 * row that is already there, so running it twice changes nothing.
 */
export async function seed(db: Database, snapshot: AdminData, options: SeedOptions): Promise<void> {
  const org = options.organizationId
  const { people, areas, ...settings } = snapshot.settings
  const windows = settings.windows.map((w) => ({ ...w, leadWeeks: LEAD_WEEKS[w.kind] }))

  await db
    .insert(s.organization)
    .values({ id: org, name: "Trailhead Lawn & Irrigation LLC", settings: { ...settings, windows }, termsVersion: "2026-11" })
    .onConflictDoNothing()

  if (options.admins.length) {
    await db
      .insert(s.adminUser)
      .values(options.admins.map((email, i) => ({ organizationId: org, email, role: i === 0 ? ("owner" as const) : ("admin" as const), ...nameFromEmail(email) })))
      .onConflictDoNothing()
  }

  const trucks = people.filter((p) => p.truck)
  if (trucks.length) {
    await db
      .insert(s.truck)
      .values(trucks.map((p) => ({ id: legacyTruckIdOf(p), organizationId: org, name: p.truck!, jobberUserId: p.jobberUserId, workingDays: p.workingDays, capacityByKind: p.capacityByKind })))
      .onConflictDoNothing()
  }
  await seedPeople(db, org, people)
  if (areas.length) {
    await db
      .insert(s.area)
      .values(
        areas.map((a) => ({
          id: a.id,
          organizationId: org,
          name: a.name,
          towns: a.towns,
          springOrder: townRank(settings.springTownOrder, a.towns),
          fallOrder: townRank(settings.fallTownOrder, a.towns),
        })),
      )
      .onConflictDoNothing()
  }

  await db
    .insert(s.service)
    .values(
      SERVICE_LIST.map((v) => ({
        organizationId: org,
        key: v.key,
        name: v.name,
        description: v.description,
        kind: v.kind,
        bookable: v.bookable,
        minZones: v.minZones,
        maxZones: v.maxZones,
        includedZones: v.includedZones,
        price: v.price,
        extraZonePrice: v.extraZonePrice,
        slotMinutes: v.slotMinutes,
        quoteOnly: v.quoteOnly,
      })),
    )
    .onConflictDoNothing()

  if (options.passes) await seedPasses(db, snapshot, org)
  if (options.mirror) await seedMirror(db, snapshot, org)
}

/**
 * The people: the snapshot's rows as they are (`settings.people` is the one
 * source; Ryan Garner the owner on Truck 1, Tech Two the tech on Truck 2,
 * each keeping the truck id it was made from as `legacyTruckId` until step 6),
 * then one person per admin (`person_<admin id>`) so the sign-in has a row.
 * An admin named or emailed ryan% is the same person as the snapshot's Ryan
 * Garner, as the people migration (drizzle/0011_person_merge.sql) merges them: he
 * gets that admin's email instead of a second row. Inserts ignore a row that
 * is already there, so a re-seed changes nothing. A migrated database holds
 * Ryan under `person_<admin id>` with `legacyTruckId` truck-1, so a snapshot
 * person whose truck id someone already holds is not inserted (the deploy of
 * Nov 16 2026 did, and made a second Ryan), and an admin whose email a person
 * already carries is left alone; nothing outside the fixtures may assume
 * `person_truck-1`.
 */
async function seedPeople(db: Database, org: string, people: Person[]) {
  const existing = await db.select({ email: s.person.email, legacyTruckId: s.person.legacyTruckId }).from(s.person).where(eq(s.person.organizationId, org))
  const heldTrucks = new Set(existing.map((p) => p.legacyTruckId).filter(Boolean))
  const heldEmails = new Set(existing.map((p) => p.email?.toLowerCase()).filter(Boolean))
  const fresh = people.filter((p) => !(p.truck && heldTrucks.has(legacyTruckIdOf(p))))
  if (fresh.length) {
    await db
      .insert(s.person)
      .values(
        fresh.map((p) => ({
          id: p.id, organizationId: org, name: p.name, initials: p.initials, email: p.email, phone: p.phone, role: p.role, truck: p.truck, jobberUserId: p.jobberUserId,
          workingDays: p.workingDays, capacityByKind: p.capacityByKind, seasonStart: p.seasonStart, seasonEnd: p.seasonEnd, legacyTruckId: p.truck ? legacyTruckIdOf(p) : undefined,
        })),
      )
      .onConflictDoNothing()
  }
  const admins = await db.select().from(s.adminUser).where(eq(s.adminUser.organizationId, org))
  const ryan = people.find((p) => p.name === "Ryan Garner" && !p.email)
  const rows: (typeof s.person.$inferInsert)[] = []
  for (const a of admins) {
    if (heldEmails.has(a.email.toLowerCase())) continue
    if (ryan && (/^ryan/i.test(a.name) || /^ryan/i.test(a.email))) {
      await db.update(s.person).set({ email: a.email }).where(and(eq(s.person.id, ryan.id), isNull(s.person.email)))
    } else rows.push({ id: `person_${a.id}`, organizationId: org, name: a.name, initials: a.initials, email: a.email, role: a.role })
  }
  if (rows.length) await db.insert(s.person).values(rows).onConflictDoNothing()
}

async function seedPasses(db: Database, snapshot: AdminData, org: string) {
  const clients = new Map(snapshot.clients.map((c) => [c.id, c]))
  for (const pass of snapshot.passes) {
    const client = clients.get(pass.clientId)
    const town = client?.town ?? pass.town
    const propertyId = `property-${pass.clientId}`
    await db
      .insert(s.customer)
      .values({ id: pass.clientId, organizationId: org, firstName: client?.firstName ?? pass.firstName, lastName: client?.lastName ?? pass.lastName,
        // The card on file is the customer's: the snapshot pass's, on insert only (an edited customer keeps theirs).
        cardLast4: pass.cardLast4,
        // A fake Stripe handle beside the last four, so a fixture card counts as a card; it never reaches Stripe (no Stripe customer).
        stripePaymentMethodId: pass.cardLast4 ? `pm_fixture_${pass.clientId}` : undefined,
        cardExpires: pass.cardExpires,
        cardFailedAt: pass.cardFailedAt ? new Date(pass.cardFailedAt) : undefined,
      })
      .onConflictDoNothing()
    await db
      .insert(s.property)
      .values({ id: propertyId, organizationId: org, customerId: pass.clientId, address: client?.address ?? `Fixture address, ${town}`, town, zones: pass.zones, mustBeHome: pass.needsCustomerHome ?? false, accessNote: pass.accessNote ?? null })
      .onConflictDoNothing()
    if (pass.consent) await seedConsent(db, org, pass)
    const jobId = `job_${pass.id}`
    await db
      .insert(s.job)
      .values({ id: jobId, organizationId: org, customerId: pass.clientId, propertyId, kind: "pass", source: "checkout", season: pass.season, passNumber: pass.number, status: pass.status === "lapsed" ? "done" : pass.status, price: pass.visits.reduce((n, v) => n + v.amount, 0) })
      .onConflictDoNothing()
    await db
      .insert(s.seasonPass)
      .values({
        id: pass.id,
        jobId,
        organizationId: org,
        number: pass.number,
        season: pass.season,
        customerId: pass.clientId,
        propertyId,
        zones: pass.zones,
        inspection: pass.visits.some((v) => v.kind === "inspection"),
        turnOnPreference: pass.turnOnPreference,
        blowoutPreference: pass.blowoutPreference,
        needsCustomerHome: pass.needsCustomerHome ?? false,
        accessNote: pass.accessNote,
        status: pass.status,
        cardLast4: pass.cardLast4,
        // A fake Stripe handle beside the last four, so a fixture card counts as a card; it never reaches Stripe (no Stripe customer).
        stripePaymentMethodId: pass.cardLast4 ? `pm_fixture_${pass.clientId}` : undefined,
        cardExpires: pass.cardExpires,
        cardFailedAt: pass.cardFailedAt ? new Date(pass.cardFailedAt) : undefined,
      })
      .onConflictDoNothing()
    await db
      .insert(s.visit)
      .values(
        pass.visits.map((v) => ({
          id: `${pass.id}-${v.kind}`,
          organizationId: org,
          jobId,
          passId: pass.id,
          customerId: pass.clientId,
          propertyId,
          kind: v.kind,
          window: v.window,
          amount: v.amount,
          status: v.completedAt ? ("completed" as const) : v.scheduledAt ? ("scheduled" as const) : ("unscheduled" as const),
          preference: v.kind === "turn-on" ? pass.turnOnPreference : v.kind === "blowout" ? pass.blowoutPreference : undefined,
          scheduledOn: v.scheduledAt ? toMountainDay(v.scheduledAt) : undefined,
          startTime: v.startTime,
          completedOn: v.completedAt ? toMountainDay(v.completedAt) : undefined,
          chargedAt: v.chargedAt ? new Date(v.chargedAt) : undefined,
        })),
      )
      .onConflictDoNothing()
    // A visit the snapshot shows as charged gets the one succeeded payment row a real charge would have written, on insert only: a database that already holds a real attempt for the visit keeps it.
    const charged = pass.visits.filter((v) => v.chargedAt)
    if (charged.length)
      await db
        .insert(s.charge)
        .values(
          charged.map((v) => ({
            id: `charge-${pass.id}-${v.kind}-1`,
            organizationId: org,
            jobId,
            passId: pass.id,
            visitId: `${pass.id}-${v.kind}`,
            customerId: pass.clientId,
            attempt: 1,
            amount: v.amount,
            status: "succeeded" as const,
            method: "card_on_file" as const,
            paidOn: toMountainDay(v.chargedAt!),
          })),
        )
        .onConflictDoNothing()
    // The job's line per visit, with the id migration 0014's backfill gives the same visit (`line_<visit id>`), so a re-run of the backfill adds nothing to a seeded database.
    await insertLines(
      db,
      { organizationId: org, jobId, keepExisting: true },
      pass.visits.map((v) => ({ ...lineForVisitKind(v.kind, v.amount, pass.zones), id: `line_${pass.id}-${v.kind}`, visitId: `${pass.id}-${v.kind}` })),
    )
  }
}

async function seedConsent(db: Database, org: string, pass: Pass) {
  const c = pass.consent!
  // Consent is append-only and has no natural key, so a fixed id keeps a re-seed from adding a second row.
  await db
    .insert(s.consent)
    .values({
      id: `consent-${pass.id}`,
      organizationId: org,
      customerId: pass.clientId,
      termsVersion: c.termsVersion,
      termsAcceptedAt: c.termsAcceptedAt ? new Date(c.termsAcceptedAt) : undefined,
      marketingOptIn: c.marketingOptIn,
      marketingChannels: c.marketingChannels,
      source: c.source === "form" ? "booking" : c.source,
      recordedAt: new Date(c.recordedAt),
    })
    .onConflictDoNothing()
}

async function seedMirror(db: Database, snapshot: AdminData, org: string) {
  const clients = snapshot.clients
  for (let i = 0; i < clients.length; i += 200) {
    await db
      .insert(s.jobberClient)
      .values(clients.slice(i, i + 200).map((c) => ({ id: c.id, organizationId: org, firstName: c.firstName, town: c.town, jobberUrl: c.jobberUrl })))
      .onConflictDoNothing()
  }
  const visits = snapshot.visits.filter((v) => !v.isPass)
  for (let i = 0; i < visits.length; i += 200) {
    await db
      .insert(s.jobberVisit)
      .values(
        visits.slice(i, i + 200).map((v) => ({
          id: v.id,
          organizationId: org,
          clientId: v.clientId,
          title: `${v.clientName}, ${v.kind}`,
          kind: v.kind === "install" || v.kind === "other" || v.kind === "repair" ? v.kind : undefined,
          town: v.town,
          startAt: v.startAt ? new Date(v.startAt) : undefined,
          completedAt: v.status === "completed" && v.startAt ? new Date(v.startAt) : undefined,
          jobberUrl: v.jobberUrl,
        })),
      )
      .onConflictDoNothing()
  }
  if (snapshot.quotes.length) {
    await db
      .insert(s.jobberQuote)
      .values(snapshot.quotes.map((q) => ({ id: q.id, organizationId: org, clientName: q.clientName, town: q.town, total: q.total, sentAt: new Date(q.sentAt), status: q.status, jobberUrl: q.jobberUrl })))
      .onConflictDoNothing()
  }
  for (let i = 0; i < snapshot.invoices.length; i += 200) {
    await db
      .insert(s.jobberInvoice)
      .values(
        snapshot.invoices.slice(i, i + 200).map((v) => ({
          id: v.id,
          organizationId: org,
          clientName: v.clientName,
          total: v.total,
          issuedAt: new Date(v.issuedAt),
          dueAt: new Date(v.dueAt),
          status: v.status,
          jobberUrl: v.jobberUrl,
        })),
      )
      .onConflictDoNothing()
  }
}
