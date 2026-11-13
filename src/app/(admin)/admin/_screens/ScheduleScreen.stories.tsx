import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/data"
import { AdminShell } from "@/components/blocks/AdminShell"
import { ScheduleScreen } from "./ScheduleScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story, so the week is Monday the 9th: Truck 1
// carries every visit, eight of them proposed on Thursday and Friday, and
// two earlier in the week were moved in Jobber. The map draws from
// OpenFreeMap tiles; without WebGL it shows its fallback.
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

const meta = {
  title: "Screens/Schedule",
  component: ScheduleScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="schedule" user={{ initials: "HG", name: "Hannah" }}>
      <ScheduleScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof ScheduleScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Week: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The same week after Ryan pressed Approve week: no hatched blocks, no button. */
export const WeekApproved: Story = {
  args: { data: { ...data, visits: data.visits.map((v): Visit => ({ ...v, proposed: undefined })) } },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The Day tab: Thursday's stops in order beside the map. */
export const Day: Story = {
  args: { defaultTab: "day" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const NoDataYet: Story = {
  args: { data: nothingYet },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
}

/** On a phone the Week tab is one day at a time with the trucks stacked. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
