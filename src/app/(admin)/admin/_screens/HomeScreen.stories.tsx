import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Attention, Visit } from "@/lib/admin/types"
import { expect } from "storybook/test"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { HomeScreen } from "./HomeScreen"

const STORE = "trailhead.home.today-view"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026: four
// minutes after the snapshot's sync, so the header reads "Updated 4 minutes
// ago". In season, that day has four scheduled blowouts with no window yet (all Ahead today). `busy` is the same day with eight
// visits in all three groups: two past their window, three ahead and three done (paid by Venmo, owed, and a bill sent).
// The quiet November fixture has nothing today or this month: its next visits are three in April, so every group reads "Nothing here" and the screen links to the next day.
const TODAY = "2026-11-12T19:56:30Z"
const snap = snapshot as AdminData
const groupedTexts: Attention = {
  kind: "jobs-failed",
  key: "group:message:twilio-auth",
  message: "6 texts could not be sent: Twilio rejected the account credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Vercel.",
  since: "2026-11-12T18:30:00Z",
  queueKind: "message",
  queueIds: ["q1", "q2", "q3", "q4", "q5", "q6"],
  members: ["q1", "q2", "q3", "q4", "q5", "q6"].map((id) => ({ kind: "jobs-failed" as const, key: `message@${id}`, message: "A message task is retrying", since: "2026-11-12T18:30:00Z" })),
}
const data: AdminData = { ...snap, attention: [groupedTexts, ...snap.attention.filter((a) => a.kind !== "jobs-failed")] }

/** November with nothing on: no visits today or for months, the next three in Erie on April 27, a done visit that is owed and no failed charge. */
const quiet: AdminData = {
  ...snap,
  visits: [
    ...snap.visits.filter((v) => v.status === "scheduled").slice(0, 3).map((v, i) => ({ ...v, id: `april-${i}`, town: "Erie" as const, personId: i === 2 ? "person_truck-2" : "person_truck-1", personName: i === 2 ? "Tech Two" : "Ryan Garner", startAt: `2027-04-27T${15 + i}:00:00Z`, scheduledOn: "2027-04-27", startTime: undefined, stopOrder: undefined })),
    ...snap.visits.filter((v) => v.status === "completed" && v.startAt?.startsWith("2026-11-10")).slice(0, 1),
  ],
  attention: snap.attention.filter((a) => a.kind === "pass-cancelled"),
}

const stop = (over: Partial<Visit>): Visit => ({
  id: "v", clientId: "c", clientName: "Percy Dunn", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "j", price: 145,
  scheduledOn: "2026-11-12", startAt: "2026-11-12T15:00:00Z", startTime: "08:00", personId: "person_truck-1", personName: "Ryan Garner", payments: [], ...over,
})
const doneToday = { status: "completed" as const, completedOn: "2026-11-12", personId: "person_truck-2", personName: "Tech Two" }
const busy: AdminData = {
  ...data,
  visits: [
    stop({ id: "b1", clientName: "Percy Dunn", stopOrder: 1 }),
    stop({ id: "b2", clientName: "Alicia Moss", town: "Firestone", kind: "blowout", price: 95, startTime: "10:00", startAt: "2026-11-12T17:00:00Z", stopOrder: 2 }),
    stop({ id: "b3", clientName: "Ethan Cole", kind: "blowout", price: 95, startTime: "13:00", startAt: "2026-11-12T20:00:00Z", stopOrder: 3 }),
    stop({ id: "b4", clientName: "Matthew Ames", town: "Longmont", startTime: "15:00", startAt: "2026-11-12T22:00:00Z", stopOrder: 4 }),
    stop({ id: "b5", clientName: "Rosa Vega", town: "Lafayette", ...doneToday, startTime: "08:00", startAt: "2026-11-12T15:00:00Z", payments: [{ id: "pay-b5", visitId: "b5", amount: 145, method: "venmo", status: "succeeded" }] }),
    stop({ id: "b6", clientName: "Sam Ortiz", town: "Louisville", kind: "blowout", price: 95, ...doneToday, startTime: "10:00", startAt: "2026-11-12T17:00:00Z" }),
    stop({ id: "b7", clientName: "Tina Lowe", town: "Broomfield", ...doneToday, startTime: "11:00", startAt: "2026-11-12T18:00:00Z", billSent: true }),
    stop({ id: "b8", clientName: "Uri Fox", town: "Louisville", personId: "person_truck-2", personName: "Tech Two", startTime: "14:00", startAt: "2026-11-12T21:00:00Z" }),
  ],
  attention: snap.attention.filter((a) => a.kind === "pass-cancelled"),
}

const nothingYet: AdminData = {
  organizationId: snap.organizationId,
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

const meta = {
  title: "Screens/Home",
  component: HomeScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  // The By visit / By person choice is kept per browser; every story starts on By visit.
  beforeEach: () => {
    try {
      window.localStorage.removeItem(STORE)
    } catch {
      // storage blocked: nothing to clear
    }
  },
  render: (args) => (
    <AdminShell current="home" user={{ initials: "HG", name: "Hannah" }}>
      <HomeScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof HomeScreen>
export default meta
type Story = StoryObj<typeof meta>

/** In season: the Today money strip, the four blowouts as Ahead today (no window yet), the map beside them and a grouped Needs action row. */
export const InSeason: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** A busy Thursday at 12:56 pm: two visits past their window, three ahead and three done, with Paid, Venmo, $95 owed and Bill sent at the right of the done ones; By visit. */
export const Busy: Story = {
  args: { data: busy },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The same day By person: each person's visits in route order under their name, the stop number the map pin carries. */
export const ByPerson: Story = {
  args: { data: busy },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("tab", { name: "By person" }))
    await expect(await canvas.findByRole("heading", { name: /Ryan Garner/ })).toBeInTheDocument()
  },
}

/** A tech opens the same day and reads it: the rows open the visit panel without its buttons, and Needs action has none. */
export const TechReadOnly: Story = {
  args: { data: busy, readOnly: true },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** On a phone the strip is two rows of two, the toggle runs full width, the groups come first and the map folds under them. */
export const BusyPhone: Story = {
  args: { data: busy },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const ByPersonPhone: Story = {
  args: { data: busy },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("tab", { name: "By person" }))
    await expect(await canvas.findByRole("heading", { name: /Tech Two/ })).toBeInTheDocument()
  },
}

/** November, nothing today: every group says Nothing here and one line links to the next day that has visits. */
export const QuietNovember: Story = {
  args: { data: quiet },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const QuietNovemberPhone: Story = {
  args: { data: quiet },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** A job that is done and owed: one row for the job, "Done, owed", with the number in the message and a Paid by button that opens its visit. */
const owedRow: Attention = { kind: "owed", key: "job-owed", jobId: "job-owed", visitId: "owed-visit", message: "Andrea's repair is done, $145 owed", since: "2026-11-10T22:00:00Z" }
export const OwedRow: Story = {
  args: { data: { ...data, attention: [owedRow, ...data.attention] } },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** A bill past its due day: the money line gains "1 bill overdue" and Needs action has the bill's one row, "Bill overdue", with Remind. The job, which reads Bill sent, has no owed row. */
const overdueBill = { id: "inv-overdue", jobId: "job-billed", number: "INV-2026-0007", amount: 145, tax: 0, total: 145, sentOn: "2026-10-22", dueOn: "2026-11-05", status: "overdue" as const, visitIds: [] }
const overdueRow: Attention = { kind: "overdue", key: "invoice-inv-overdue@2026-11-05", invoiceId: "inv-overdue", jobId: "job-billed", customerId: "c-andrea", message: "Andrea Reyes's bill of $145 was due Nov 5", since: "2026-11-05T19:00:00Z" }
export const OverdueBill: Story = {
  args: {
    data: {
      ...data,
      jobs: [{ id: "job-billed", customerId: "c-andrea", kind: "repair", status: "open", source: "office", visitIds: [], invoice: overdueBill }],
      attention: [overdueRow, ...data.attention],
    },
  },
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
