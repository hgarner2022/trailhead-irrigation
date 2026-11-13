import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
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
  monthTotals: [],
  attention: [],
  settings: EMPTY_SETTINGS,
  settingsChanges: [],
  messages: [],
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

/** The Pending filter: an unpaid attempt, shown as Pending and never as Active. */
export const PendingFilter: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    // The filter chip lives in the toolbar; the column header of the same name sorts.
    const chips = await canvas.findAllByRole("button", { name: "Status" })
    await userEvent.click(chips.find((b) => b.closest('[data-slot="data-grid-toolbar"]'))!)
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Pending" }))
    await userEvent.keyboard("{Escape}")
    await expect((await canvas.findAllByText("Pending")).length).toBeGreaterThan(0)
  },
}

/** A pending pass's panel: the one-line note that it is an unpaid attempt, and no buttons to act on. */
export const PendingPanel: Story = {
  args: { defaultSelectedId: data.passes.find((p) => p.status === "pending")!.id },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Unpaid attempt, expires after an hour.")).toBeInTheDocument()
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

export const PhonePanel: Story = {
  args: { defaultSelectedId: data.passes[0].id },
  globals: { viewport: { value: "phone", isRotated: false } },
}
