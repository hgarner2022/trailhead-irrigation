import "server-only"
import type { Metadata } from "next"
import { CustomersScreen } from "@/app/(admin)/admin/_screens/CustomersScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { visitActions } from "../visit-action-set"
import { recordMarketingOptOut } from "../actions"

export const metadata: Metadata = { title: "Customers" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const principal = await requireAdmin()
  const { customer } = await searchParams
  const data = await getAdminData("live")
  // `data.clients[].consent` is the newest consent record of each customer; the panel's opt-out appends the next one.
  return <CustomersScreen data={data} today={new Date().toISOString()} defaultSelectedId={customer} readOnly={principal.role === "tech"} actions={{ recordMarketingOptOut }} visitActions={visitActions} />
}
