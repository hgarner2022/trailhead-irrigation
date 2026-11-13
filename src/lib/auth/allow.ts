// Who may sign in: an email on the admin allow-list, or the email of a
// customer on file. Everyone else is refused before any email is sent.
// Pure; the database lookups live in people.ts.

export type AdminRole = "owner" | "admin" | "manager" | "tech"

export interface AdminEntry {
  email: string
  role: AdminRole
}
export interface CustomerEntry {
  email: string
  customerId: string
}

export type Classification =
  | { kind: "admin"; role: AdminRole }
  | { kind: "customer"; customerId: string }

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** An admin wins over a customer when the address is both; null for a stranger. */
export function classify(
  email: string,
  admins: readonly AdminEntry[],
  customers: readonly CustomerEntry[],
): Classification | null {
  const admin = admins.find((a) => same(a.email, email))
  if (admin) return { kind: "admin", role: admin.role }
  const customer = customers.find((c) => same(c.email, email))
  if (customer) return { kind: "customer", customerId: customer.customerId }
  return null
}
