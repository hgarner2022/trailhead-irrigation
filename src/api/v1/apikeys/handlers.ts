import "server-only"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { createApiKey, revokeApiKey, SCOPES } from "@/lib/auth/api-key"
import { hasScope } from "@/lib/auth/principal"
import type { Scope } from "@/lib/auth/types"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { byPrincipal, Id, idInput, Iso, okOutput, OK } from "../shared"

const ScopeName = z.enum(SCOPES as [Scope, ...Scope[]])
const KeyOut = z.object({ id: Id, name: z.string(), prefix: z.string().describe("The first characters of the key, to tell keys apart."), scopes: z.array(z.string()), createdBy: z.string().nullable(), lastUsedAt: Iso.nullable(), revokedAt: Iso.nullable(), createdAt: Iso })

export const apiKeysList = defineHandler({
  name: "apiKeys.list", method: "GET", path: "/api-keys", scope: "admin", summary: "List API keys. A key itself is shown once, when it is created.",
  input: z.object({}), output: z.object({ data: z.array(KeyOut) }),
  async run(ctx) {
    const rows = await ctx.db.select().from(s.apiKey).where(eq(s.apiKey.organizationId, ctx.organizationId)).orderBy(desc(s.apiKey.createdAt))
    return { data: rows.map((r) => ({ id: r.id, name: r.name, prefix: r.prefix, scopes: r.scopes, createdBy: r.createdBy, lastUsedAt: r.lastUsedAt?.toISOString() ?? null, revokedAt: r.revokedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() })) }
  },
})

export const apiKeysCreate = defineHandler({
  name: "apiKeys.create", method: "POST", path: "/api-keys", scope: "admin", status: 201, returnsSecret: true,
  summary: "Make an API key and return it once. A caller can grant only scopes it holds; the admin scope only an owner can grant.",
  input: z.object({ name: z.string().min(1).max(80), scopes: z.array(ScopeName).min(1) }),
  output: z.object({ id: Id, key: z.string().describe("Shown once; store it now."), prefix: z.string() }),
  async run(ctx, input) {
    const missing = input.scopes.find((scope) => !hasScope(ctx.principal, scope))
    if (missing) throw new ApiError("forbidden", `You cannot grant the ${missing} scope you do not hold`)
    const role = ctx.principal.kind === "person" ? ctx.principal.role : undefined
    try {
      return await createApiKey(ctx.db, ctx.organizationId, byPrincipal(ctx), { name: input.name, scopes: input.scopes, byRole: role })
    } catch (error) {
      throw new ApiError("forbidden", error instanceof Error ? error.message : "The key could not be made")
    }
  },
})

export const apiKeysRevoke = defineHandler({
  name: "apiKeys.revoke", method: "DELETE", path: "/api-keys/{id}", scope: "admin", summary: "Revoke an API key. It stops working at once.",
  input: idInput, output: okOutput,
  async run(ctx, input) {
    if (!(await revokeApiKey(ctx.db, ctx.organizationId, input.id))) throw notFound("API key")
    return OK
  },
})
