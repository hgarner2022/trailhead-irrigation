import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import type { Person } from "@/lib/admin/types"
import { PersonToggles } from "./PersonToggles"

// The Schedule's one person control: a chip per person, pressed = shown, as Google Calendar's calendar list works. The last person shown cannot be turned off; one person draws nothing.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const p = (id: string, name: string): Person => ({ id, name, initials: name.slice(0, 2), role: "tech", truck: name, workingDays: ["mon"], capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 } })
const PEOPLE = [p("a", "Ryan Garner"), p("b", "Hannah Garner"), p("c", "Tech Two")]

function Harness({ start = [] as string[] }: { start?: string[] }) {
  const [hidden, setHidden] = useState(start)
  return <div className="p-4"><PersonToggles people={PEOPLE} hidden={hidden} onToggle={(id) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))} /></div>
}
const meta = { title: "Blocks/Scheduler/PersonToggles", component: Harness, parameters: { layout: "padded" }, globals: LAPTOP } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const AllShown: Story = {}
export const OneHidden: Story = {
  args: { start: ["b"] },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "Show Hannah Garner's visits" })).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(canvas.getByRole("button", { name: "Show Hannah Garner's visits" }))
    await expect(canvas.getByRole("button", { name: "Show Hannah Garner's visits" })).toHaveAttribute("aria-pressed", "true")
  },
}
export const OneHiddenPhone: Story = { ...OneHidden, globals: PHONE }
