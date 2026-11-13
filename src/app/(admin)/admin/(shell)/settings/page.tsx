import "server-only"
import type { Metadata } from "next"
import { SettingsScreen } from "@/app/(admin)/admin/_screens/SettingsScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"

export const metadata: Metadata = { title: "Settings" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  await requireAdmin()
  const data = await getAdminData("live")
  return <SettingsScreen data={data} today={new Date().toISOString()} />
}
