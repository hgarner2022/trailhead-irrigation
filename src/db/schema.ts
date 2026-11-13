import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core"
import type {
  AreaGroup,
  CapacityKind,
  MarketingChannel,
  OrganizationSettings,
  VisitException,
  Weekday,
} from "@/lib/admin/types"

// Conventions (wiring plan): every table has organization_id; money is whole
// dollars; timestamps are timestamptz; `date` columns are Mountain-time
// calendar days and come back as YYYY-MM-DD strings. Jobber ids are nullable:
// Jobber is read-only for the app, so they are filled by the mirror or never.

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" })
const day = (name: string) => date(name, { mode: "string" })
const newId = () => crypto.randomUUID()

const id = () => text("id").primaryKey().$defaultFn(newId)
const orgId = () => text("organization_id").notNull().references(() => organization.id)
const createdAt = () => ts("created_at").notNull().defaultNow()
const updatedAt = () => ts("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date())

// Enums, named after the screen types in src/lib/admin/types.ts.
export const townEnum = pgEnum("town", ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"])
export const adminRoleEnum = pgEnum("admin_role", ["owner", "admin"])
export const passStatusEnum = pgEnum("pass_status", ["pending", "active", "cancelled", "lapsed"])
export const visitKindEnum = pgEnum("visit_kind", [
  "turn-on",
  "inspection",
  "blowout",
  "repair",
  "install",
  "consult",
  "rachio-install",
  "aeration",
  "lights",
  "other",
])
export const visitStatusEnum = pgEnum("visit_status", [
  "unscheduled",
  "scheduled",
  "completed",
  "cancelled",
  "skipped",
  "not-closed",
])
export const timingPreferenceEnum = pgEnum("timing_preference", ["earlier", "recommended", "later"])
export const chargeStatusEnum = pgEnum("charge_status", ["pending", "succeeded", "failed", "refunded"])
export const quoteStatusEnum = pgEnum("quote_status", ["awaiting", "approved", "declined"])
export const invoiceStatusEnum = pgEnum("invoice_status", ["paid", "unpaid", "overdue"])
export const queueKindEnum = pgEnum("queue_kind", [
  "jobber-webhook",
  "stripe-webhook",
  "pass-onboard",
  "booking-onboard",
  "pass-charge",
  "pass-cancel",
  "message",
  "renewal-email",
  "schedule-run",
  "outbound-webhook",
  "geocode",
  "jobber-feed-sync",
])
export const messageChannelEnum = pgEnum("message_channel", ["email", "sms"])
export const messageStatusEnum = pgEnum("message_status", ["queued", "sent", "delivered", "failed", "bounced"])
export const consentSourceEnum = pgEnum("consent_source", ["checkout", "booking", "admin", "reply"])
export const principalKindEnum = pgEnum("principal_kind", ["person", "api-key", "public"])

export type OrganizationSettingsRow = Omit<OrganizationSettings, "trucks" | "areas">

export const organization = pgTable("organization", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  jobberAccountId: text("jobber_account_id"),
  jobberPassFieldId: text("jobber_pass_field_id"),
  jobberPassTag: text("jobber_pass_tag"),
  settings: jsonb("settings").$type<OrganizationSettingsRow>().notNull(),
  termsVersion: text("terms_version").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const settingsChange = pgTable("settings_change", {
  id: id(),
  organizationId: orgId(),
  byEmail: text("by_email").notNull(),
  field: text("field").notNull(),
  fromValue: text("from_value").notNull(),
  toValue: text("to_value").notNull(),
  at: ts("at").notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const adminUser = pgTable(
  "admin_user",
  {
    id: id(),
    organizationId: orgId(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    role: adminRoleEnum("role").notNull().default("admin"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("admin_user_org_idx").on(t.organizationId)],
)

export const truck = pgTable(
  "truck",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    jobberUserId: text("jobber_user_id"),
    /** The truck's Jobber calendar subscription (iCal) URL; a private link, never returned by the API. */
    calendarFeedUrl: text("calendar_feed_url"),
    workingDays: jsonb("working_days").$type<Weekday[]>().notNull(),
    capacityByKind: jsonb("capacity_by_kind").$type<Record<CapacityKind, number>>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("truck_org_idx").on(t.organizationId)],
)

export const area = pgTable(
  "area",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    towns: jsonb("towns").$type<AreaGroup["towns"]>().notNull(),
    springOrder: integer("spring_order").notNull().default(0),
    fallOrder: integer("fall_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("area_org_idx").on(t.organizationId)],
)

export const service = pgTable(
  "service",
  {
    id: id(),
    organizationId: orgId(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    kind: visitKindEnum("kind").notNull(),
    bookable: boolean("bookable").notNull().default(true),
    minZones: integer("min_zones"),
    maxZones: integer("max_zones"),
    /** zones the price covers; the cost is price + max(0, zones - included_zones) * extra_zone_price */
    includedZones: integer("included_zones"),
    price: integer("price"),
    extraZonePrice: integer("extra_zone_price"),
    slotMinutes: integer("slot_minutes").notNull(),
    quoteOnly: boolean("quote_only").notNull().default(false),
    jobberProductId: text("jobber_product_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("service_org_key_unique").on(t.organizationId, t.key)],
)

export const customer = pgTable(
  "customer",
  {
    id: id(),
    organizationId: orgId(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    leadSource: text("lead_source"),
    jobberClientId: text("jobber_client_id"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("customer_org_email_idx").on(t.organizationId, t.email),
    index("customer_org_phone_idx").on(t.organizationId, t.phone),
  ],
)

/** The geocode cache: lat/lng are fetched once and never re-fetched. */
export const property = pgTable(
  "property",
  {
    id: id(),
    organizationId: orgId(),
    customerId: text("customer_id").notNull().references(() => customer.id),
    address: text("address").notNull(),
    town: townEnum("town").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    geocodedAt: ts("geocoded_at"),
    jobberPropertyId: text("jobber_property_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("property_customer_idx").on(t.customerId)],
)

/** Append-only: a trigger (migration 0001) rejects UPDATE; the newest row per customer is the current state. */
export const consent = pgTable(
  "consent",
  {
    id: id(),
    organizationId: orgId(),
    customerId: text("customer_id").notNull().references(() => customer.id),
    termsVersion: text("terms_version"),
    termsAcceptedAt: ts("terms_accepted_at"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    marketingChannels: jsonb("marketing_channels").$type<MarketingChannel[]>().notNull().default(sql`'[]'::jsonb`),
    source: consentSourceEnum("source").notNull(),
    recordedAt: ts("recorded_at").notNull().defaultNow(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("consent_customer_idx").on(t.customerId, t.recordedAt)],
)

export const seasonPass = pgTable(
  "season_pass",
  {
    id: id(),
    organizationId: orgId(),
    number: text("number").notNull(),
    season: integer("season").notNull(),
    customerId: text("customer_id").notNull().references(() => customer.id),
    propertyId: text("property_id").notNull().references(() => property.id),
    zones: integer("zones").notNull(),
    inspection: boolean("inspection").notNull().default(false),
    turnOnPreference: timingPreferenceEnum("turn_on_preference").notNull().default("recommended"),
    blowoutPreference: timingPreferenceEnum("blowout_preference").notNull().default("recommended"),
    needsCustomerHome: boolean("needs_customer_home").notNull().default(false),
    accessNote: text("access_note"),
    status: passStatusEnum("status").notNull().default("pending"),
    stripePaymentMethodId: text("stripe_payment_method_id"),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    cardExpires: text("card_expires"),
    cardFailedAt: ts("card_failed_at"),
    renewedFromId: text("renewed_from_id"),
    renewalAskedAt: ts("renewal_asked_at"),
    cancelledAt: ts("cancelled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("season_pass_org_number_unique").on(t.organizationId, t.number),
    index("season_pass_org_season_idx").on(t.organizationId, t.season),
  ],
)

export const booking = pgTable(
  "booking",
  {
    id: id(),
    organizationId: orgId(),
    customerId: text("customer_id").notNull().references(() => customer.id),
    propertyId: text("property_id").notNull().references(() => property.id),
    zonesBand: text("zones_band"),
    accessConfirmed: boolean("access_confirmed").notNull().default(false),
    notes: text("notes"),
    source: text("source", { enum: ["web", "admin"] }).notNull().default("web"),
    status: text("status", { enum: ["booked", "cancelled"] }).notNull().default("booked"),
    jobberRequestId: text("jobber_request_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("booking_org_idx").on(t.organizationId)],
)

/** The one table for pass visits and booked visits. Exactly one of pass_id or booking_id is set. */
export const visit = pgTable(
  "visit",
  {
    id: id(),
    organizationId: orgId(),
    passId: text("pass_id").references(() => seasonPass.id),
    bookingId: text("booking_id").references(() => booking.id),
    customerId: text("customer_id").notNull().references(() => customer.id),
    propertyId: text("property_id").notNull().references(() => property.id),
    serviceId: text("service_id").references(() => service.id),
    kind: visitKindEnum("kind").notNull(),
    window: text("window"),
    amount: integer("amount").notNull().default(0),
    status: visitStatusEnum("status").notNull().default("unscheduled"),
    preference: timingPreferenceEnum("preference"),
    awaitingPick: boolean("awaiting_pick").notNull().default(false),
    truckId: text("truck_id").references(() => truck.id),
    scheduledOn: day("scheduled_on"),
    startTime: text("start_time"),
    durationMinutes: integer("duration_minutes"),
    stopOrder: integer("stop_order"),
    confirmedAt: ts("confirmed_at"),
    exception: jsonb("exception").$type<VisitException>(),
    jobberJobId: text("jobber_job_id"),
    jobberVisitId: text("jobber_visit_id"),
    jobberJobUrl: text("jobber_job_url"),
    jobberInvoiceId: text("jobber_invoice_id"),
    completedOn: day("completed_on"),
    chargedAt: ts("charged_at"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("visit_one_parent", sql`num_nonnulls(${t.passId}, ${t.bookingId}) = 1`),
    uniqueIndex("visit_pass_kind_unique").on(t.passId, t.kind).where(sql`${t.passId} is not null`),
    index("visit_org_scheduled_idx").on(t.organizationId, t.scheduledOn),
    index("visit_jobber_visit_idx").on(t.jobberVisitId),
  ],
)

export const quoteRequest = pgTable(
  "quote_request",
  {
    id: id(),
    organizationId: orgId(),
    customerId: text("customer_id").notNull().references(() => customer.id),
    propertyId: text("property_id").references(() => property.id),
    serviceId: text("service_id").references(() => service.id),
    notes: text("notes"),
    status: text("status", { enum: ["new", "quoted", "archived"] }).notNull().default("new"),
    jobberRequestId: text("jobber_request_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("quote_request_org_idx").on(t.organizationId)],
)

export const charge = pgTable(
  "charge",
  {
    id: id(),
    organizationId: orgId(),
    passId: text("pass_id").references(() => seasonPass.id),
    visitId: text("visit_id").notNull().references(() => visit.id),
    attempt: integer("attempt").notNull().default(1),
    amount: integer("amount").notNull(),
    status: chargeStatusEnum("status").notNull().default("pending"),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    failureMessage: text("failure_message"),
    receiptUrl: text("receipt_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("charge_visit_attempt_unique").on(t.visitId, t.attempt)],
)

/** A change the customer or an admin made to a pass or one of its visits: a preference, a skip, a cancel, an added inspection, a move request. */
export const passChange = pgTable(
  "pass_change",
  {
    id: id(),
    organizationId: orgId(),
    customerId: text("customer_id").notNull().references(() => customer.id),
    passId: text("pass_id").references(() => seasonPass.id),
    visitId: text("visit_id").references(() => visit.id),
    kind: text("kind").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    byPrincipal: text("by_principal").notNull(),
    at: ts("at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pass_change_pass_idx").on(t.passId, t.at)],
)

export const scheduleRun = pgTable(
  "schedule_run",
  {
    id: id(),
    organizationId: orgId(),
    season: integer("season").notNull(),
    window: text("window").notNull(),
    proposedAt: ts("proposed_at"),
    approvedAt: ts("approved_at"),
    approvedBy: text("approved_by"),
    mode: text("mode").notNull().default("manual"),
    counts: jsonb("counts").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("schedule_run_org_idx").on(t.organizationId, t.season)],
)

/** Every message is outbound (Hannah, 2026-11-13); `direction` stays so two-way can return without a migration. */
export const messageLog = pgTable(
  "message_log",
  {
    id: id(),
    organizationId: orgId(),
    customerId: text("customer_id").notNull().references(() => customer.id),
    visitId: text("visit_id").references(() => visit.id),
    direction: text("direction").notNull().default("out"),
    channel: messageChannelEnum("channel").notNull(),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    to: text("to").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    status: messageStatusEnum("status").notNull().default("queued"),
    providerId: text("provider_id"),
    error: text("error"),
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("message_log_kind_customer_key_unique").on(t.kind, t.customerId, t.key)],
)

export const apiKey = pgTable(
  "api_key",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    hash: text("hash").notNull().unique(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdBy: text("created_by"),
    lastUsedAt: ts("last_used_at"),
    revokedAt: ts("revoked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("api_key_org_idx").on(t.organizationId)],
)

export const apiCall = pgTable(
  "api_call",
  {
    id: id(),
    organizationId: orgId(),
    principalKind: principalKindEnum("principal_kind").notNull(),
    principalId: text("principal_id").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    durationMs: integer("duration_ms"),
    idempotencyKey: text("idempotency_key"),
    at: ts("at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("api_call_org_at_idx").on(t.organizationId, t.at)],
)

export const idempotency = pgTable(
  "idempotency",
  {
    id: id(),
    organizationId: orgId(),
    key: text("key").notNull(),
    principalId: text("principal_id").notNull(),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response"),
    at: ts("at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("idempotency_org_key_unique").on(t.organizationId, t.key)],
)

export const webhookEndpoint = pgTable("webhook_endpoint", {
  id: id(),
  organizationId: orgId(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const outboundEvent = pgTable("outbound_event", {
  id: id(),
  organizationId: orgId(),
  endpointId: text("endpoint_id").notNull().references(() => webhookEndpoint.id),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  attempts: integer("attempts").notNull().default(0),
  deliveredAt: ts("delivered_at"),
  error: text("error"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const jobberToken = pgTable("jobber_token", {
  id: id(),
  organizationId: orgId(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const syncRun = pgTable("sync_run", {
  id: id(),
  organizationId: orgId(),
  kind: text("kind").notNull(),
  startedAt: ts("started_at").notNull().defaultNow(),
  finishedAt: ts("finished_at"),
  status: text("status", { enum: ["running", "ok", "failed"] }).notNull().default("running"),
  counts: jsonb("counts").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
  error: text("error"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** The claimed queue: a webhook inserts, a drain claims with one atomic UPDATE ... RETURNING. */
export const queueItem = pgTable(
  "queue_item",
  {
    id: id(),
    organizationId: orgId(),
    kind: queueKindEnum("kind").notNull(),
    key: text("key").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    status: text("status", { enum: ["pending", "claimed", "done", "failed"] }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    runAfter: ts("run_after").notNull().defaultNow(),
    claimedAt: ts("claimed_at"),
    doneAt: ts("done_at"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("queue_item_kind_key_unique").on(t.kind, t.key),
    index("queue_item_drain_idx").on(t.status, t.runAfter),
  ],
)

// The read-only Jobber mirror. Ids are Jobber's own.
export const jobberClient = pgTable("jobber_client", {
  id: text("id").primaryKey(),
  organizationId: orgId(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  town: townEnum("town"),
  jobberUrl: text("jobber_url"),
  syncedAt: ts("synced_at").notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const jobberJob = pgTable("jobber_job", {
  id: text("id").primaryKey(),
  organizationId: orgId(),
  clientId: text("client_id"),
  title: text("title"),
  status: text("status"),
  hasVisit: boolean("has_visit").notNull().default(false),
  total: integer("total"),
  jobberUrl: text("jobber_url"),
  syncedAt: ts("synced_at").notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const jobberVisit = pgTable(
  "jobber_visit",
  {
    id: text("id").primaryKey(),
    organizationId: orgId(),
    jobId: text("job_id"),
    clientId: text("client_id"),
    title: text("title"),
    kind: visitKindEnum("kind"),
    town: townEnum("town"),
    startAt: ts("start_at"),
    endAt: ts("end_at"),
    assignedUserId: text("assigned_user_id"),
    isBlock: boolean("is_block").notNull().default(false),
    /** Set on rows the calendar feed wrote (busy time on that truck); their id is `feed:<truckId>:<uid>`. */
    truckId: text("truck_id").references(() => truck.id, { onDelete: "cascade" }),
    completedAt: ts("completed_at"),
    jobberUrl: text("jobber_url"),
    syncedAt: ts("synced_at").notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("jobber_visit_org_start_idx").on(t.organizationId, t.startAt)],
)

export const jobberQuote = pgTable("jobber_quote", {
  id: text("id").primaryKey(),
  organizationId: orgId(),
  clientId: text("client_id"),
  clientName: text("client_name"),
  town: townEnum("town"),
  total: integer("total"),
  sentAt: ts("sent_at"),
  status: quoteStatusEnum("status"),
  jobberUrl: text("jobber_url"),
  syncedAt: ts("synced_at").notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const jobberInvoice = pgTable("jobber_invoice", {
  id: text("id").primaryKey(),
  organizationId: orgId(),
  clientId: text("client_id"),
  clientName: text("client_name"),
  total: integer("total"),
  issuedAt: ts("issued_at"),
  dueAt: ts("due_at"),
  status: invoiceStatusEnum("status"),
  jobberUrl: text("jobber_url"),
  syncedAt: ts("synced_at").notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

// Auth.js tables (Phase 4 supplies a small adapter that fills organization_id).
export const authUser = pgTable("auth_user", {
  id: id(),
  organizationId: orgId(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: ts("email_verified"),
  image: text("image"),
  role: text("role", { enum: ["admin", "customer"] }).notNull().default("customer"),
  customerId: text("customer_id").references(() => customer.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const authAccount = pgTable(
  "auth_account",
  {
    organizationId: orgId(),
    userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
)

export const authSession = pgTable("auth_session", {
  organizationId: orgId(),
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  expires: ts("expires").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const authVerificationToken = pgTable(
  "auth_verification_token",
  {
    organizationId: orgId(),
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: ts("expires").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
)

/** A free-form line for Home: something a person should look at once (a new Season Pass), unique on kind and key so a repeat adds nothing. `resolvedAt` takes it off Home. */
export const adminAlert = pgTable(
  "admin_alert",
  {
    id: id(),
    organizationId: orgId(),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    passId: text("pass_id").references(() => seasonPass.id),
    message: text("message").notNull(),
    resolvedAt: ts("resolved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("admin_alert_kind_key_unique").on(t.organizationId, t.kind, t.key)],
)

export type ConsentRow = typeof consent.$inferSelect
