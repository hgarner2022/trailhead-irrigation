import "server-only"
import type { Metadata } from "next"
import { ReportsScreen } from "@/app/(admin)/admin/_screens/ReportsScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"

export const metadata: Metadata = { title: "Reports" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  await requireAdmin()
  const data = await getAdminData("live")
  return <ReportsScreen data={data} today={new Date().toISOString()} />
}
