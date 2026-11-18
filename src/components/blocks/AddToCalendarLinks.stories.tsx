import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AddToCalendarLinks } from "./AddToCalendarLinks"

const meta = {
  title: "Blocks/AddToCalendarLinks",
  component: AddToCalendarLinks,
  parameters: { layout: "padded" },
  args: { googleHref: "https://calendar.google.com/calendar/render?action=TEMPLATE", icsHref: "/api/visits/v1/calendar.ics?token=t" },
} satisfies Meta<typeof AddToCalendarLinks>
export default meta
type Story = StoryObj<typeof meta>

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
