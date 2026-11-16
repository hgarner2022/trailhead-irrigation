import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { NewVisit } from "./NewVisit"
import { VisitPanelHost } from "./VisitPanelHost"
import { VisitsScreen } from "./VisitsScreen"
import { VISITS_TODAY, passVisitId, visitsData } from "./visits-fixture"

// Visits at 12:56 pm Mountain on Thursday, November 12, 2026: the pass visits of the fixture and six one-off
// visits, one in each state. The panel stories open one visit beside the list (a sheet on a phone).

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

export const Default: Story = { globals: wide }
export const Phone: Story = { globals: phone }

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

/** A tech reads the visit and sees no buttons. */
export const PanelReadOnly: Story = { args: { defaultVisitId: "office-scheduled", readOnly: true }, globals: wide }

function NewVisitSheet() {
  return (
    <VisitPanelHost data={visitsData} today={VISITS_TODAY}>
      <NewVisit data={visitsData} today={VISITS_TODAY} open onOpenChange={() => undefined} />
    </VisitPanelHost>
  )
}

/** New visit: customer, kind and day; everything else under More details. */
export const NewVisitSheetWide: Story = { render: () => <NewVisitSheet />, globals: wide }
export const NewVisitSheetPhone: Story = { render: () => <NewVisitSheet />, globals: phone }
