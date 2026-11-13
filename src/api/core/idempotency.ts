import "server-only"
import { createHash } from "node:crypto"
import { and, eq } from "drizzle-orm"
import type { Database } from "@/db/types"
import * as s from "@/db/schema"
import { ApiError } from "./errors"

const REDACTED = { redacted: true }
export const hashRequest = (name: string, input: unknown) => createHash("sha256").update(`${name}\n${JSON.stringify(input)}`).digest("hex")

/**
 * Runs `fn` once per (organization, key). The same key with the same request
 * returns the stored response; the same key with a different request, a
 * different caller, or a request still running is a 409. A failed run releases
 * the key so it can be retried.
 */
export async function withIdempotency<T>(
  db: Database,
  org: string,
  principalId: string,
  key: string,
  requestHash: string,
  fn: () => Promise<T>,
  redact = false,
): Promise<T> {
  const [existing] = await db.select().from(s.idempotency).where(and(eq(s.idempotency.organizationId, org), eq(s.idempotency.key, key)))
  if (existing) return replay<T>(existing, principalId, requestHash)
  const claimed = await db
    .insert(s.idempotency)
    .values({ organizationId: org, key, principalId, requestHash })
    .onConflictDoNothing()
    .returning({ id: s.idempotency.id })
  if (!claimed[0]) throw new ApiError("conflict", "Another request with this Idempotency-Key is running")
  const rowId = claimed[0].id
  try {
    const out = await fn()
    await db.update(s.idempotency).set({ response: (redact ? REDACTED : out) as never }).where(eq(s.idempotency.id, rowId))
    return out
  } catch (error) {
    await db.delete(s.idempotency).where(eq(s.idempotency.id, rowId))
    throw error
  }
}

function replay<T>(row: typeof s.idempotency.$inferSelect, principalId: string, requestHash: string): T {
  if (row.requestHash !== requestHash || row.principalId !== principalId)
    throw new ApiError("conflict", "This Idempotency-Key was already used for a different request")
  if ((row.response as { redacted?: boolean } | null)?.redacted)
    throw new ApiError("conflict", "This request already succeeded; its secret was shown once and is not stored")
  if (row.response === null) throw new ApiError("conflict", "Another request with this Idempotency-Key is running")
  return row.response as T
}
