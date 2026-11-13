import type { ApiScope } from "@/app/(admin)/admin/_screens/settings-model"

// The Settings tab shows five scopes (the IA doc's wording); the API grants three. Writing passes, the
// schedule and messages are all `write`; a key picks any of the three words and gets `write` once.

export type ApiKeyScope = "read" | "write" | "admin"

/** The API scopes behind the words a person ticked. */
export function toApiScopes(scopes: readonly string[]): ApiKeyScope[] {
  const out = new Set<ApiKeyScope>()
  for (const s of scopes) out.add(s === "read" ? "read" : s === "admin" ? "admin" : "write")
  return [...out]
}

/** The words the key list shows for the scopes a key holds. */
export function toScreenScopes(scopes: readonly string[]): ApiScope[] {
  const out: ApiScope[] = []
  if (scopes.includes("read")) out.push("read")
  if (scopes.includes("write")) out.push("write-passes", "write-schedule", "send-messages")
  if (scopes.includes("admin")) out.push("admin")
  return out
}
