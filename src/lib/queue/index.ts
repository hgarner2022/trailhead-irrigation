import "server-only"
import { sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

export type QueueKind = (typeof s.queueKindEnum.enumValues)[number]
export type QueueRow = typeof s.queueItem.$inferSelect
export type QueueHandler = (db: Database, item: QueueRow) => Promise<void>

export const MAX_ATTEMPTS = 5

/** Add an item; a second item with the same kind and key is ignored, so a repeated trigger queues one job. */
export async function enqueue(db: Database, organizationId: string, kind: QueueKind, key: string, payload: Record<string, unknown> = {}, runAfter = new Date()) {
  const rows = await db.insert(s.queueItem).values({ organizationId, kind, key, payload, runAfter }).onConflictDoNothing().returning({ id: s.queueItem.id })
  return rows.length > 0
}

/** Claim the oldest due item of the given kinds with one atomic UPDATE ... RETURNING, so two drains never run the same item. */
export async function claimNext(db: Database, kinds: QueueKind[], now = new Date()): Promise<QueueRow | undefined> {
  const list = sql.join(kinds.map((k) => sql`${k}`), sql`, `)
  const result = (await db.execute(sql`
    update queue_item set status = 'claimed', claimed_at = ${now}, attempts = attempts + 1, updated_at = ${now}
    where id = (select id from queue_item where status = 'pending' and run_after <= ${now} and kind::text in (${list})
                order by run_after, created_at limit 1 for update skip locked)
    returning id`)) as unknown as { rows: { id: string }[] }
  const id = result.rows[0]?.id
  if (!id) return undefined
  const [row] = await db.select().from(s.queueItem).where(sql`${s.queueItem.id} = ${id}`)
  return row
}

/** Run every due item of `handlers`' kinds; a throw retries with a growing delay until MAX_ATTEMPTS, then the item is `failed` with its error. */
export async function drain(db: Database, handlers: Partial<Record<QueueKind, QueueHandler>>, now = () => new Date(), limit = 50) {
  const kinds = Object.keys(handlers) as QueueKind[]
  let done = 0
  let failed = 0
  for (let i = 0; i < limit; i++) {
    const item = await claimNext(db, kinds, now())
    if (!item) break
    try {
      await handlers[item.kind]!(db, item)
      await db.update(s.queueItem).set({ status: "done", doneAt: now(), lastError: null }).where(sql`${s.queueItem.id} = ${item.id}`)
      done++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const dead = item.attempts >= MAX_ATTEMPTS
      await db.update(s.queueItem)
        .set({ status: dead ? "failed" : "pending", lastError: message.slice(0, 500), runAfter: new Date(now().getTime() + 60_000 * 2 ** item.attempts) })
        .where(sql`${s.queueItem.id} = ${item.id}`)
      failed++
    }
  }
  return { done, failed }
}
