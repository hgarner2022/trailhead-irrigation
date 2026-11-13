import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { trayItems } from "@/app/(admin)/admin/_screens/schedule-model"
import { ToScheduleTray } from "./ToScheduleTray"

const data = snapshot as AdminData

const meta = {
  title: "Blocks/ToScheduleTray",
  component: ToScheduleTray,
  parameters: { layout: "padded" },
  args: { items: trayItems(data), onPlace: fn() },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof ToScheduleTray>
export default meta
type Story = StoryObj<typeof meta>

/** The snapshot's pass visits with no day, earliest window first. */
export const Default: Story = {}

export const Empty: Story = {
  args: { items: [] },
}
