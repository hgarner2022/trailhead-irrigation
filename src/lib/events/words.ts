// The words of an event: one sentence per kind, in the words of docs/UX_WRITING.md (marked done, moved, set; never "closed",
// "failed" or "declined"). Pure, so the API, the admin's shaping and the stories all read the same sentence. The date in front
// of the line ("Nov 17") is the screen's, not this file's.
import { monthDay, monthShort, preferencePhrase } from "@/lib/admin/format"
import { NOT_DONE_LABEL, type NotDoneReason } from "@/lib/admin/visit-defaults"
import { METHOD_WORDS } from "@/lib/money/words"
import { visitName } from "./names"

/** What the words need of an event: its kind, what it recorded and who did it (the same fields as `EventOut`). */
export interface EventForWords {
  kind: string
  detail: Record<string, unknown>
  who: string
}

export interface EventWords {
  /** "Ryan", "the customer" or "Trailhead" */
  actor: string
  /** the sentence on its own: "Spring turn-on marked done, paid by Venmo" */
  what: string
  /** the actor and the sentence together: "Ryan: Spring turn-on marked done, paid by Venmo" */
  text: string
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined)
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const money = (n: number | undefined) => (n === undefined ? undefined : `$${Math.round(n).toLocaleString("en-US")}`)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Apr 22" from a YYYY-MM-DD day or an ISO timestamp (the day as written, never shifted by a zone); undefined for anything else. */
function dayWords(v: unknown): string | undefined {
  const s = str(v)
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return undefined
  const { month, day } = monthDay(s)
  return `${monthShort(month)} ${day}`
}

const methodWords = (v: unknown) => {
  const m = str(v)
  return m ? (METHOD_WORDS[m] ?? m.replace(/_/g, " ")) : undefined
}

const BRANDS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover" }
function cardWords(detail: Record<string, unknown>): string {
  const brand = str(detail.brand)
  const last4 = str(detail.last4)
  const name = brand ? (BRANDS[brand.toLowerCase()] ?? cap(brand)) : undefined
  if (name && last4) return `${name} ending ${last4}`
  if (last4) return `card ending ${last4}`
  return name ?? "card"
}

/** The visit's name in the sentence: the one the event carries, the kind's line name for a day-filled row, else "the visit". */
const visitWords = (d: Record<string, unknown>) => str(d.name) ?? (str(d.visit) ? visitName(str(d.visit)!) : "The visit")
/** "bill INV-2026-0001", or just "bill" when the number was not recorded. */
const bill = (d: Record<string, unknown>) => (str(d.number) ? `bill ${str(d.number)}` : "bill")
const lower = (s: string) => (s === "The visit" ? "the visit" : s)

const EDIT_LABEL: Record<string, string> = {
  durationMinutes: "length",
  price: "price",
  personId: "who has it",
  accessNote: "access note",
  notes: "notes",
  unscheduled: "day taken back",
}

function editWords(d: Record<string, unknown>): string {
  const name = visitWords(d)
  const parts: string[] = []
  for (const [key, value] of Object.entries(d)) {
    if (key === "name" || key === "visit") continue
    const change = obj(value)
    if (key === "durationMinutes" && num(change.to) !== undefined) parts.push(num(change.from) !== undefined ? `length ${change.from} to ${change.to} minutes` : `length set to ${change.to} minutes`)
    else if (key === "price" && num(change.to) !== undefined) parts.push(num(change.from) !== undefined ? `price ${money(num(change.from))} to ${money(num(change.to))}` : `price set to ${money(num(change.to))}`)
    else if (key === "unscheduled") parts.push("day taken back")
    else parts.push(`${EDIT_LABEL[key] ?? key} changed`)
  }
  return parts.length ? `${name} edited: ${parts.join(", ")}` : `${name} edited`
}

const FIELD_LABEL: Record<string, string> = {
  firstName: "name", lastName: "name", email: "email", phone: "phone", leadSource: "lead source",
  address: "address", town: "town", zones: "zones", controller: "controller", backflowLocation: "backflow location", gateCode: "gate code",
  mustBeHome: "must be home", accessNote: "access note", contactName: "contact name", contactPhone: "contact phone", notes: "notes",
}
const fieldList = (changed: unknown) => [...new Set(Object.keys(obj(changed)).map((k) => FIELD_LABEL[k] ?? k))]

function consentWords(d: Record<string, unknown>): string {
  if (d.stage === "chosen") return "Marketing choices noted"
  const channels = Array.isArray(d.marketingChannels) ? d.marketingChannels.filter((c): c is string => typeof c === "string") : []
  if (!d.marketingOptIn || channels.length === 0) return "Consent recorded, marketing off"
  const both = channels.includes("sms") && channels.includes("email")
  return `Consent recorded, marketing ${both ? "texts and email" : channels.includes("sms") ? "texts" : "email"} on`
}

function soldWords(d: Record<string, unknown>): string {
  const number = str(d.passNumber)
  const source = str(d.source)
  if (number) {
    const name = `${str(d.name) ?? "Season Pass"} ${number}`
    return `${name} ${source === "office" ? "sold by the office" : source === "renewal" ? "renewed" : "bought online"}`
  }
  const name = str(d.name) ?? "Job"
  return `${name} ${source === "website" || source === "site" ? "booked online" : "added by the office"}`
}

/** "Rotors, 12 added, 12 × $38", "Drip zone added, quote later": a line of a job and what was done to it. */
function lineWords(d: Record<string, unknown>, did: string): string {
  const name = str(d.name) ?? "A line"
  const price = num(d.unitPrice)
  const qty = num(d.quantity) ?? 1
  const tail = price === undefined ? "" : price > 0 ? `, ${qty > 1 ? `${qty} × ` : ""}${money(price)}` : ", quote later"
  return `${name} ${did}${tail}`
}

/** The sentence for an event, without the actor. */
function whatOf(e: EventForWords): string {
  const d = e.detail ?? {}
  const name = visitWords(d)
  switch (e.kind) {
    case "job.sold": return soldWords(d)
    case "job.cancelled": return str(d.reason) ? `Job cancelled, ${d.reason}` : "Job cancelled"
    case "job.line-added": return lineWords(d, "added")
    case "job.line-edited": return lineWords(d, "changed")
    case "job.line-cancelled": return `${str(d.name) ?? "A line"} cancelled`
    case "visit.scheduled": return dayWords(d.day) ? `${name} scheduled for ${dayWords(d.day)}` : `${name} scheduled`
    case "visit.moved": {
      const from = dayWords(d.from)
      const to = dayWords(d.day)
      return from && to ? `${name} moved from ${from} to ${to}` : to ? `${name} moved to ${to}` : `${name} moved`
    }
    case "visit.day-filled": {
      const from = dayWords(d.from)
      const to = dayWords(d.to)
      return to ? `${name} set for ${to}, the next open day${from ? ` after ${from}` : ""}` : `${name} set for the next open day`
    }
    case "visit.move-requested": {
      const week = dayWords(d.preferredWeek)
      const note = str(d.note)
      return `Move requested for ${lower(name)}${week ? `, week of ${week}` : ""}${note ? `: ${note}` : ""}`
    }
    case "visit.done": {
      const paid = str(d.paidBy)
      return `${name} marked done${paid ? (paid === "bill" ? ", bill sent" : `, paid by ${methodWords(paid)}`) : ""}`
    }
    case "visit.undone": return `${name} put back to not done`
    case "visit.not-done": {
      const reason = str(d.reason)
      const why = reason ? (NOT_DONE_LABEL[reason as NotDoneReason] ?? reason) : undefined
      const note = str(d.note)
      return `${name} marked not done${why ? `, ${why.charAt(0).toLowerCase()}${why.slice(1)}` : ""}${note ? `: ${note}` : ""}`
    }
    case "visit.cancelled": return str(d.reason) ? `${name} cancelled, ${d.reason}` : `${name} cancelled`
    case "visit.skipped": return `${name} skipped`
    case "visit.edited": return editWords(d)
    case "pass.cancelled": {
      const number = str(d.passNumber)
      const reason = str(d.reason)
      return `Season Pass${number ? ` ${number}` : ""} cancelled${reason ? `, ${reason}` : ""}`
    }
    case "pass.preference-changed": {
      const kind = str(d.visit)
      const to = str(d.to)
      const label = kind === "turn-on" || kind === "blowout" ? (kind === "turn-on" ? "Spring turn-on" : "Fall blowout") : "The visit"
      if (kind !== "turn-on" && kind !== "blowout") return `${label} timing changed`
      const phrase = (p: unknown) => (p === "earlier" || p === "recommended" || p === "later" ? preferencePhrase(kind, p) : undefined)
      const from = phrase(d.from)
      return to && phrase(to) ? `${label} timing changed${from ? ` from ${from}` : ""} to ${phrase(to)}` : `${label} timing changed`
    }
    case "pass.inspection-added": return money(num(d.amount)) ? `Mid-season inspection added, ${money(num(d.amount))}` : "Mid-season inspection added"
    case "consent": return consentWords(d)
    case "payment.succeeded": {
      const amount = money(num(d.amount))
      const method = methodWords(d.method)
      const forName = str(d.name)
      // "$145 paid by check, Repair": the line name follows the method; without a method it reads "$145 paid for Repair"
      const by = method && method !== "bill" ? ` by ${method}` : ""
      return `${amount ?? "Payment"} paid${by}${forName ? (by ? `, ${forName}` : ` for ${forName}`) : ""}`
    }
    case "payment.failed": {
      const amount = money(num(d.amount))
      const forName = str(d.name)
      return `${amount ? `${amount} payment` : "Payment"}${forName ? ` for ${forName}` : ""} didn't go through`
    }
    case "payment.refunded": {
      const amount = money(num(d.amount))
      const method = methodWords(d.method)
      const reason = str(d.reason)
      return `${amount ?? "Payment"} refunded${method ? `, ${method}` : ""}${reason ? `, ${reason}` : ""}`
    }
    case "invoice.sent": return `${cap(bill(d))} sent${dayWords(d.dueOn) ? `, due ${dayWords(d.dueOn)}` : ""}`
    case "invoice.reminded": return `Reminder sent for ${str(d.number) ? bill(d) : "the bill"}${dayWords(d.dueOn) ? `, due ${dayWords(d.dueOn)}` : ""}`
    case "invoice.paid": return `${cap(bill(d))} paid${methodWords(d.how) ? `, ${methodWords(d.how)}` : ""}`
    case "invoice.cancelled": return `${cap(bill(d))} cancelled`
    case "card.saved": return `Card saved, ${cardWords(d)}`
    case "card.failed": return `${cap(cardWords(d))} didn't go through`
    case "card.removed": return `Card removed, ${cardWords(d)}`
    case "customer.edited": {
      if (d.created) return "Customer added"
      const fields = fieldList(d.changed)
      return fields.length ? `Customer details changed: ${fields.join(", ")}` : "Customer details changed"
    }
    case "property.edited": {
      const fields = fieldList(d.changed)
      return fields.length ? `Property details changed: ${fields.join(", ")}` : "Property details changed"
    }
    case "note": return str(d.text) ?? "Note"
    default: return "Something changed"
  }
}

/** Who did it, in words: the person's first name, "the customer", or "Trailhead" for the scheduler, a webhook, a queue task or an API key. */
export function whoWords(who: string, whoName?: string | null): string {
  if (who === "customer") return "the customer"
  if (who === "system" || who === "api") return "Trailhead"
  if (who === "colleague") return "a colleague" // a tech's story, where a person with no name is never an email
  const first = whoName?.trim().split(/\s+/)[0]
  if (first) return first
  const local = who.split("@")[0] ?? who
  return local ? cap(local) : "Someone"
}

/** The words of an event: who did it, what happened, and both together. Any kind it does not know reads "Something changed". */
export function eventWords(event: EventForWords, whoName?: string | null): EventWords {
  const actor = whoWords(event.who, whoName)
  const what = whatOf(event)
  return { actor, what, text: `${actor}: ${what}` }
}

/** The kinds a person without the `write` scope reads: notes, the sale, the pass and the visit. Money, card, consent and contact never reach them. */
const TECH_KIND = /^(note|job\.sold|pass\..+|visit\..+)$/
/** What a tech never reads even inside a kind they may: money, the gate and the way to reach the customer. */
const TECH_STRIPPED = ["amount", "price", "total", "reference", "gateCode", "accessNote", "contactPhone", "email", "phone"] as const

/**
 * An event as a tech may read it: null for a kind they do not see (`payment.*`, `invoice.*`, `card.*`, `consent`,
 * `customer.edited`, `property.edited`, anything unknown), and for the rest the detail without money, gate, access or contact
 * fields and a `who` that is never an email.
 */
export function techEvent<T extends { kind: string; detail: Record<string, unknown>; who?: string; whoName?: string | null }>(event: T): T | null {
  if (!TECH_KIND.test(event.kind)) return null
  const detail = { ...event.detail }
  for (const key of TECH_STRIPPED) delete detail[key]
  // a colleague's email is theirs: a tech reads the person's name (`whoName` stays), or "Trailhead" when the person has none
  const who = event.who?.includes("@") ? (event.whoName?.trim() || "Trailhead") : event.who
  return { ...event, detail, ...(who === undefined ? {} : { who }) }
}
