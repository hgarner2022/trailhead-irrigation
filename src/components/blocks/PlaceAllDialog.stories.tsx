import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { PlaceAllDialog } from "./PlaceAllDialog"

const meta = {
  title: "Blocks/PlaceAllDialog",
  component: PlaceAllDialog,
  parameters: { layout: "centered" },
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    rows: [
      { id: "a", who: "Andrea Reyes, Erie", what: "Repair", where: "Tue Nov 24, Ryan Garner" },
      { id: "b", who: "Jim Park, Erie", what: "Spring turn-on", where: "Tue Nov 24, Sam Lee" },
      { id: "c", who: "Cy Bell, Lafayette", what: "Fall blowout", where: "Wed Nov 25, Ryan Garner" },
    ],
  },
} satisfies Meta<typeof PlaceAllDialog>
export default meta
type Story = StoryObj<typeof meta>

/** Who goes on which day with which person, then one button. */
export const Default: Story = {}

/** A job nothing has room for keeps its reason and is left out of the button's count. */
export const OneWithNoRoom: Story = {
  args: { rows: [...(meta.args.rows ?? []), { id: "d", who: "Lena Kim, Louisville", what: "Spring turn-on", problem: "No open day before May 31. Pick a day yourself." }] },
}
