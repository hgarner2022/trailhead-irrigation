import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, SettingsChange } from "@/lib/admin/types"
import { AdminShell } from "@/components/blocks/AdminShell"
import { SettingsScreen } from "./SettingsScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home and Schedule stories. The snapshot already carries
// four logged changes from November 5 to 11; a change made in a story is
// stamped from `today`. The fixture's settings are the real starting values.
const TODAY = "2026-11-12T19:56:30Z"
const data = snapshot as AdminData

const more: SettingsChange[] = [
  { id: "sc5", at: "2026-11-12T15:10:00Z", who: "Ryan", field: "Truck 1 repairs per day", from: "3", to: "4" },
  { id: "sc6", at: "2026-11-12T16:42:00Z", who: "Hannah", field: "Fall order", from: "Erie, Firestone, Longmont, Broomfield, Louisville, Lafayette", to: "Firestone, Erie, Longmont, Broomfield, Louisville, Lafayette" },
  { id: "sc7", at: "2026-11-12T18:03:00Z", who: "Hannah", field: "Renewal (email)", from: "On", to: "Off" },
]

const meta = {
  title: "Screens/Settings",
  component: SettingsScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="settings" user={{ initials: "HG", name: "Hannah" }}>
      <SettingsScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof SettingsScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Trucks: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Areas: Story = {
  args: { defaultTab: "areas" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const CapacityAndWindows: Story = {
  args: { defaultTab: "capacity" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Messages: Story = {
  args: { defaultTab: "messages" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const ApiKeys: Story = {
  args: { defaultTab: "keys" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Seven changes already logged, newest first under the tabs. */
export const WithChanges: Story = {
  args: { data: { ...data, settingsChanges: [...data.settingsChanges, ...more] } },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** On a phone the tab list scrolls sideways and the tables scroll inside their cards. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
