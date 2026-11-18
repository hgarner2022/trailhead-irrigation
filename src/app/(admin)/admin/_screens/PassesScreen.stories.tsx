import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, SoldJob } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { PassesScreen } from "./PassesScreen"
import { PASS_EVENTS, storyOf } from "./notes-fixture"
import { noCardPass } from "./visits-fixture"

// The panel is a dialog in a portal on the body, outside the story's canvas.
const body = within(document.body)

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
    <AdminShell current="visits" user={{ initials: "HG", name: "Hannah" }}>
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
  play: async () => {
    await expect(await body.findByText("Checkout not finished, expires after an hour.")).toBeInTheDocument()
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

// Andrea's pass as a job with its story: the sale, her choices, the early May timing she asked for and a note.
const passJob: SoldJob = { id: "job-p1", customerId: "c100", kind: "pass", status: "active", source: "checkout", passId: "p1", passNumber: "TH-2027-0001", visitIds: [] }
const withStory = (tech = false): AdminData => ({ ...data, jobs: [{ ...passJob, timeline: storyOf(PASS_EVENTS, [], tech) }] })

/** Notes and history after Change the pass: the story of the pass's job, newest first, with the add box above it. */
export const PanelNotesAndHistory: Story = {
  args: { data: withStory(), defaultSelectedId: "p1" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Notes and history" })).toBeInTheDocument()
    await expect(await body.findByText("Spring turn-on timing changed from mid May to early May")).toBeInTheDocument()
  },
}

/** A tech reads the story without the consent line and still has the add box, though the pass buttons are gone. */
export const PanelNotesAndHistoryTech: Story = {
  args: { data: withStory(true), defaultSelectedId: "p1", readOnly: true },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByLabelText("Add a note")).toBeInTheDocument()
    await expect(body.queryByText(/Consent recorded/)).not.toBeInTheDocument()
  },
}

export const PanelNotesAndHistoryPhone: Story = {
  args: { data: withStory(), defaultSelectedId: "p1" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** A pass the office sold with no card: the card line says to collect at the visit, with Send card link beside it; the footer's card update button is gone. */
export const PanelNoCard: Story = {
  args: { data: { ...data, passes: [noCardPass, ...data.passes] }, defaultSelectedId: noCardPass.id },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByText("No card yet, collect at the visit")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Send card link" })).toBeInTheDocument()
    await expect(body.queryByRole("button", { name: "Send card update link" })).not.toBeInTheDocument()
  },
}
