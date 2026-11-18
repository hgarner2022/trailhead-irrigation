import "server-only"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { SYSTEM_ID, type Ctx } from "@/api/core/context"
import type { EventAbout, EventKind } from "./kinds"

export interface NewEvent {
  organizationId: string
  about: EventAbout
  aboutId: string
  /** null only for an event with no customer */
  customerId?: string | null
  /** the job and the visit the event belongs to, when it has them (so a job's or a visit's story is one indexed query) */
  jobId?: string | null
  visitId?: string | null
  kind: EventKind
  detail?: Record<string, unknown>
  who: string
  /** defaults to now */
  at?: Date
  /** a fixed id makes the write once-only: a repeat (or a racing call) finds the row and adds nothing */
  id?: string
}

/** The one writer of `event`: every change and every note goes through it. Returns the new row's id. */
export async function recordEvent(db: Database, event: NewEvent): Promise<string> {
  const insert = db
    .insert(s.event)
    .values({
      ...(event.id ? { id: event.id } : {}),
      organizationId: event.organizationId,
      about: event.about,
      aboutId: event.aboutId,
      customerId: event.customerId ?? null,
      jobId: event.jobId ?? null,
      visitId: event.visitId ?? null,
      kind: event.kind,
      detail: event.detail ?? {},
      who: event.who,
      ...(event.at ? { at: event.at } : {}),
    })
  if (event.id) {
    await insert.onConflictDoNothing()
    return event.id
  }
  const [row] = await insert.returning({ id: s.event.id })
  return row!.id
}

/**
 * Who did it, as stored on an event: the signed-in person's email, `customer` (a customer's own action, and the anonymous
 * checkout visitor), `system` (the scheduler, a cron, a webhook, a queue task) or `api` (any other API key).
 */
export function whoOf(ctx: Pick<Ctx, "principal">): string {
  const p = ctx.principal
  if (p.kind === "person") return p.type === "customer" ? "customer" : p.email
  if (p.kind === "public") return "customer"
  return p.id === SYSTEM_ID ? "system" : "api"
}

/**
 * `recordEvent` for the money and webhook paths: a payment, a card change or a webhook delivery must never be lost or
 * fail because its story line could not be written. A failure is logged in one line and returns null.
 */
export async function recordEventSafe(db: Database, event: NewEvent): Promise<string | null> {
  try {
    return await recordEvent(db, event)
  } catch (error) {
    console.error(`event ${event.kind} was not recorded: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}
