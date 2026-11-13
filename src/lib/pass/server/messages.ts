import "server-only"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { preferencePhrase } from "@/lib/admin/format"
import type { TimingPreference } from "@/lib/admin/types"

const KIND_NAME: Record<string, string> = { "turn-on": "spring turn-on", inspection: "July inspection", blowout: "fall blowout" }
export const kindName = (kind: string) => KIND_NAME[kind] ?? kind

export const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

export interface QueuedMessage {
  organizationId: string
  customerId: string
  visitId?: string | null
  kind: "receipt" | "card-failed" | "card-expiring" | "purchase-confirmation"
  /** with `kind` and the customer, makes the row unique: a repeat of the same event adds nothing */
  key: string
  to: string
  subject: string
  body: string
}

/** Writes one email row with status `queued`. Sending is the messaging layer's job (Phase 12); this only records what must go. Returns whether a row was added. */
export async function queueEmail(db: Database, m: QueuedMessage): Promise<boolean> {
  const rows = await db
    .insert(s.messageLog)
    .values({ organizationId: m.organizationId, customerId: m.customerId, visitId: m.visitId ?? null, channel: "email", kind: m.kind, key: m.key, to: m.to, subject: m.subject, body: m.body, status: "queued" })
    .onConflictDoNothing()
    .returning({ id: s.messageLog.id })
  return rows.length > 0
}

interface NextVisit {
  kind: string
  status: string
  scheduledOn: string | null
  preference: TimingPreference | null
}

const longDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })

/** "Your fall blowout is Tuesday, October 6." or, with no day yet, "Your fall blowout is planned for early October." */
export function nextVisitLine(visits: NextVisit[]): string {
  const order = ["turn-on", "inspection", "blowout"]
  const next = visits
    .filter((v) => order.includes(v.kind) && !["completed", "cancelled", "skipped"].includes(v.status))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0]
  if (!next) return "That was the last visit on your pass this season."
  const name = kindName(next.kind)
  if (next.scheduledOn) return `Your ${name} is ${longDay(next.scheduledOn)}.`
  if (next.preference && (next.kind === "turn-on" || next.kind === "blowout")) return `Your ${name} is planned for ${preferencePhrase(next.kind, next.preference)}. We will send the day once it is set.`
  return `We will send the day of your ${name} once it is set.`
}
