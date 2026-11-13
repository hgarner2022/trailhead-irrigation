import "server-only"
import type { Metadata } from "next"
import { ScheduleScreen } from "@/app/(admin)/admin/_screens/ScheduleScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"

export const metadata: Metadata = { title: "Schedule" }
/** `?week=` and `?day=` are typed by hand or by an old link; anything that is not a calendar day is ignored. */
const validDay = (value: string | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined)

// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ week?: string; day?: string; visit?: string }> }) {
  await requireAdmin()
  const { week, day, visit } = await searchParams
  const data = await getAdminData("live")
  // A link to one visit opens on the week it is in.
  const visitDay = data.visits.find((v) => v.id === visit)?.startAt
  const open = { week: validDay(week) ?? (validDay(day) ? undefined : visitDay), day: validDay(day) }
  return <ScheduleScreen data={data} today={new Date().toISOString()} defaultTab={open.day ? "day" : "week"} defaultDay={open.day} defaultWeek={open.week} defaultSelectedId={visit} />
}
