// No `server-only` here on purpose: scripts/db-seed.ts runs this under tsx
// with its own database handle. It touches only the handle it is given.
import type { Database } from "./types"
import * as s from "./schema"
import { SERVICE_LIST } from "@/lib/services"
import type { AdminData, Pass, Town } from "@/lib/admin/types"

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

/**
 * Inserts the organization, admins, trucks, areas, settings and services
 * always; the fixture passes (with customers, properties, consents and visits)
 * only with `passes: true`; the mirror only with `mirror: true`. Every insert
 * ignores a row that is already there, so running it twice changes nothing.
 */
export async function seed(db: Database, snapshot: AdminData, options: SeedOptions): Promise<void> {
  const org = options.organizationId
  const { trucks, areas, ...settings } = snapshot.settings
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

  if (trucks.length) {
    await db
      .insert(s.truck)
      .values(trucks.map((t) => ({ id: t.id, organizationId: org, name: t.name, jobberUserId: t.jobberUserId, workingDays: t.workingDays, capacityByKind: t.capacityByKind })))
      .onConflictDoNothing()
  }
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

async function seedPasses(db: Database, snapshot: AdminData, org: string) {
  const clients = new Map(snapshot.clients.map((c) => [c.id, c]))
  for (const pass of snapshot.passes) {
    const client = clients.get(pass.clientId)
    const town = client?.town ?? pass.town
    const propertyId = `property-${pass.clientId}`
    await db
      .insert(s.customer)
      .values({ id: pass.clientId, organizationId: org, firstName: client?.firstName ?? pass.firstName, lastName: client?.lastName ?? pass.lastName })
      .onConflictDoNothing()
    await db
      .insert(s.property)
      .values({ id: propertyId, organizationId: org, customerId: pass.clientId, address: client?.address ?? `Fixture address, ${town}`, town })
      .onConflictDoNothing()
    if (pass.consent) await seedConsent(db, org, pass)
    const jobId = `job_${pass.id}`
    await db
      .insert(s.job)
      .values({ id: jobId, organizationId: org, customerId: pass.clientId, propertyId, kind: "pass", source: "checkout", status: pass.status === "lapsed" ? "done" : pass.status, price: pass.visits.reduce((n, v) => n + v.amount, 0) })
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
