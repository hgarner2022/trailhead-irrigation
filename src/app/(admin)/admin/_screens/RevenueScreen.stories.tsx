import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { AdminShell } from "@/components/blocks/AdminShell"
import { RevenueScreen } from "./RevenueScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story. The snapshot has no 2025 invoices and no
// booked, uncharged visits, so the chart shows 2026 alone and the upcoming
// charges card shows its empty line; both are what the real data says.
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
  title: "Screens/Revenue",
  component: RevenueScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="revenue" user={{ initials: "HG", name: "Hannah" }}>
      <RevenueScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof RevenueScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
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
