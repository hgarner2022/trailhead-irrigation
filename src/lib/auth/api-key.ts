import "server-only"
import { createHmac, randomInt } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@/db/types"
import * as s from "@/db/schema"
import { readEnv } from "@/lib/env"
import type { AdminRole } from "./allow"
import type { ApiKeyPrincipal, Scope } from "./types"

export const KEY_PREFIX = "th_live_"
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
export const SCOPES: readonly Scope[] = ["read", "write", "admin"]

/** SHA-256 over the key, keyed with `API_KEY_PEPPER`. Only this is stored, never the key. */
export function hashApiKey(raw: string): string {
  const { API_KEY_PEPPER } = readEnv(["API_KEY_PEPPER"])
  return createHmac("sha256", API_KEY_PEPPER).update(raw).digest("hex")
}

function randomBase62(length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

export interface CreateApiKeyInput {
  name: string
  scopes: readonly string[]
  /** The creator's role. The `admin` scope is only grantable by an owner. */
  byRole?: AdminRole
}

/** Makes a key and returns it once; the database keeps only its prefix and peppered hash. */
export async function createApiKey(
  db: Database,
  organizationId: string,
  byEmail: string,
  { name, scopes, byRole }: CreateApiKeyInput,
): Promise<{ id: string; key: string; prefix: string }> {
  const unknown = scopes.find((scope) => !SCOPES.includes(scope as Scope))
  if (unknown) throw new Error(`unknown scope "${unknown}"`)
  if (scopes.includes("admin") && byRole !== "owner") throw new Error("only an owner can grant the admin scope")
  const key = KEY_PREFIX + randomBase62(32)
  const prefix = key.slice(0, KEY_PREFIX.length + 4)
  const [row] = await db
    .insert(s.apiKey)
    .values({ organizationId, name, prefix, hash: hashApiKey(key), scopes: [...new Set(scopes)], createdBy: byEmail })
    .returning({ id: s.apiKey.id })
  return { id: row!.id, key, prefix }
}

/** The principal for a live key, touching `last_used_at`; null when the key is unknown or revoked. */
export async function checkApiKey(db: Database, raw: string): Promise<ApiKeyPrincipal | null> {
  if (!raw.startsWith(KEY_PREFIX)) return null
  const [row] = await db
    .select()
    .from(s.apiKey)
    .where(and(eq(s.apiKey.hash, hashApiKey(raw)), isNull(s.apiKey.revokedAt)))
  if (!row) return null
  await db.update(s.apiKey).set({ lastUsedAt: new Date() }).where(eq(s.apiKey.id, row.id))
  return { kind: "api-key", id: row.id, organizationId: row.organizationId, scopes: row.scopes }
}

/** Revokes a key in the organization; true when a live key was revoked, false when none matched. */
export async function revokeApiKey(db: Database, organizationId: string, id: string): Promise<boolean> {
  const rows = await db
    .update(s.apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(s.apiKey.id, id), eq(s.apiKey.organizationId, organizationId), isNull(s.apiKey.revokedAt)))
    .returning({ id: s.apiKey.id })
  return rows.length > 0
}
