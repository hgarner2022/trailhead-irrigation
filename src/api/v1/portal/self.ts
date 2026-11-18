import "server-only"
import type { Ctx } from "../../core/context"

/** The signed-in customer's id, or null for anyone else (a key, an admin). */
export function selfCustomerId(ctx: Ctx): string | null {
  const p = ctx.principal
  return p.kind === "person" && p.type === "customer" && p.customerId ? p.customerId : null
}
