import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Attention } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { HomeScreen } from "./HomeScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026: four
// minutes after the snapshot's sync, so the header reads "Updated 4 minutes
// ago". In season, that day has four scheduled blowouts (the first card is "Today"). The quiet November
// fixture has nothing today or this month: its next visits are three in April, so the first card is "Next up".
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

/** November with nothing on: no visits today or for months, the next three in Erie on April 27, a done visit that is unpaid and no failed charge. */
const quiet: AdminData = {
  ...snap,
  visits: [
    ...snap.visits.filter((v) => v.status === "scheduled").slice(0, 3).map((v, i) => ({ ...v, id: `april-${i}`, town: "Erie" as const, personId: i === 2 ? "person_truck-2" : "person_truck-1", personName: i === 2 ? "Tech Two" : "Ryan Garner", startAt: `2027-04-27T${15 + i}:00:00Z`, scheduledOn: "2027-04-27", startTime: undefined, stopOrder: undefined })),
    ...snap.visits.filter((v) => v.status === "completed" && v.startAt?.startsWith("2026-11-10")).slice(0, 1),
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
  render: (args) => (
    <AdminShell current="home" user={{ initials: "HG", name: "Hannah" }}>
      <HomeScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof HomeScreen>
export default meta
type Story = StoryObj<typeof meta>

/** In season: Today opens on the four blowouts, the money line, the map and a grouped Needs action row. */
export const InSeason: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** November, nothing today: Next up says what is next and when, once, with no empty person lines. */
export const QuietNovember: Story = {
  args: { data: quiet },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const QuietNovemberPhone: Story = {
  args: { data: quiet },
  globals: { viewport: { value: "phone", isRotated: false } },
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
