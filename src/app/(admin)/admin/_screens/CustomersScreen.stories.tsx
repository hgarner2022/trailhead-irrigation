import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { withFixtureContact } from "@/lib/admin/fixtures/contact"
import type { AdminData } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomersScreen } from "./CustomersScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story. The snapshot's 375 customers include the
// twelve pass holders and one unpaid attempt (Amy, Pending); PanelOpen starts with
// Andrea (c100) open. The snapshot has no email or phone, so the story adds made-up ones.
const TODAY = "2026-11-12T19:56:30Z"
const data = withFixtureContact(snapshot as AdminData)

const nothingYet: AdminData = { ...data, syncedAt: TODAY, clients: [], visits: [], quotes: [], invoices: [], passes: [], monthTotals: [], attention: [], settings: EMPTY_SETTINGS, settingsChanges: [], messages: [] }

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

/** Andrea's panel open: the same normal data as her row, the access note, her jobs, the consent history and her messages. */
export const PanelOpen: Story = {
  args: { defaultSelectedId: "c100" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Jobs" })).toBeInTheDocument()
    await expect(await canvas.findByRole("heading", { name: "Consent history" })).toBeInTheDocument()
  },
}

/** Only the customers whose next job still needs a day. */
export const ToSchedule: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    // The filter chip lives in the toolbar; the column header of the same name sorts.
    const chips = await canvas.findAllByRole("button", { name: "Scheduled" })
    await userEvent.click(chips.find((b) => b.closest('[data-slot="data-grid-toolbar"]'))!)
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "No, needs a day" }))
    await userEvent.keyboard("{Escape}")
    await expect((await canvas.findAllByText("Needs a day")).length).toBeGreaterThan(1)
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
