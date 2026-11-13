import "server-only"
import type { Metadata } from "next"
import { PassesScreen } from "@/app/(admin)/admin/_screens/PassesScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"

export const metadata: Metadata = { title: "Passes" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function PassesPage({ searchParams }: { searchParams: Promise<{ pass?: string }> }) {
  await requireAdmin()
  const { pass } = await searchParams
  const data = await getAdminData("live")
  return <PassesScreen data={data} today={new Date().toISOString()} defaultSelectedId={pass} />
}
