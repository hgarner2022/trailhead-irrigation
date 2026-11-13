// Test helper (no server-only: tests import it): an in-memory organization with
// one owner, one admin and one customer, for the auth tests.
import { seed } from "@/db/seed"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"

const data = snapshot as AdminData
export const ORG = data.organizationId
export const OWNER = "owner@example.com"
export const ADMIN = "admin@example.com"
export const CUSTOMER = "andrea@example.com"

export async function seedAuth(db: TestDb): Promise<{ customerId: string }> {
  await seed(db, data, { organizationId: ORG, admins: [OWNER, ADMIN] })
  const [row] = await db
    .insert(s.customer)
    .values({ organizationId: ORG, firstName: "Andrea", email: CUSTOMER })
    .returning({ id: s.customer.id })
  return { customerId: row!.id }
}
