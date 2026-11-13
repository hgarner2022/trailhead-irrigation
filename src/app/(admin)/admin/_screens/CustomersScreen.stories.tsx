import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/data"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomersScreen } from "./CustomersScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story. The snapshot's 375 customers include the
// twelve pass holders; PanelOpen starts with Andrea (c100) open.
const TODAY = "2026-11-12T19:56:30Z"
const data = snapshot as AdminData

const nothingYet: AdminData = { ...data, syncedAt: TODAY, clients: [], visits: [], quotes: [], invoices: [], passes: [], monthTotals: [], attention: [], settings: EMPTY_SETTINGS, settingsChanges: [] }

const meta = {
  title: "Screens/Customers",
  component: CustomersScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="customers" user={{ initials: "HG", name: "Hannah" }}>
      <CustomersScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof CustomersScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Andrea's panel open: her pass, what is next, her visits and the consent on record. */
export const PanelOpen: Story = {
  args: { defaultSelectedId: "c100" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Visits" })).toBeInTheDocument()
  },
}

/** Only the customers with a pass visit waiting for a day. */
export const ToSchedule: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Ahead" }))
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "To schedule" }))
    await userEvent.keyboard("{Escape}")
    await expect((await canvas.findAllByText("To schedule")).length).toBeGreaterThan(1)
  },
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
