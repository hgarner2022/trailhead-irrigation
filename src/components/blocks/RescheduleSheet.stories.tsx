import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { fixtureDayTimes } from "@/lib/booking/day-time"
import { RescheduleSheet } from "./RescheduleSheet"

const days = ["2027-04-29", "2027-04-30", "2027-05-05", "2027-05-07", "2027-05-12"]
const onPick = fn(async (_day: string): Promise<{ ok: boolean; message?: string }> => ({ ok: true }))

const meta = {
  title: "Blocks/RescheduleSheet",
  component: RescheduleSheet,
  parameters: { layout: "padded" },
  args: { service: "Spring turn-on", address: "412 Briggs Street", currentDay: "2027-04-28", days, textHref: "sms:+19706927270?&body=Hi%20Ryan", onPick },
} satisfies Meta<typeof RescheduleSheet>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const open = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: /^(Reschedule|Pick a day)$/ }))
}

export const ClosedPhone: Story = { ...phone }
/** Five open days, the first preselected. */
export const OpenPhone: Story = { ...phone, play: open }
export const OpenLaptop: Story = { ...laptop, play: open }
/** A visit with no day yet: Pick a day, Book. */
export const NoDayPhone: Story = { ...phone, args: { currentDay: null }, play: open }
/** Nothing open inside the window: say so and offer Text Ryan. */
export const NoOpenDaysPhone: Story = { ...phone, args: { days: [] }, play: open }
/** The move was refused: the handler's own words stay in the sheet. */
export const RefusedPhone: Story = {
  ...phone,
  args: { onPick: fn(async (_day: string): Promise<{ ok: boolean; message?: string }> => ({ ok: false, message: "That day is not one of the days on offer; pick another" })) },
  play: async (ctx) => {
    await open(ctx)
    await userEvent.click(within(document.body).getByRole("button", { name: /^Move it to/ }))
    await expect(await within(document.body).findByRole("alert")).toBeInTheDocument()
  },
}
/** Done: the answer stays in the sheet. */
export const MovedPhone: Story = {
  ...phone,
  play: async (ctx) => {
    await open(ctx)
    await userEvent.click(within(document.body).getByRole("button", { name: /^Move it to/ }))
    await expect(await within(document.body).findByText("We texted you the new day.")).toBeInTheDocument()
  },
}

// With slots the sheet is the booking flow's day-and-time picker: the best day selected, its times, her own time offered again, a button that names the day and time.
const offers = fixtureDayTimes(60)
const onPickTime = fn(async (_pick: { day: string; start: string }): Promise<{ ok: boolean; message?: string }> => ({ ok: true }))
const timed = { offers, onPickTime, currentStart: "10:30" }
export const TimedOpenPhone: Story = { ...phone, args: timed, play: open }
export const TimedOpenLaptop: Story = { ...laptop, args: timed, play: open }
/** A time tapped: the button names the day and the time, and the answer stays in the sheet. */
export const TimedMovedPhone: Story = {
  ...phone,
  args: timed,
  play: async (ctx) => {
    await open(ctx)
    await userEvent.click(within(document.body).getByRole("radio", { name: /11:00 am/ }))
    await userEvent.click(within(document.body).getByRole("button", { name: /^Move it to/ }))
    await expect(await within(document.body).findByText("We texted you the new time.")).toBeInTheDocument()
  },
}
export const TimedNoOpenDaysPhone: Story = { ...phone, args: { ...timed, offers: [] }, play: open }
