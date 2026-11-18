import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { VisitsScreen } from "./VisitsScreen"
import { VISITS_TODAY, noCardVisitId, passVisitId, visitsData } from "./visits-fixture"

// The panel is a dialog in a portal on the body, outside the story's canvas.
const body = within(document.body)

// Visits at 12:56 pm Mountain on Thursday, November 12, 2026: the pass visits of the fixture, a pass the office sold
// with no card, and six one-off visits, one in each state. The header carries New job; a tech sees none. The panel stories open one visit over the list (a drawer on a laptop, a sheet on a phone).

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

/** The grid with a row in each state: Scheduled ($145), Unscheduled and Not done (no day, the reason after the pill), Done and owed, Done and paid ("$145 · Paid, check"), Bill sent, and Cancelled. */
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

/** Done and owed: the money pill says Owed and the panel offers Record the payment. */
export const PanelOwed: Story = { args: { defaultVisitId: "office-owed" }, globals: wide }
export const PanelOwedPhone: Story = { args: { defaultVisitId: "office-owed" }, globals: phone }

/** Done and owed: besides Record the payment, the panel offers Send a bill with what it does under it. */
export const PanelOwedSendBill: Story = {
  args: { defaultVisitId: "office-owed" },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("button", { name: "Send a bill" })).toBeInTheDocument()
    await expect(await body.findByText("Texts a pay link, or emails it when there is no mobile.")).toBeInTheDocument()
  },
}

/** Done asks how it was paid: Check, Venmo, Cash, and last Send a bill, which texts a pay link instead of recording money. */
export const PanelDoneSendBill: Story = {
  args: { defaultVisitId: "office-scheduled" },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByLabelText("Send a bill"))
    await expect(await body.findByRole("button", { name: "Mark done and send a bill" })).toBeInTheDocument()
  },
}

/** A bill is out: the Money pill says Bill sent, and the panel shows "Bill sent Nov 10, due Nov 24" with Remind and the pay link. */
export const PanelBillSent: Story = {
  args: { defaultVisitId: "office-billed" },
  globals: wide,
  play: async () => {
    await expect(await body.findByText("Bill sent Nov 10, due Nov 24")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Remind" })).toBeInTheDocument()
    await expect(await body.findByRole("link", { name: "Pay link" })).toBeInTheDocument()
  },
}
export const PanelBillSentPhone: Story = { args: { defaultVisitId: "office-billed" }, globals: phone }

/** A tech sees Bill sent in the pill and no Remind, no pay link and no Send a bill. */
export const PanelBillSentTech: Story = {
  args: { defaultVisitId: "office-billed", readOnly: true },
  globals: wide,
  play: async () => {
    await expect(body.queryByRole("button", { name: "Remind" })).not.toBeInTheDocument()
    await expect(body.queryByRole("link", { name: "Pay link" })).not.toBeInTheDocument()
  },
}

/** Paid by check: the Money pill says how, and the thread shows the receipt. */
export const PanelPaid: Story = { args: { defaultVisitId: "office-paid" }, globals: wide }

/** The day passed: still Scheduled, with a small note. */
export const PanelDayPassed: Story = { args: { defaultVisitId: "office-day-passed" }, globals: wide }

/** A visit on a Season Pass: the job block shows the pass number, "$290 owed" or "1 of 2 paid, $145 owed" and the other visits. */
export const PanelPassVisit: Story = { args: { defaultVisitId: passVisitId }, globals: wide }

/** A visit on a pass the office sold with no card: Done asks how it was paid, like a one-off, instead of charging a card. */
export const PanelPassVisitNoCard: Story = {
  args: { defaultVisitId: noCardVisitId },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("button", { name: "Mark done and record payment" })).toBeInTheDocument()
    await expect(await body.findByText("Sends the receipt, which says how it was paid. A bill goes with a pay link instead.")).toBeInTheDocument()
  },
}

/** A manager sees the whole yard under "At the property", the gate code and Dana's number included. */
export const PanelProperty: Story = {
  args: { defaultVisitId: "office-scheduled" },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("heading", { name: "At the property" })).toBeInTheDocument()
    await expect(await body.findByText("Gate code 4471")).toBeInTheDocument()
    await expect(await body.findByText("Contact Dana, (303) 555-0111")).toBeInTheDocument()
  },
}

/** A tech sees the yard with no gate code and no phone for the contact. */
export const PanelPropertyTech: Story = {
  args: { defaultVisitId: "office-scheduled", readOnly: true },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("heading", { name: "At the property" })).toBeInTheDocument()
    await expect(await body.findByText("Contact Dana")).toBeInTheDocument()
    await expect(body.queryByText(/Gate code/)).not.toBeInTheDocument()
  },
}

/** A tech reads the visit and sees no buttons. */
export const PanelReadOnly: Story = { args: { defaultVisitId: "office-scheduled", readOnly: true }, globals: wide }
