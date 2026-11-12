import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { AdminShell } from "@/components/blocks/AdminShell"
import { PassesScreen } from "./PassesScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story, so the season line's marker sits before the
// 2027 season on every pass. PanelOpen starts with Andrea (passes[0]) open.
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
  blowoutWeeks: [],
  monthTotals: [],
  attention: [],
}

const meta = {
  title: "Screens/Passes",
  component: PassesScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="passes" user={{ initials: "HG", name: "Hannah" }}>
      <PassesScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof PassesScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const PanelOpen: Story = {
  args: { defaultSelectedId: data.passes[0].id },
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

export const PhonePanel: Story = {
  args: { defaultSelectedId: data.passes[0].id },
  globals: { viewport: { value: "phone", isRotated: false } },
}
