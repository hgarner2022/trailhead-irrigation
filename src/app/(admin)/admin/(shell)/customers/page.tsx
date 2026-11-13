import "server-only"
import type { Metadata } from "next"
import { CustomersScreen } from "@/app/(admin)/admin/_screens/CustomersScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"

export const metadata: Metadata = { title: "Customers" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  await requireAdmin()
  const { customer } = await searchParams
  const data = await getAdminData("live")
  return <CustomersScreen data={data} today={new Date().toISOString()} defaultSelectedId={customer} />
}
