"use server"

import "server-only"
import { searchRecords } from "@/app/(admin)/admin/_screens/record-search"
import { getAdminData } from "@/lib/admin/data"
import type { SearchHit } from "@/lib/admin/search-hit"
import { requireAdmin } from "@/lib/auth/guard"

/** Cmd+K: customers, jobs and days of work found by name, street, phone or pass number, from the same data the screens read, for the signed-in admin (a tech too). */
export async function searchAdmin(query: string): Promise<SearchHit[]> {
  await requireAdmin()
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 100) return []
  return searchRecords(await getAdminData("live"), new Date().toISOString(), query)
}
