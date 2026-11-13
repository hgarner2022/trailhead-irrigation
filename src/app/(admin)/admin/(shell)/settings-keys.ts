import "server-only"
import { callApi } from "@/api/core/call"
import { apiKeysList } from "@/api/v1/apikeys/handlers"
import type { ApiKey } from "@/app/(admin)/admin/_screens/settings-model"
import { ctxFromSession } from "@/lib/admin/api-ctx"
import type { PersonPrincipal } from "@/lib/auth/types"
import { toScreenScopes } from "./key-scopes"

/** The live keys for the Settings tab, in its words. Listing keys is a manager's; a tech's list is empty and the tab is read-only anyway. */
export async function loadKeys(principal: PersonPrincipal): Promise<ApiKey[]> {
  if (principal.role === "tech") return []
  const { data } = await callApi(await ctxFromSession(), apiKeysList, {})
  return data.filter((k) => !k.revokedAt).map((k) => ({ id: k.id, name: k.name, prefix: `${k.prefix}…`, scopes: toScreenScopes(k.scopes), lastUsedAt: k.lastUsedAt }))
}
