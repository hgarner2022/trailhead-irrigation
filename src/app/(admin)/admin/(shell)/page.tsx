import "server-only"
import type { Metadata } from "next"
import { HomeScreen } from "@/app/(admin)/admin/_screens/HomeScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { visitActions } from "./visit-action-set"
import { jobActions } from "./job-action-set"
import { attentionAction, dismissAttention, recordMarketingOptOut } from "./actions"

export const metadata: Metadata = { title: "Home" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function HomePage({ searchParams }: { searchParams: Promise<{ customer?: string; job?: string; visit?: string }> }) {
  const principal = await requireAdmin()
  const { customer, job, visit } = await searchParams
  const data = await getAdminData("live")
  return <HomeScreen data={data} today={new Date().toISOString()} readOnly={principal.role === "tech"} onAttentionAction={attentionAction} onDismiss={dismissAttention} visitActions={visitActions} jobActions={jobActions} customerActions={{ recordMarketingOptOut }} defaultCustomerId={customer} defaultJobId={job} defaultVisitId={visit} />
}
