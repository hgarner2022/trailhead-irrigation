import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { VisitsScreen } from "./VisitsScreen"
import { VISITS_TODAY, noCardVisitId, passVisitId, visitsData } from "./visits-fixture"

// Visits at 12:56 pm Mountain on Thursday, November 12, 2026: the pass visits of the fixture, a pass the office sold
// with no card, and six one-off visits, one in each state. The header carries New job; a tech sees none. The panel stories open one visit beside the list (a sheet on a phone).

const meta = {
  title: "Screens/Visits",
  component: VisitsScreen,
  parameters: { layout: "fullscreen" },
  args: { data: visitsData, today: VISITS_TODAY },
  render: (args) => (
    <AdminShell current="visits" user={{ initials: "HG", name: "Hannah" }}>
      <VisitsScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof VisitsScreen>
export default meta
type Story = StoryObj<typeof meta>

const wide = { viewport: { value: "wide", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

export const Default: Story = {
  globals: wide,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "New job" })).toBeInTheDocument()
  },
}
export const Phone: Story = { globals: phone }

/** A tech reads the list and sees no New job. */
export const ReadOnly: Story = {
  args: { readOnly: true },
  globals: wide,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "New job" })).not.toBeInTheDocument()
  },
}

/** A scheduled one-off: Move, Done (asks how it was paid), Not done, Edit, Send a text and Cancel this visit. */
export const PanelScheduled: Story = { args: { defaultVisitId: "office-scheduled" }, globals: wide }
export const PanelScheduledPhone: Story = { args: { defaultVisitId: "office-scheduled" }, globals: phone }

/** A visit with no day: the Move becomes "Give it a day". */
export const PanelNeedsADay: Story = { args: { defaultVisitId: "office-needs-day" }, globals: wide }

/** Not done keeps its reason in the pill until the visit has a day again. */
export const PanelNotDone: Story = { args: { defaultVisitId: "office-not-done" }, globals: wide }

/** Done and the money has not come: the panel asks how it was paid. */
export const PanelDoneNotPaid: Story = { args: { defaultVisitId: "office-unpaid" }, globals: wide }
export const PanelDoneNotPaidPhone: Story = { args: { defaultVisitId: "office-unpaid" }, globals: phone }

/** Paid by check: the Money pill says how, and the thread shows the receipt. */
export const PanelPaid: Story = { args: { defaultVisitId: "office-paid" }, globals: wide }

/** The day passed: still Scheduled, with a small note. */
export const PanelDayPassed: Story = { args: { defaultVisitId: "office-day-passed" }, globals: wide }

/** A visit on a Season Pass: the job block shows the pass number, "n of m paid" and the other visits. */
export const PanelPassVisit: Story = { args: { defaultVisitId: passVisitId }, globals: wide }

/** A visit on a pass the office sold with no card: Done asks how it was paid, like a one-off, instead of charging a card. */
export const PanelPassVisitNoCard: Story = {
  args: { defaultVisitId: noCardVisitId },
  globals: wide,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Mark done and record payment" })).toBeInTheDocument()
    await expect(await canvas.findByText("Sends the receipt, which says how it was paid.")).toBeInTheDocument()
  },
}

/** A tech reads the visit and sees no buttons. */
export const PanelReadOnly: Story = { args: { defaultVisitId: "office-scheduled", readOnly: true }, globals: wide }
