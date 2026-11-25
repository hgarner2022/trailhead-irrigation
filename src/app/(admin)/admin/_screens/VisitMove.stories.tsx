import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen, userEvent, within } from "storybook/test"
import type { Visit } from "@/lib/admin/types"
import { pickTime } from "@/components/blocks/day-calendar-kit"
import { MoveDialog } from "./VisitMove"

// The Move dialog at 12:56 pm Mountain on Thursday, November 12, 2026 (docs/plans/2026-11-18-admin-holistic-design.md 5.2, scheduling-engine
// design section 6). Default is a visit a week out: the day, the time and one optional line, "Move and text the customer" with "Move
// without texting" under the caret. BookedTime is a visit with a promised time: the caret's twin is off and the dialog says why.
// MustBeHome asks for the YES. InsideTheWindow is a move inside the customer's 24-hour window: a warning, and it still goes through.
// FromADrop is a stop dragged to Tech Two's row. The catalog's actions only log; nothing is ever sent.

const TODAY = "2026-11-12"
const visit = (over: Partial<Visit> = {}): Visit => ({
  id: "v1", clientId: "c1", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "j1",
  scheduledOn: "2026-11-20", startAt: "2026-11-20T16:00:00Z", price: 145, minutes: 120, personId: "person_truck-1", personName: "Ryan Garner", ...over,
})

const meta = {
  title: "Screens/MoveDialog",
  component: MoveDialog,
  parameters: { layout: "fullscreen" },
  args: { visit: visit(), today: TODAY, open: true, onOpenChange: () => undefined },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async () => {
    await expect(await screen.findByRole("dialog")).toBeInTheDocument()
  },
} satisfies Meta<typeof MoveDialog>
export default meta
type Story = StoryObj<typeof meta>

/** A visit a week out: the day, the time and one optional line. */
export const Default: Story = {}

/** The visit has no day yet: "Schedule", one plain button, the date text goes as it always did. */
export const Empty: Story = { args: { visit: visit({ status: "unscheduled", scheduledOn: undefined, startAt: undefined, personId: undefined, personName: undefined }) } }

/** Nothing changed yet: both Move buttons wait, so a move to the same day and time never texts the customer. */
export const NothingChanged: Story = {
  play: async () => {
    const dialog = await screen.findByRole("dialog")
    await expect(within(dialog).getByRole("button", { name: "Move and text the customer" })).toBeDisabled()
    await expect(within(dialog).getByRole("button", { name: "More ways to move" })).toBeDisabled()
  },
}

/** A time was promised: the customer is always texted, so "Move without texting" is greyed under the caret. */
export const BookedTime: Story = {
  args: { visit: visit({ timeBooked: true, startTime: "09:30", startAt: "2026-11-20T16:30:00Z" }) },
}

/** A time chosen in the dialog is a promise the customer must hear: "Move without texting" is greyed and the line says why. */
export const ChosenTime: Story = {
  play: async () => {
    const dialog = await screen.findByRole("dialog")
    await pickTime(within(dialog), userEvent, "09:00")
    await expect(within(dialog).getByText("A chosen time is always told.")).toBeInTheDocument()
  },
}

/** A property that must be home: the text asks them to reply YES or pick another day, and the visit reads Waiting on customer. */
export const MustBeHome: Story = { args: { visit: visit({ property: { mustBeHome: true } }) } }

/** Tomorrow's visit: the customer can no longer change it online, so the dialog warns and goes through. */
export const InsideTheWindow: Story = { args: { visit: visit({ scheduledOn: "2026-11-13", startAt: "2026-11-13T16:00:00Z", property: { mustBeHome: true }, timeBooked: true, startTime: "09:00" }) } }

/** A stop dropped on another person's row: the day and the person come from the drop. */
export const FromADrop: Story = { args: { visit: visit({ timeBooked: true, startTime: "09:00" }), target: { day: "2026-11-24", personId: "person_truck-2", personName: "Tech Two" } } }

/** The same dialog on a phone. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, args: { visit: visit({ property: { mustBeHome: true }, timeBooked: true, startTime: "09:00" }) } }
