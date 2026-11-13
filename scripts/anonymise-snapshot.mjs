#!/usr/bin/env node
// Builds the admin prototype fixture from a raw Jobber pull.
//
//   node scripts/anonymise-snapshot.mjs
//
// Reads  .local-data/admin/jobber-raw-2026-11.json  (git-ignored, real data)
// Writes src/lib/admin/fixtures/snapshot.json       (anonymised, committed)
//
// The output satisfies AdminData in src/lib/admin/types.ts. Nothing that could
// identify a customer survives: first names only (pseudonymised when a first
// name is also someone's last name or looks like an address), towns folded
// into the six we serve, no emails, phones, street addresses or last names.
// Passes are invented: Jobber has no Season Pass product yet.

import { readFileSync, writeFileSync, statSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const RAW = process.argv[2] ?? resolve(ROOT, ".local-data/admin/jobber-raw-2026-11.json")
const OUT = resolve(ROOT, "src/lib/admin/fixtures/snapshot.json")

// ---------------------------------------------------------------------------
// Towns. Anything outside the six is folded into the nearest town we serve.
// ---------------------------------------------------------------------------
const TOWN_MAP = {
  erie: "Erie",
  longmont: "Longmont",
  niwot: "Longmont",
  louisville: "Louisville",
  boulder: "Louisville",
  superior: "Louisville",
  lafayette: "Lafayette",
  firestone: "Firestone",
  frederick: "Firestone",
  dacono: "Firestone",
  broomfield: "Broomfield",
  westminster: "Broomfield",
  thornton: "Broomfield",
}
const DEFAULT_TOWN = "Erie"
const townMapping = {}
function town(city) {
  const key = String(city ?? "").trim().toLowerCase()
  const mapped = TOWN_MAP[key] ?? DEFAULT_TOWN
  const label = key || "(none)"
  townMapping[label] = mapped
  return mapped
}

// ---------------------------------------------------------------------------
// Visit kinds, from Jobber service names first and visit titles second.
// Order matters: a "Turn-on & System Check" is a turn-on, not an inspection.
// ---------------------------------------------------------------------------
const KIND_RULES = [
  ["blowout", /blowout|winteriz/i],
  ["turn-on", /turn[- ]?on|start[- ]?up|activation/i],
  ["install", /install|new system/i],
  ["inspection", /inspection|mid[- ]?season|tune[- ]?up|check/i],
  ["repair", /repair|fix|leak|head|valve|rebuild|nozzle|drip|wir(e|ing)|coverage/i],
]
const KIND_RANK = { blowout: 0, "turn-on": 1, install: 2, inspection: 3, repair: 4, other: 9 }
function kindOf(text) {
  for (const [kind, re] of KIND_RULES) if (re.test(text)) return kind
  return "other"
}

// ---------------------------------------------------------------------------
// Internal calendar blocks that are not customers.
// ---------------------------------------------------------------------------
const INTERNAL_CLIENT = /unavail|\bavailable\b|^day off|^vacation|^ooo\b|\btest\b|^pick up|^time off/i
const INTERNAL_JOB = /^ooo$|^4th$|unavail|^time off|bad weather|basball|dr appointment|^trenton$|previous day clean up/i

// ---------------------------------------------------------------------------
// First names. Real first names stay unless they collide with a last name in
// the pull or look like an address, in which case a pseudonym is used.
// ---------------------------------------------------------------------------
const LOOKS_LIKE_ADDRESS = /@|\d|street|st\.|ave|drive|ln\b|court|ct\b/i
const PSEUDONYMS = ["Alex", "Jordan", "Casey", "Taylor", "Morgan", "Riley", "Jamie", "Avery", "Quinn", "Reese", "Rowan", "Sam", "Devon", "Kendall", "Blake", "Harper"]

function titleCase(s) {
  return s
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("-")
}

// ---------------------------------------------------------------------------
// Season Pass pricing, mirrored from src/lib/season-pass.ts.
// ---------------------------------------------------------------------------
const PASS_VISITS = [
  { kind: "turn-on", window: "April to May", base: 145, includedZones: 8 },
  { kind: "inspection", window: "July", base: 145, includedZones: 8 },
  { kind: "blowout", window: null, base: 95, includedZones: 6 },
]
const EXTRA_ZONE_PRICE = 10
const visitPrice = (v, zones) => v.base + Math.max(0, zones - v.includedZones) * EXTRA_ZONE_PRICE
const BLOWOUT_MONDAYS = ["2027-10-04", "2027-10-11", "2027-10-18", "2027-10-25"]
const ordinal = (n) => `${n}${[, "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th"}`

// ---------------------------------------------------------------------------
const raw = JSON.parse(readFileSync(RAW, "utf8"))
const services = new Map(raw.services.map((s) => [s.id, s.name]))
const lastNames = new Set(raw.clients.map((c) => (c.lastName ?? "").trim().toLowerCase()).filter(Boolean))
const pseudonyms = PSEUDONYMS.filter((p) => !lastNames.has(p.toLowerCase()) && !LOOKS_LIKE_ADDRESS.test(p))
let pseudonymsUsed = 0

const rawJobs = new Map(raw.jobs.map((j) => [j.id, j]))
const jobsByClient = new Map()
for (const j of raw.jobs) {
  if (!jobsByClient.has(j.client?.id)) jobsByClient.set(j.client.id, [])
  jobsByClient.get(j.client.id).push(j)
}

// Clients -------------------------------------------------------------------
const clients = []
const clientById = new Map()
for (const c of raw.clients) {
  if (INTERNAL_CLIENT.test(c.name ?? "")) continue
  let firstName = c.isCompany ? "Customer" : (c.firstName ?? "").trim().split(/\s+/)[0] ?? ""
  if (!firstName) firstName = "Customer"
  else if (firstName !== "Customer") {
    firstName = titleCase(firstName)
    if (lastNames.has(firstName.toLowerCase()) || LOOKS_LIKE_ADDRESS.test(firstName)) {
      firstName = pseudonyms[pseudonymsUsed++ % pseudonyms.length]
    }
  }
  const city = c.billingAddress?.city ?? (jobsByClient.get(c.id) ?? []).find((j) => j.property?.address?.city)?.property.address.city
  const client = {
    id: `c${clients.length + 1}`,
    firstName,
    town: town(city),
    jobberUrl: c.jobberWebUri,
    hasPass: false,
  }
  clients.push(client)
  clientById.set(c.id, client)
}

// Visits --------------------------------------------------------------------
const kindCounts = {}
const statusCounts = {}
const visits = []
const sortedVisits = [...raw.visits].sort((a, b) => String(a.startAt ?? "").localeCompare(String(b.startAt ?? "")))
for (const v of sortedVisits) {
  const job = rawJobs.get(v.job?.id)
  if (!job) continue
  const client = clientById.get(job.client?.id)
  if (!client) continue
  if (INTERNAL_JOB.test(job.title ?? "") || INTERNAL_JOB.test(v.title ?? "")) continue

  const serviceKinds = (v.serviceIds ?? []).map((id) => kindOf(services.get(id) ?? ""))
  let kind = serviceKinds.sort((a, b) => KIND_RANK[a] - KIND_RANK[b])[0]
  if (!kind || kind === "other") kind = kindOf(`${v.title ?? ""} ${job.title ?? ""}`)

  let status
  if (v.status === "completed" || v.isComplete) status = "completed"
  else if (v.status === "unscheduled") status = "unscheduled"
  else if (v.status === "cancelled") status = "cancelled"
  else status = "scheduled" // upcoming, today, late

  const visit = {
    id: `v${visits.length + 1}`,
    clientId: client.id,
    clientName: client.firstName,
    town: job.property?.address?.city ? town(job.property.address.city) : client.town,
    kind,
    status,
    ...(status === "unscheduled" || !v.startAt ? {} : { startAt: v.startAt }),
    isPass: false,
    jobberUrl: job.jobberWebUri,
  }
  visits.push(visit)
  kindCounts[kind] = (kindCounts[kind] ?? 0) + 1
  statusCounts[status] = (statusCounts[status] ?? 0) + 1
  if (status === "completed" && visit.startAt && (!client.lastVisitAt || visit.startAt > client.lastVisitAt)) {
    client.lastVisitAt = visit.startAt
  }
}

// Quotes --------------------------------------------------------------------
const QUOTE_STATUS = { awaiting_response: "awaiting", approved: "approved", converted: "approved", archived: "declined", changes_requested: "declined" }
const quotes = []
for (const q of raw.quotes) {
  const status = QUOTE_STATUS[q.status]
  if (!status) continue
  const client = clientById.get(q.client?.id)
  if (!client) continue
  quotes.push({
    id: `q${quotes.length + 1}`,
    clientName: client.firstName,
    town: client.town,
    total: Math.round(q.total ?? 0),
    sentAt: q.sentAt ?? q.createdAt,
    status,
    jobberUrl: q.jobberWebUri,
  })
}

// Invoices ------------------------------------------------------------------
const INVOICE_STATUS = { paid: "paid", past_due: "overdue", awaiting_payment: "unpaid", sent_not_due: "unpaid" }
const invoices = []
for (const i of raw.invoices) {
  const status = INVOICE_STATUS[i.status]
  if (!status) continue
  const client = clientById.get(i.client?.id)
  if (!client) continue
  invoices.push({
    id: `i${invoices.length + 1}`,
    clientName: client.firstName,
    total: Math.round(i.total ?? 0),
    issuedAt: i.issuedDate ?? i.createdAt,
    dueAt: i.dueDate ?? i.issuedDate ?? i.createdAt,
    status,
    jobberUrl: i.jobberWebUri,
  })
}

// Month totals --------------------------------------------------------------
const months = new Map()
const monthKey = (iso) => {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`
}
const bump = (key, field, by) => {
  const [year, month] = key.split("-").map(Number)
  if (!months.has(key)) months.set(key, { year, month, revenue: 0, visits: 0 })
  months.get(key)[field] += by
}
for (const i of invoices) if (i.status === "paid") bump(monthKey(i.issuedAt), "revenue", i.total)
for (const v of visits) if (v.status === "completed" && v.startAt) bump(monthKey(v.startAt), "visits", 1)
const monthTotals = [...months.values()]
  .filter((m) => m.year === 2025 || m.year === 2026)
  .sort((a, b) => a.year - b.year || a.month - b.month)

// Passes (invented) ---------------------------------------------------------
const byClientKinds = new Map()
for (const v of visits) {
  if (!v.startAt?.startsWith("2026")) continue
  if (!byClientKinds.has(v.clientId)) byClientKinds.set(v.clientId, new Set())
  byClientKinds.get(v.clientId).add(v.kind)
}
const eligible = clients.filter((c) => {
  const kinds = byClientKinds.get(c.id)
  return kinds?.has("turn-on") && kinds?.has("blowout")
})
// Round-robin across towns so the twelve are spread out.
const byTown = new Map()
for (const c of eligible) (byTown.get(c.town) ?? byTown.set(c.town, []).get(c.town)).push(c)
const chosen = []
while (chosen.length < 12 && [...byTown.values()].some((l) => l.length)) {
  for (const list of byTown.values()) {
    if (chosen.length >= 12) break
    const c = list.shift()
    if (c) chosen.push(c)
  }
}
if (chosen.length < 12) throw new Error(`only ${chosen.length} clients have both a turn-on and a blowout in 2026`)

const ZONES = [6, 8, 7, 10, 6, 12, 8, 9, 6, 11, 8, 7]
const CARDS = ["4242", "1881", "5556", "0005", "3222", "4444", "9424", "7107", "0002", "6291", "8431", "2277"]
const passes = chosen.map((client, n) => {
  const i = n + 1
  const zones = ZONES[n]
  const monday = BLOWOUT_MONDAYS[n % 4]
  const day = Number(monday.slice(-2))
  client.hasPass = true
  const visitsForPass = PASS_VISITS.map((pv) => ({
    kind: pv.kind,
    window: pv.window ?? `October, week of the ${ordinal(day)}`,
    amount: visitPrice(pv, zones),
  }))
  if (n < 2) {
    visitsForPass[0].scheduledAt = `2027-04-${20 + n}T16:00:00Z`
    visitsForPass[0].completedAt = `2027-04-${20 + n}T17:10:00Z`
    visitsForPass[0].chargedAt = `2027-04-${20 + n}T17:12:00Z`
  }
  return {
    id: `p${i}`,
    number: `TH-2027-${String(i).padStart(4, "0")}`,
    season: 2027,
    clientId: client.id,
    firstName: client.firstName,
    town: client.town,
    zones,
    blowoutWeek: monday,
    status: i === 9 ? "cancelled" : "active",
    visits: visitsForPass,
    stripeUrl: `https://dashboard.stripe.com/customers/cus_test_${i}`,
    jobberUrl: client.jobberUrl,
    cardLast4: CARDS[n],
    cardExpires: i === 5 ? "2027-09" : "2028-08",
  }
})

const blowoutWeeks = BLOWOUT_MONDAYS.map((weekStart) => {
  const inWeek = passes.filter((p) => p.blowoutWeek === weekStart && p.status === "active")
  return {
    season: 2027,
    weekStart,
    capacity: 20,
    taken: inWeek.length,
    towns: [...new Set(inWeek.map((p) => p.town))],
  }
})

const attention = [
  { kind: "charge-failed", passId: "p3", message: "Card declined for the spring turn-on; customer emailed an update link", since: "2026-11-10T15:04:00Z" },
  { kind: "jobs-failed", passId: "p7", message: "Jobber jobs for pass TH-2027-0007 were not created; retrying", since: "2026-11-11T22:41:00Z" },
  { kind: "card-expiring", passId: "p5", message: "Card on file expires before the October blowout", since: "2026-11-12T08:00:00Z" },
]

// Write ---------------------------------------------------------------------
const data = {
  organizationId: "org_trailhead",
  syncedAt: raw.pulledAt,
  clients,
  visits,
  quotes,
  invoices,
  passes,
  blowoutWeeks,
  monthTotals,
  attention,
}
writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n")

console.log(`wrote ${OUT} (${Math.round(statSync(OUT).size / 1024)} KB)`)
console.log("counts", { clients: clients.length, visits: visits.length, quotes: quotes.length, invoices: invoices.length, passes: passes.length })
console.log("town mapping", townMapping)
console.log("visit kinds", kindCounts)
console.log("visit statuses", statusCounts)
console.log("pseudonyms used", pseudonymsUsed)
console.log("month totals", monthTotals.map((m) => `${m.year}-${String(m.month).padStart(2, "0")}: $${m.revenue} / ${m.visits} visits`).join("\n  "))
console.log("passes", passes.map((p) => `${p.number} ${p.town} ${p.blowoutWeek} ${p.status}`).join("\n  "))
console.log("blowout weeks", blowoutWeeks.map((w) => `${w.weekStart}: ${w.taken}/${w.capacity} ${w.towns.join(", ")}`).join("\n  "))
