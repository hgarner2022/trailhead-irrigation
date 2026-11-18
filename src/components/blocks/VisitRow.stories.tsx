import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { VisitRow, type VisitRowProps } from "./VisitRow"

const booked = { name: "Spring turn-on", status: "scheduled", scheduledOn: "2027-04-28", startTime: "09:00", durationMinutes: 120, personFirstName: "Ryan" }

// A row is an <li>: the stories wrap it in the list it always sits in.
const meta = {
  title: "Blocks/VisitRow",
  component: VisitRow,
  parameters: { layout: "padded" },
  args: { visit: booked, change: "yes", action: <Button variant="outline">Change my day</Button> },
  render: (args: VisitRowProps) => (
    <ul className="mx-auto max-w-3xl divide-y divide-border">
      <VisitRow {...args} />
      <VisitRow visit={{ name: "Fall blowout", status: "unscheduled", scheduledOn: null }} canPick action={<Button variant="outline">Pick a day</Button>} />
      <VisitRow visit={{ name: "Repair", status: "completed", scheduledOn: "2026-11-03", personFirstName: "Ryan" }} />
      <VisitRow visit={{ name: "Mid-season inspection", status: "skipped", scheduledOn: null }} />
    </ul>
  ),
} satisfies Meta<typeof VisitRow>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

export const ListPhone: Story = { ...phone }
export const ListLaptop: Story = { ...laptop }
export const CallRyanPhone: Story = { ...phone, args: { change: "call", action: undefined } }
export const NeedsNewDayLaptop: Story = { ...laptop, args: { visit: { name: "Spring turn-on", status: "unscheduled", scheduledOn: null, notDoneReason: "no water on" }, canPick: true } }
