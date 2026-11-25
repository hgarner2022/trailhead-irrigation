import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { OFFICE_STARTS } from "@/lib/booking/day-time"
import { TimeChips } from "./TimeChips"

// The one start-time chip style: the booking form's times, Reschedule's, the office's Move and New job, the Schedule dialog, and Settings' day hours (in a `TimeField`, its own story) all draw it.
function Chips({ anyTime = false }: { anyTime?: boolean }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <TimeChips options={OFFICE_STARTS.slice(2, 14)} value={value} onChange={setValue} anyTime={anyTime} legend="Thursday, April 15" />
    </div>
  )
}

const meta = { title: "Blocks/TimeChips", component: Chips, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Chips>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "9:00 am" }))
    await expect(canvas.getByRole("radio", { name: "9:00 am" })).toBeChecked()
  },
}
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
/** The office: Any time first, held while no start is chosen. */
export const AnyTimePhone: Story = { args: { anyTime: true }, globals: { viewport: { value: "phone", isRotated: false } } }
