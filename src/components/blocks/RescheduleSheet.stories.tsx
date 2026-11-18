import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
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
