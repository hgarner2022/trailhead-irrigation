import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { NextVisitCard } from "./NextVisitCard"

const booked = { name: "Spring turn-on", scheduledOn: "2027-04-28", startTime: "09:00", durationMinutes: 120, personFirstName: "Ryan", mustBeHome: true }

const meta = {
  title: "Blocks/NextVisitCard",
  component: NextVisitCard,
  parameters: { layout: "padded" },
  args: { visit: booked, today: "2027-04-14", change: "yes", action: <Button variant="outline">Change my day</Button> },
} satisfies Meta<typeof NextVisitCard>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

export const BookedPhone: Story = { ...phone }
export const BookedLaptop: Story = { ...laptop }
/** The day is within two days: Change my day becomes the phone number. */
export const CallRyanPhone: Story = { ...phone, args: { change: "call", action: undefined } }
export const CallRyanLaptop: Story = { ...laptop, args: { change: "call", action: undefined } }
export const NoDayPickPhone: Story = { ...phone, args: { visit: { ...booked, scheduledOn: null, startTime: null }, canPick: true, action: <Button variant="outline">Three days to pick from</Button> } }
export const NoDayComingSoonLaptop: Story = { ...laptop, args: { visit: { ...booked, scheduledOn: null, startTime: null }, canPick: false, change: "no", action: undefined } }
export const NeedsNewDayPhone: Story = { ...phone, args: { visit: { ...booked, scheduledOn: null, startTime: null, notDoneReason: "no water on" }, canPick: true } }
export const NothingBookedPhone: Story = { ...phone, args: { visit: null } }
export const NothingBookedLaptop: Story = { ...laptop, args: { visit: null } }
