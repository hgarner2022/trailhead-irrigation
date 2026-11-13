import "server-only"
import type { Metadata } from "next"
import { RevenueScreen } from "@/app/(admin)/admin/_screens/RevenueScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"

export const metadata: Metadata = { title: "Revenue" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function RevenuePage() {
  await requireAdmin()
  const data = await getAdminData("live")
  return <RevenueScreen data={data} today={new Date().toISOString()} />
}
