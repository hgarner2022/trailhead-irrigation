import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { CalendarLegend } from "./CalendarLegend"

// The one line under the calendar that names each mark (Done, Waiting on customer, Overlaps, Time off); the same on a laptop and a phone, folded by its button.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = { title: "Blocks/Scheduler/CalendarLegend", component: CalendarLegend, parameters: { layout: "padded" }, globals: LAPTOP } satisfies Meta<typeof CalendarLegend>
export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Overlaps")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Legend" }))
    await expect(canvas.queryByText("Overlaps")).not.toBeInTheDocument()
  },
}
export const OpenPhone: Story = { globals: PHONE }
export const Folded: Story = { args: { defaultOpen: false } }
