import "server-only"
import type { Metadata } from "next"
import { VisitsScreen } from "@/app/(admin)/admin/_screens/VisitsScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { visitActions } from "../visit-action-set"

export const metadata: Metadata = { title: "Visits" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ visit?: string }> }) {
  const principal = await requireAdmin()
  const { visit } = await searchParams
  const data = await getAdminData("live")
  return <VisitsScreen data={data} today={new Date().toISOString()} defaultVisitId={visit} readOnly={principal.role === "tech"} actions={visitActions} />
}
