import "server-only"
import type { Metadata } from "next"
import { PassesScreen } from "@/app/(admin)/admin/_screens/PassesScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { addInspection, cancelPass, changePreference, resendConfirmation, sendCardUpdateLink, skipVisit } from "../actions"

export const metadata: Metadata = { title: "Passes" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

const actions = { resendConfirmation, sendCardUpdateLink, cancel: cancelPass, addInspection, changePreference, skip: skipVisit }

export default async function PassesPage({ searchParams }: { searchParams: Promise<{ pass?: string }> }) {
  const principal = await requireAdmin()
  const { pass } = await searchParams
  const data = await getAdminData("live")
  return <PassesScreen data={data} today={new Date().toISOString()} defaultSelectedId={pass} readOnly={principal.role === "tech"} actions={actions} />
}
