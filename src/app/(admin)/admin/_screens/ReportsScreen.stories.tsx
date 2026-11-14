import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { AdminShell } from "@/components/blocks/AdminShell"
import { ReportsScreen } from "./ReportsScreen"

// Reports at 12:56 pm Mountain on Thursday, November 12, 2026: everything Home used to open with, then Revenue.
const data = snapshot as AdminData

const meta = {
  title: "Screens/Reports",
  component: ReportsScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: "2026-11-12T19:56:30Z" },
  render: (args) => (
    <AdminShell current="reports" user={{ initials: "HG", name: "Hannah" }}>
      <ReportsScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof ReportsScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { globals: { viewport: { value: "wide", isRotated: false } } }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
