import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { ScheduleMoveTo } from "./ScheduleMoveTo"

// The Schedule's way to move a visit without dragging: a person and a day of the visible week, the day chosen on the one calendar in a popover (bounded to the week), then Move.
const data = snapshot as AdminData
const visit = { ...data.visits[0]!, startAt: "2026-11-12T15:00:00Z", status: "scheduled" as const, personId: "person_truck-1", personName: "Ryan Garner" }

const meta = {
  title: "Screens/ScheduleMoveTo",
  component: ScheduleMoveTo,
  parameters: { layout: "padded" },
  args: { visit, people: data.settings.people, weekStart: "2026-11-09", timeZone: "America/Denver", onMove: () => {} },
} satisfies Meta<typeof ScheduleMoveTo>
export default meta
type Story = StoryObj<typeof meta>

export const Laptop: Story = {
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Move to day/ }))
    await userEvent.click(await within(document.body).findByRole("button", { name: "Friday, November 13" }))
    await expect(canvas.getByRole("button", { name: "Move to day, Friday, November 13" })).toBeInTheDocument()
  },
}
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
