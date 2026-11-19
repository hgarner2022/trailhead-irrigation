import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobsScreen } from "./JobsScreen"
import { BILLS_OUT } from "./jobs-model"
import { PASS_EVENTS, JOE_EVENTS, JOE_MESSAGES, storyOf } from "./notes-fixture"
import type { AdminData } from "@/lib/admin/types"
import { JOBS_TODAY, billedJobId, cancelledLineJobId, jobsData, overdueJobId, ownedJobId, paidJobId, passJobId, quoteJobId } from "./jobs-fixture"

// The panel is a dialog in a portal on the body, outside the story's canvas.
const body = within(document.body)

// Jobs at 12:56 pm Mountain on Thursday, November 12, 2026: a Season Pass the office sold with no card, the snapshot's passes, and
// the one-offs in every state: scheduled, needing a quote, done and unpaid, done and paid, an invoice out, an invoice past its due day, a
// cancelled job, and an installation Ryan priced after walking the yard (one line canceled). The invoices that are out come first.
// The header carries "N invoices out" and New job; a tech sees no New job. The panel stories open one job over the grid (a drawer on
// a laptop, a sheet on a phone).

const meta = {
  title: "Screens/Jobs",
  component: JobsScreen,
  parameters: { layout: "fullscreen" },
  args: { data: jobsData, today: JOBS_TODAY },
  render: (args) => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobsScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof JobsScreen>
export default meta
type Story = StoryObj<typeof meta>

const wide = { viewport: { value: "wide", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

/** The grid: an invoice past its due day on top, then the invoice that is out, then the rest by the day they were sold. */
export const Default: Story = {
  globals: wide,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "New job" })).toBeInTheDocument()
    await expect(await canvas.findByRole("button", { name: "2 invoices out" })).toBeInTheDocument()
  },
}
export const Phone: Story = { globals: phone }

/** No jobs yet. */
export const Empty: Story = {
  args: { data: { ...jobsData, jobs: [], visits: [], passes: [] } },
  globals: wide,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No jobs yet")).toBeInTheDocument()
  },
}

/** "N invoices out" applied: only the jobs with a invoice sent or past due, the oldest due day first. */
export const BillsOut: Story = { args: { defaultFilters: [{ column: "money", values: [...BILLS_OUT] }] }, globals: wide }

/** A tech reads the list and sees no New job. */
export const ReadOnly: Story = {
  args: { readOnly: true },
  globals: wide,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "New job" })).not.toBeInTheDocument()
  },
}

/** Done and owed: one primary, Collect $145, in the footer; it opens How is this paid?, where the invoice is a choice. */
export const PanelOwed: Story = {
  args: { defaultJobId: ownedJobId },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: /^Collect \$/ }))
    await expect(await body.findByRole("heading", { name: "How is this paid?" })).toBeInTheDocument()
    await expect(await body.findByLabelText("Send an invoice")).toBeInTheDocument()
  },
}
export const PanelOwedPhone: Story = { args: { defaultJobId: ownedJobId }, globals: phone }

/** An invoice is out: "Invoice sent Nov 10, due Nov 24", Remind and the pay link, and the job's money in one line. */
export const PanelBillSent: Story = {
  args: { defaultJobId: billedJobId },
  globals: wide,
  play: async () => {
    await expect(await body.findByText("Sent Nov 10, due Nov 24")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Remind" })).toBeInTheDocument()
    await expect(await body.findByRole("link", { name: "Pay link" })).toBeInTheDocument()
  },
}

/** The due day has gone: "$145 · Past due since Nov 3" and Remind. */
export const PanelOverdue: Story = { args: { defaultJobId: overdueJobId }, globals: wide }

/** Paid by check: the payment is listed with its check number and the job says Paid. */
export const PanelPaid: Story = {
  args: { defaultJobId: paidJobId },
  globals: wide,
  play: async () => {
    await expect(await body.findByText("Check 1038")).toBeInTheDocument()
  },
}

/** Ryan priced it after walking the yard: a part payment, a canceled line struck through, and Add a line with Edit on each live one. */
export const PanelCancelledLine: Story = {
  args: { defaultJobId: cancelledLineJobId },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("button", { name: "Add a line" })).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Edit Controller" })).toBeInTheDocument()
  },
}
export const PanelCancelledLinePhone: Story = { args: { defaultJobId: cancelledLineJobId }, globals: phone }

/** Not priced yet: the line says Quote later and the stage says Needs a quote. */
export const PanelNeedsAQuote: Story = { args: { defaultJobId: quoteJobId }, globals: wide }

/** A Season Pass shows its season; the footer is Open visit, Change the pass, More (Send card link, Resend confirmation) and Cancel pass. */
export const PanelPass: Story = {
  args: { defaultJobId: passJobId },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("button", { name: "Cancel pass" })).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Change the pass" })).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "More" })).toBeInTheDocument()
  },
}
export const PanelPassPhone: Story = { args: { defaultJobId: passJobId }, globals: phone }

/** A tech reads the whole job and sees no buttons. */
export const PanelReadOnly: Story = {
  args: { defaultJobId: ownedJobId, readOnly: true },
  globals: wide,
  play: async () => {
    await expect(body.queryByRole("button", { name: /^Collect/ })).not.toBeInTheDocument()
    await expect(body.queryByRole("button", { name: "Add a line" })).not.toBeInTheDocument()
  },
}
export const PanelReadOnlyPhone: Story = { args: { defaultJobId: cancelledLineJobId, readOnly: true }, globals: phone }

// Notes and history: a pass job carrying Andrea's pass story, and a one-off job carrying Joe Hart's repair.
const withStory = (jobId: string, events: Parameters<typeof storyOf>[0], messages: Parameters<typeof storyOf>[1], tech = false): AdminData => ({
  ...jobsData,
  jobs: jobsData.jobs!.map((j) => (j.id === jobId ? { ...j, timeline: storyOf(events, messages, tech) } : j)),
})

/** Notes and history after Change the pass: the story of the pass's job, newest first, with the add box above it. */
export const PanelNotesAndHistory: Story = {
  args: { data: withStory(passJobId, PASS_EVENTS, []), defaultJobId: passJobId },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Notes and history" })).toBeInTheDocument()
    await expect(await body.findByText("Spring turn-on timing changed from mid May to early May")).toBeInTheDocument()
  },
}

/** A one-off job's story: the sale, the day, a note, done and the money, and the add box. */
export const PanelNotesAndHistoryOneOff: Story = { args: { data: withStory(paidJobId, JOE_EVENTS, JOE_MESSAGES), defaultJobId: paidJobId }, globals: wide }

/** A tech reads the story without the money and still has the add box, though the pass buttons are gone. */
export const PanelNotesAndHistoryTech: Story = {
  args: { data: withStory(passJobId, PASS_EVENTS, [], true), defaultJobId: passJobId, readOnly: true },
  globals: wide,
  play: async () => {
    await expect(await body.findByLabelText("Add a note")).toBeInTheDocument()
    await expect(body.queryByText(/Consent recorded/)).not.toBeInTheDocument()
  },
}
export const PanelNotesAndHistoryPhone: Story = { args: { data: withStory(passJobId, PASS_EVENTS, []), defaultJobId: passJobId }, globals: phone }

/** No jobs yet, on a phone: the card list's empty state. */
export const EmptyPhone: Story = { args: { data: { ...jobsData, jobs: [], visits: [], passes: [] } }, globals: phone }
