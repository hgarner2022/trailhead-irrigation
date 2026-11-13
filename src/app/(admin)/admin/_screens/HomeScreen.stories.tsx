import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { HomeScreen } from "./HomeScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026: four
// minutes after the snapshot's sync, so the header reads "Updated 4 minutes
// ago", and a day with four scheduled blowouts followed by another four.
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

const BEFORE_FALL = "2027-09-17T18:00:00Z"

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

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Two weeks before the fixture's blowout window opens (October 1, 2027, four lead weeks): the season prompt shows above the tiles. */
export const BeforeFall: Story = {
  args: { today: BEFORE_FALL, data: { ...data, syncedAt: "2027-09-17T17:56:00Z" } },
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
