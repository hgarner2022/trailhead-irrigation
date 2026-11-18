import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { NextVisitCard, type NextVisitProps } from "./NextVisitCard"
import { TextRyan } from "./TextRyan"

const booked: NextVisitProps = {
  heading: "Wednesday, April 28",
  detail: "We'll text your window the day before.",
  service: "Spring turn-on",
  where: "412 Briggs Street, Erie",
  label: "Season Pass 2027",
  mustBeHome: true,
  href: "/account/visits/v1",
  actions: (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <Button>Reschedule</Button>
      <Button variant="link" className="h-auto px-0 py-2 text-destructive">
        Cancel visit
      </Button>
    </div>
  ),
}

const meta = {
  title: "Blocks/NextVisitCard",
  component: NextVisitCard,
  parameters: { layout: "padded" },
  args: { visit: booked },
} satisfies Meta<typeof NextVisitCard>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

export const BookedPhone: Story = { ...phone }
export const BookedLaptop: Story = { ...laptop }
/** The day-before text went out: the window and who is coming. */
export const WindowToldPhone: Story = { ...phone, args: { visit: { ...booked, detail: "Between 8 and 10 am, with Ryan." } } }
/** Inside 24 hours: Text Ryan and Call Ryan replace the two actions. */
export const InsideCutoffPhone: Story = { ...phone, args: { visit: { ...booked, actions: <TextRyan textHref="sms:+19706927270" /> } } }
export const InsideCutoffLaptop: Story = { ...laptop, args: { visit: { ...booked, actions: <TextRyan textHref="sms:+19706927270" /> } } }
/** No day yet. */
export const NoDayPhone: Story = { ...phone, args: { visit: { ...booked, heading: "Pick a day", detail: "", actions: <Button>Pick a day</Button> } } }
export const NoDayComingSoonLaptop: Story = { ...laptop, args: { visit: { ...booked, heading: "Day coming soon", detail: "We'll text you when Ryan has one.", actions: undefined } } }
export const NothingBookedPhone: Story = { ...phone, args: { visit: null } }
export const NothingBookedLaptop: Story = { ...laptop, args: { visit: null } }
