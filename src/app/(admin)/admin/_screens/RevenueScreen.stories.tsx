import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, MonthTotal, Pass } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { RevenueScreen } from "./RevenueScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story. The snapshot has no 2025 invoices, no
// booked, uncharged visits and no earlier-season passes, so Default shows
// 2026 alone, the empty upcoming line and no Renewals card; the other
// stories invent each of those on a copy of the snapshot.
const TODAY = "2026-11-12T19:56:30Z"
const data = snapshot as AdminData

const nothingYet: AdminData = {
  organizationId: data.organizationId,
  syncedAt: TODAY,
  clients: [],
  visits: [],
  quotes: [],
  invoices: [],
  passes: [],
  monthTotals: [],
  attention: [],
  settings: EMPTY_SETTINGS,
  settingsChanges: [],
  messages: [],
}

// Each 2025 month is about 80 percent of 2026, rounded to look like real totals.
const y2025: MonthTotal[] = [2680, 4510, 9960, 9120, 5840, 10590, 14690, 2600].map((revenue, i) => ({
  year: 2025,
  month: 4 + i,
  revenue,
  visits: Math.round(data.monthTotals[i].visits * 0.8),
}))
const withLastYear: AdminData = { ...data, monthTotals: [...y2025, ...data.monthTotals] }

// Three inspections booked for July and not yet charged, the last one at 7 pm Denver on July 8.
const book = (pass: Pass, at: string): Pass => ({ ...pass, visits: pass.visits.map((v) => (v.kind === "inspection" ? { ...v, scheduledAt: at } : v)) })
const withUpcoming: AdminData = {
  ...data,
  passes: data.passes.map((p) => (p.id === "p1" ? book(p, "2027-07-06T15:00:00Z") : p.id === "p2" ? book(p, "2027-07-09T01:00:00Z") : p.id === "p3" ? book(p, "2027-07-07T16:00:00Z") : p)),
}

// Two 2026 passes: Andrea (c100) renewed, since she holds p1 for 2027; Morgan has not been asked.
const old = (pass: Pass, over: Partial<Pass>): Pass => ({ ...pass, season: 2026, number: pass.number.replace("2027", "2026"), ...over })
const withRenewals: AdminData = {
  ...data,
  passes: [
    ...data.passes,
    old(data.passes[0], { id: "p2026-1" }),
    old(data.passes[4], { id: "p2026-2", clientId: "c300", firstName: "Morgan", town: "Louisville" }),
  ],
}

const meta = {
  title: "Screens/Revenue",
  component: RevenueScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="reports" user={{ initials: "HG", name: "Hannah" }}>
      <RevenueScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof RevenueScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** 2025 is invented for the story; Jobber has no 2025 invoices. */
export const WithLastYear: Story = {
  args: { data: withLastYear },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const WithUpcomingCharges: Story = {
  args: { data: withUpcoming },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const WithRenewals: Story = {
  args: { data: withRenewals },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Outstanding: one bill past due at its total ($160), plus a done job that owes $145 and has no bill; each job counts once. */
const withOutstanding: AdminData = {
  ...data,
  visits: [
    ...data.visits,
    { id: "v-billed", clientId: "c100", clientName: "Andrea Reyes", town: "Erie", kind: "repair", status: "completed", isPass: false, jobberUrl: "", jobId: "job-billed", completedOn: "2026-10-22" },
    { id: "v-owed", clientId: "c300", clientName: "Morgan Hale", town: "Louisville", kind: "repair", status: "completed", isPass: false, jobberUrl: "", jobId: "job-owed", completedOn: "2026-11-10" },
  ],
  jobs: [
    { id: "job-billed", customerId: "c100", kind: "repair", status: "open", source: "office", visitIds: ["v-billed"], money: { paid: 0, total: 145, owed: 145, words: "Bill sent", billSent: true }, invoice: { id: "inv-1", jobId: "job-billed", number: "INV-2026-0007", amount: 160, tax: 0, total: 160, sentOn: "2026-10-22", dueOn: "2026-11-05", status: "overdue", visitIds: ["v-billed"] } },
    { id: "job-owed", customerId: "c300", kind: "repair", status: "open", source: "office", visitIds: ["v-owed"], money: { paid: 0, total: 145, owed: 145, words: "$145 owed" } },
  ],
}
export const Outstanding: Story = {
  args: { data: withOutstanding },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const NoDataYet: Story = {
  args: { data: nothingYet },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
