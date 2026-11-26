import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DayHead, HourGutter } from "./TimeGridHeader"
import { PEOPLE, RYAN, TECH } from "./scheduler-calendar-fixtures"

// The two fixed edges of the clock: the head of a day and the hour gutter with the now dot. The Week's head is the day and one chip ("3 visits" or "Full"), and nothing else; hovering or
// focusing it opens a card with the towns, open time and driving. The Day's head carries the towns and each person's open time and driving in view.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const stats = { [RYAN]: { open: "4 h open", driving: "38 min" }, [TECH]: { open: "7 h open", driving: "12 min" } }

const meta = {
  title: "Blocks/Scheduler/TimeGridHeader",
  component: DayHead,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { column: { day: "2026-11-25", label: "25 Wed", today: true, caption: "3 visits", towns: "Erie 2, Lafayette 1", stats }, people: PEOPLE, colourOf: (id: string) => PEOPLE.findIndex((p) => p.id === id), onOpenDay: fn() },
  decorators: [(Story) => <div className="flex w-80 rounded-lg border border-border bg-background"><HourGutter range={{ start: 8, end: 12 }} hourPx={56} nowMinutes={10 * 60 + 20} /><div className="flex-1"><Story /></div></div>],
} satisfies Meta<typeof DayHead>
export default meta
type Story = StoryObj<typeof meta>

/** The Week's head: the day and "3 visits". Hover or focus it for the card; press it to open the day. */
export const Default: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.hover(await canvas.findByRole("button", { name: /^25 Wed, today, 3 visits/ }))
    await expect(await within(document.body).findByText("Erie 2, Lafayette 1")).toBeInTheDocument()
    await expect(within(document.body).getByText("Ryan 4 h open. 38 min driving.")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: /^25 Wed/ }))
    await expect(args.onOpenDay).toHaveBeenCalledWith("2026-11-25")
  },
}
/** Nobody has room: "Full" takes the count's place. */
export const Full: Story = { args: { column: { day: "2026-11-26", label: "26 Thu", caption: "Full", towns: "Erie 4", stats: { [RYAN]: { open: "Full", driving: "52 min" }, [TECH]: { open: "Full" } } } } }
/** An empty day has no chip, and nothing to say in a card. */
export const EmptyDay: Story = { args: { column: { day: "2026-11-27", label: "27 Fri" } } }
/** The Day's head: the day, the count, the towns, and each person with their open time and driving. */
export const Day: Story = { args: { variant: "day", onOpenDay: undefined, column: { day: "2026-11-24", label: "24 Tue", caption: "5 visits", towns: "Erie 3, Lafayette 2", stats } } }
