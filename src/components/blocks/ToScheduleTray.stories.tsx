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
  args: { items: trayItems(data).slice(0, 6), onPlace: fn(), onPlaceAll: fn(), onAnotherDay: fn() },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof ToScheduleTray>
export default meta
type Story = StoryObj<typeof meta>

/** The snapshot's pass visits with no day, earliest window first, a Place on each row and a quiet Schedule all above them. */
export const Default: Story = {}

/** Every job has a day: the words of the design, no Schedule all. */
export const Empty: Story = {
  args: { items: [] },
}

/** A job nothing has room for says so under its row, with Another day, which opens the job to pick one by hand. */
export const NoOpenDay: Story = {
  args: { noRoom: { [trayItems(data)[1]!.id]: "No open day before May 31. Pick a day yourself." } },
}

/** A refused Place says why in the API's own words, under that row only. */
export const Refused: Story = {
  args: { problems: { [trayItems(data)[0]!.id]: "Ryan Garner is full of turn-on visits on 2027-04-26" } },
}

/** A tech reads the list: no Place, no Schedule all. */
export const ReadOnly: Story = {
  args: { readOnly: true },
}
