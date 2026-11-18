import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { withFixtureContact } from "@/lib/admin/fixtures/contact"
import type { AdminData } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomersScreen } from "./CustomersScreen"
import { JOBS_TODAY, jobsData } from "./jobs-fixture"
import { ANDREA_EVENTS, ANDREA_MESSAGES, storyOf, withTimeline } from "./notes-fixture"

// The panel is a dialog in a portal on the body, outside the story's canvas.
const body = within(document.body)

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story. The snapshot's 375 customers include the
// twelve pass holders and one unpaid attempt (Amy, Pending); PanelOpen starts with
// Andrea (c100) open. The snapshot has no email or phone, so the story adds made-up ones, and its pass holders are
// the app's own customers (`app`), so the panel offers New job for them.
const TODAY = "2026-11-12T19:56:30Z"
const base = snapshot as AdminData
const data = withFixtureContact({ ...base, clients: base.clients.map((c) => (c.hasPass ? { ...c, app: true } : c)) })

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

/** Andrea's panel open: the same normal data as her row, the access note, her jobs (none in the snapshot), the consent history and her messages; New job in the footer. */
export const PanelOpen: Story = {
  args: { defaultSelectedId: "c100" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Jobs" })).toBeInTheDocument()
    await expect(await body.findByRole("heading", { name: "Consent history" })).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "New job" })).toBeInTheDocument()
  },
}

const yard = { mustBeHome: false }
const withProperties = (properties: NonNullable<AdminData["clients"][number]["properties"]>): AdminData => ({ ...data, clients: data.clients.map((c) => (c.id === "c100" ? { ...c, properties } : c)) })

/** Andrea's Property block with everything filled in, and Edit beside the heading. */
export const PanelPropertyFull: Story = {
  args: {
    defaultSelectedId: "c100",
    data: withProperties([{ id: "prop-c100", town: "Erie", address: "12 Briggs St", ...yard, zones: 8, controller: "Rachio 3 in the garage", backflowLocation: "north side", gateCode: "4471", mustBeHome: true, accessNote: "Dog loose, close the gate", contactName: "Dana", contactPhone: "+19705550123", notes: "Clay soil by the fence" }]),
  },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Property" })).toBeInTheDocument()
    await expect(await body.findByText("Gate code 4471")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Edit" })).toBeInTheDocument()
  },
}

/** A property nobody has filled in: "Nothing on file yet", and Edit to start. */
export const PanelPropertyEmpty: Story = {
  args: { defaultSelectedId: "c100", data: withProperties([{ id: "prop-c100", town: "Erie", address: "12 Briggs St", ...yard }]) },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByText("Nothing on file yet")).toBeInTheDocument()
  },
}

const withCard = (card: NonNullable<AdminData["clients"][number]["card"]> | null): AdminData => ({ ...data, clients: data.clients.map((c) => (c.id === "c100" ? { ...c, card: card ?? undefined } : c)) })

/** The customer's Card line with a card on file: brand, last four and expiry, with Send card link beside it. */
export const PanelCard: Story = {
  args: { defaultSelectedId: "c100", data: withCard({ brand: "visa", last4: "4242", expires: "2028-08" }) },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByText("Visa ending 4242, expires 08/28")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Send card link" })).toBeInTheDocument()
  },
}

/** A customer with no card on file: "No card on file", and Send card link to ask for one. Andrea's pass has a card in the snapshot, so the story takes it off the pass too. */
export const PanelNoCard: Story = {
  args: {
    defaultSelectedId: "c100",
    data: { ...withCard(null), passes: data.passes.map((p) => (p.clientId === "c100" ? { ...p, cardLast4: undefined, cardExpires: undefined } : p)) },
  },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByText("No card on file")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Send card link" })).toBeInTheDocument()
  },
}

/** A tech sees the panel with no New job. */
export const PanelReadOnly: Story = {
  args: { defaultSelectedId: "c100", readOnly: true },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Jobs" })).toBeInTheDocument()
    await expect(body.queryByRole("button", { name: "New job" })).not.toBeInTheDocument()
  },
}

// Andrea's story: her pass bought online, her card and choices, a note and the two messages she was sent.
const withStory = (tech = false): AdminData => ({ ...data, clients: withTimeline(data.clients, "c100", storyOf(ANDREA_EVENTS, ANDREA_MESSAGES, tech)) })

/** Notes and history after the Property block: the add box, then everything that happened to Andrea with the texts and emails merged in. */
export const PanelNotesAndHistory: Story = {
  args: { data: withStory(), defaultSelectedId: "c100" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Notes and history" })).toBeInTheDocument()
    await expect(await body.findByText("Season Pass TH-2027-0001 bought online")).toBeInTheDocument()
    await expect(await body.findByText("Text sent: date set")).toBeInTheDocument()
  },
}

/** A tech reads the story without the consent, card and contact lines and still has the add box. */
export const PanelNotesAndHistoryTech: Story = {
  args: { data: withStory(true), defaultSelectedId: "c100", readOnly: true },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByLabelText("Add a note")).toBeInTheDocument()
    await expect(body.queryByText(/Card saved/)).not.toBeInTheDocument()
  },
}

export const PanelNotesAndHistoryPhone: Story = {
  args: { data: withStory(), defaultSelectedId: "c100" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** Only the customers whose next job still needs a day. */
export const ToSchedule: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    // The filter chip lives in the toolbar; the column header of the same name sorts.
    const chips = await canvas.findAllByRole("button", { name: "Scheduled" })
    await userEvent.click(chips.find((b) => b.closest('[data-slot="data-grid-toolbar"]'))!)
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "No, unscheduled" }))
    await userEvent.keyboard("{Escape}")
    await expect((await canvas.findAllByText("Unscheduled")).length).toBeGreaterThan(1)
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

/** Dana holds the pass the office sold her: the Season Pass view sits under her facts, then her jobs, each opening to its visits. */
export const PanelSeasonPass: Story = {
  args: { data: jobsData, today: JOBS_TODAY, defaultSelectedId: "c-dana" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Season Pass" })).toBeInTheDocument()
    await expect(await body.findByRole("heading", { name: "Jobs" })).toBeInTheDocument()
    await expect(await body.findByRole("link", { name: "Season Pass TH-2027-0014 · 2027 · Active" })).toHaveAttribute("href", "/admin/jobs?job=job_p-office")
  },
}
