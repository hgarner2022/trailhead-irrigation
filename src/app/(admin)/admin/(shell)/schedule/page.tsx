import "server-only"
import type { Metadata } from "next"
import { visitActions } from "../visit-action-set"
import { jobActions } from "../job-action-set"
import { ScheduleScreen, type ScheduleView } from "@/app/(admin)/admin/_screens/ScheduleScreen"
import { MONEY_OPTIONS, WORK_OPTIONS, filterFrom } from "@/app/(admin)/admin/_screens/visits-model"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { moveVisit, recordMarketingOptOut, runSchedule } from "../actions"

export const metadata: Metadata = { title: "Schedule" }
/** `?week=` and `?day=` are typed by hand or by an old link; anything that is not a calendar day is ignored. */
const validDay = (value: string | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined)
const VIEWS: readonly string[] = ["week", "day", "list"]

// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

type SearchParams = Partial<Record<"view" | "week" | "day" | "visit" | "job" | "customer" | "forJob" | "money" | "work", string | string[] | undefined>>
/** A repeated parameter (`?visit=a&visit=b`) is its first value. */
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

// Week, Day and List (the old Visits page): `?view=list` is the List, `?forJob=` keeps one job's visits there and `?money=` and `?work=` are its filters.
// A record in the address (`?visit=`, `?job=`, `?customer=`) opens in the panel over whichever view this is.
export default async function SchedulePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const principal = await requireAdmin()
  const raw = await searchParams
  const [view, week, day, visit, job, customer, forJob, money, work] = (["view", "week", "day", "visit", "job", "customer", "forJob", "money", "work"] as const).map((k) => one(raw[k]))
  const data = await getAdminData("live")
  // A link to one visit opens on the week it is in.
  const visitDay = data.visits.find((v) => v.id === visit)?.startAt
  const open = { week: validDay(week) ?? (validDay(day) ? undefined : visitDay), day: validDay(day) }
  const tab: ScheduleView = view && VIEWS.includes(view) ? (view as ScheduleView) : open.day ? "day" : "week"
  const defaultFilters = [...filterFrom("money", money, MONEY_OPTIONS), ...filterFrom("work", work, WORK_OPTIONS)]
  const tech = principal.role === "tech"
  return (
    <ScheduleScreen
      data={data}
      today={new Date().toISOString()}
      defaultTab={tab}
      defaultDay={open.day}
      defaultWeek={open.week}
      defaultSelectedId={visit}
      defaultVisitId={visit}
      defaultJobId={job}
      defaultCustomerId={customer}
      forJob={forJob}
      defaultFilters={defaultFilters}
      readOnly={tech}
      canCollect={tech}
      onSchedule={runSchedule}
      onMove={moveVisit}
      visitActions={visitActions}
      jobActions={jobActions}
      customerActions={{ recordMarketingOptOut }}
    />
  )
}
