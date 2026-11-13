import "server-only"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import type { AdminRole } from "./allow"
import type { PersonPrincipal } from "./types"

/** Weakest to strongest. A manager and an admin are peers. */
const RANK: Record<AdminRole, number> = { tech: 0, admin: 1, manager: 1, owner: 2 }

/** Whether `role` is at least `min`. */
export const roleAtLeast = (role: AdminRole | undefined, min: AdminRole) => role !== undefined && RANK[role] >= RANK[min]

/**
 * The per-page guard for /admin: the signed-in admin, or a redirect to the
 * sign-in page. `minRole` defaults to the weakest admin role.
 */
export async function requireAdmin(minRole: AdminRole = "tech"): Promise<PersonPrincipal> {
  const principal = (await auth())?.principal
  if (principal?.type !== "admin" || !roleAtLeast(principal.role, minRole)) redirect("/admin/sign-in")
  return principal
}

/** The per-page guard for /account: a customer or an admin, or a redirect to the sign-in page. */
export async function requireCustomer(): Promise<PersonPrincipal> {
  const principal = (await auth())?.principal
  if (!principal) redirect("/account/sign-in")
  return principal
}
