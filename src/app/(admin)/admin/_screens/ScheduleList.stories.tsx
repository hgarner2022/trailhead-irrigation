import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { VisitsScreen } from "./list-fixture"
import type { AdminData } from "@/lib/admin/types"
import { JOE_EVENTS, JOE_MESSAGES, storyOf, withTimeline } from "./notes-fixture"
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
    <AdminShell current="schedule" user={{ initials: "HG", name: "Hannah" }}>
      <VisitsScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof VisitsScreen>
export default meta
type Story = StoryObj<typeof meta>

const wide = { viewport: { value: "wide", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

/** The grid with a row in each state: Scheduled ($145), Unscheduled and Not done (no day, the reason after the pill), Done and owed, Done and paid ("$145 · Paid, check"), Invoice sent, and Canceled. */
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

/** A scheduled one-off before its day: the footer leads with Move, Edit beside it, Mark done and Send a text under More, and Cancel visit at the far right. */
export const PanelScheduled: Story = { args: { defaultVisitId: "office-scheduled" }, globals: wide }
export const PanelScheduledPhone: Story = { args: { defaultVisitId: "office-scheduled" }, globals: phone }

/** A visit with no day: the footer leads with Schedule, which opens "Schedule". */
export const PanelNeedsADay: Story = { args: { defaultVisitId: "office-needs-day" }, globals: wide }

/** Not done keeps its reason in the pill until the visit has a day again. */
export const PanelNotDone: Story = { args: { defaultVisitId: "office-not-done" }, globals: wide }

/** Done and unpaid: the money pill says Unpaid and the footer leads with Collect $145, the next step. */
export const PanelOwed: Story = { args: { defaultVisitId: "office-owed" }, globals: wide }
export const PanelOwedPhone: Story = { args: { defaultVisitId: "office-owed" }, globals: phone }

/** Collect opens "How is this paid?": Check, Venmo, Cash, Send an invoice, and Pay later (no card on file). There is no Tap to pay row until it is built. */
export const PanelOwedCollect: Story = {
  args: { defaultVisitId: "office-owed" },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: /^Collect \$/ }))
    await expect(await body.findByRole("heading", { name: "How is this paid?" })).toBeInTheDocument()
    await expect(await body.findByText("Texts a pay link, due in 14 days")).toBeInTheDocument()
    await expect(await body.findByLabelText("Pay later")).toBeInTheDocument()
    await expect(body.queryByText("Tap to pay")).not.toBeInTheDocument()
  },
}
export const PanelOwedCollectPhone: Story = {
  args: { defaultVisitId: "office-owed" },
  globals: phone,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: /^Collect \$/ }))
    await expect(await body.findByRole("heading", { name: "How is this paid?" })).toBeInTheDocument()
  },
}

// Dana Reed's one-off with a Visa on file: the card is the first choice, selected, and a button like the rest.
const owedVisit = visitsData.visits.find((v) => v.id === "office-owed")!
const withCard: AdminData = { ...visitsData, clients: visitsData.clients.map((c) => (c.id === owedVisit.clientId ? { ...c, card: { brand: "visa", last4: "4242" } } : c)) }

/** A customer with a card: "Charge the Visa ending 4242 now" is preselected, with Charge $145 under it and no Pay later. Nothing charges until the button. */
export const PanelOwedCollectCard: Story = {
  args: { data: withCard, defaultVisitId: "office-owed" },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: /^Collect \$/ }))
    await expect(await body.findByLabelText("Charge the Visa ending 4242 now")).toBeChecked()
    await expect(await body.findByRole("button", { name: "Charge $145" })).toBeInTheDocument()
    await expect(body.queryByLabelText("Pay later")).not.toBeInTheDocument()
  },
}
export const PanelOwedCollectCardPhone: Story = {
  args: { data: withCard, defaultVisitId: "office-owed" },
  globals: phone,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: /^Collect \$/ }))
    await expect(await body.findByRole("button", { name: "Charge $145" })).toBeInTheDocument()
  },
}

/** A tech may collect: the footer has Mark done and Collect but no Refund, Move, Edit or Cancel. */
export const PanelOwedTechCollects: Story = {
  args: { defaultVisitId: "office-owed", readOnly: true, canCollect: true },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("button", { name: /^Collect \$/ })).toBeInTheDocument()
    await expect(body.queryByRole("button", { name: "Move" })).not.toBeInTheDocument()
  },
}

/** Mark done on a visit whose day is ahead asks first: "This visit is scheduled for Friday. Mark it done today?" Nothing is charged. */
export const PanelMarkDoneAhead: Story = {
  args: { defaultVisitId: "office-scheduled" },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: "More" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "Mark done" }))
    await expect(await body.findByRole("heading", { name: "Mark done today?" })).toBeInTheDocument()
    await expect(await body.findByText(/Nothing is charged/)).toBeInTheDocument()
  },
}
export const PanelMarkDoneAheadPhone: Story = {
  args: { defaultVisitId: "office-scheduled" },
  globals: phone,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: "More" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "Mark done" }))
    await expect(await body.findByRole("heading", { name: "Mark done today?" })).toBeInTheDocument()
  },
}

/** Paid by check: a Refund under More takes it back as a refund row (nothing is deleted), so a mistake can be put right. */
export const PanelPaidRefund: Story = {
  args: { defaultVisitId: "office-paid" },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: "More" }))
    await expect(await body.findByRole("menuitem", { name: /^Refund \$/ })).toBeInTheDocument()
  },
}

/** An invoice is out: the Money pill says Invoice sent, and the panel shows "Invoice sent Nov 10, due Nov 24" with Remind and the pay link. */
export const PanelBillSent: Story = {
  args: { defaultVisitId: "office-billed" },
  globals: wide,
  play: async () => {
    await expect(await body.findByText("Invoice sent Nov 10, due Nov 24")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Remind" })).toBeInTheDocument()
    await expect(await body.findByRole("link", { name: "Pay link" })).toBeInTheDocument()
  },
}
export const PanelBillSentPhone: Story = { args: { defaultVisitId: "office-billed" }, globals: phone }

/** A tech sees Invoice sent in the pill and no Remind, no pay link and no Send an invoice. */
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

/** A visit on a Season Pass: the job block shows the pass number, "$290 unpaid" or "1 of 2 paid, $145 unpaid" and the other visits. */
export const PanelPassVisit: Story = { args: { defaultVisitId: passVisitId }, globals: wide }

/** A visit on a pass the office sold with no card: Mark done asks nothing about money; the next step offers the no-card choices, Pay later included. */
export const PanelPassVisitNoCard: Story = {
  args: { defaultVisitId: noCardVisitId },
  globals: wide,
  play: async ({ userEvent }) => {
    // a visit whose day is ahead keeps Mark done under More
    await userEvent.click(await body.findByRole("button", { name: "More" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "Mark done" }))
    await expect(await body.findByText(/Nothing is charged/)).toBeInTheDocument()
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

// Joe Hart's repair with its story: the sale, the day, a note, done and paid by check, the money and the receipt.
const withStory = (tech = false): AdminData => ({ ...visitsData, visits: withTimeline(visitsData.visits, "office-paid", storyOf(JOE_EVENTS, JOE_MESSAGES, tech)) })

/** Notes and history under the visit's facts: the add box, then the story newest first, the note with its two lines and the receipt text as the quieter line. */
export const PanelNotesAndHistory: Story = {
  args: { data: withStory(), defaultVisitId: "office-paid" },
  globals: wide,
  play: async () => {
    await expect(await body.findByRole("heading", { name: "Notes and history" })).toBeInTheDocument()
    await expect(await body.findByText("Repair marked done, paid by check")).toBeInTheDocument()
    await expect(await body.findByText("$145 paid by check, Repair")).toBeInTheDocument()
  },
}

/** A tech reads the story without the money line and still has the add box. */
export const PanelNotesAndHistoryTech: Story = {
  args: { data: withStory(true), defaultVisitId: "office-paid", readOnly: true },
  globals: wide,
  play: async () => {
    await expect(await body.findByLabelText("Add a note")).toBeInTheDocument()
    await expect(body.queryByText(/\$145 paid/)).not.toBeInTheDocument()
  },
}

export const PanelNotesAndHistoryPhone: Story = { args: { data: withStory(), defaultVisitId: "office-paid" }, globals: phone }

/** A pass visit that is Done and Unpaid: Done closed it, and either no card could be charged or none was saved. The panel always shows how to take the money. */
const owedPass = (id: string): AdminData => ({
  ...visitsData,
  visits: visitsData.visits.map((v) => (v.id === id ? { ...v, status: "completed" as const, completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z", payments: [] } : v)),
})

/** The customer has no card: Collect opens the no-card choices and the row reads "$145 unpaid · no card". */
export const PanelOwedPassNoCard: Story = {
  args: { data: owedPass(noCardVisitId), defaultVisitId: noCardVisitId },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: /^Collect \$/ }))
    await expect(await body.findByLabelText("Pay later")).toBeInTheDocument()
  },
}

/** The customer agreed to the card at checkout: "Charge the card as agreed" is preselected with no Pay later, and Paid another way holds the cash ways. */
export const PanelOwedPassWithCard: Story = {
  args: { data: owedPass(passVisitId), defaultVisitId: passVisitId },
  globals: wide,
  play: async ({ userEvent }) => {
    await userEvent.click(await body.findByRole("button", { name: /^Collect \$/ }))
    await expect(await body.findByLabelText("Charge the card as agreed")).toBeChecked()
    await expect(await body.findByRole("button", { name: "Paid another way" })).toBeInTheDocument()
    await expect(body.queryByLabelText("Pay later")).not.toBeInTheDocument()
  },
}

/** Mark done on a pass visit with a card: nothing is charged; the charge is the next step's button. */
export const PanelDonePassWithCard: Story = {
  args: { data: { ...visitsData, visits: visitsData.visits.map((v) => (v.id === passVisitId ? { ...v, status: "scheduled" as const, completedOn: undefined, payments: [] } : v)) }, defaultVisitId: passVisitId },
  globals: wide,
  play: async ({ userEvent }) => {
    // a visit whose day is ahead keeps Mark done under More
    await userEvent.click(await body.findByRole("button", { name: "More" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "Mark done" }))
    await expect(await body.findByText(/Nothing is charged/)).toBeInTheDocument()
  },
}
