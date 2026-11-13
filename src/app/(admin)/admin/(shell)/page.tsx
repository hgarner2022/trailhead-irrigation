import "server-only"
import type { Metadata } from "next"
import { HomeScreen } from "@/app/(admin)/admin/_screens/HomeScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { attentionAction, runSchedule } from "./actions"

export const metadata: Metadata = { title: "Home" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function HomePage() {
  const principal = await requireAdmin()
  const data = await getAdminData("live")
  return <HomeScreen data={data} today={new Date().toISOString()} readOnly={principal.role === "tech"} onSchedule={runSchedule} onAttentionAction={attentionAction} />
}
