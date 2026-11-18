import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { CancelVisitSheet } from "./CancelVisitSheet"

const meta = {
  title: "Blocks/CancelVisitSheet",
  component: CancelVisitSheet,
  parameters: { layout: "padded" },
  args: { service: "Spring turn-on", dayWords: "Wednesday, April 28", consequence: "Nothing is charged. Your Season Pass stays and this visit comes off it.", textHref: "sms:+19706927270?&body=Hi%20Ryan", onCancel: fn(async (_reason: string): Promise<{ ok: boolean; message?: string }> => ({ ok: true })) },
} satisfies Meta<typeof CancelVisitSheet>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const open = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Cancel visit" }))
}

export const ClosedPhone: Story = { ...phone }
/** A Season Pass visit: it comes off the pass. */
export const OpenPassPhone: Story = { ...phone, play: open }
export const OpenPassLaptop: Story = { ...laptop, play: open }
/** A one-off that is the job's only visit. */
export const OpenOneOffPhone: Story = { ...phone, args: { service: "Repair", consequence: "Nothing is charged." }, play: open }
/** A one-off with other visits on its job. */
export const OpenOtherVisitsPhone: Story = { ...phone, args: { service: "Repair", consequence: "Nothing is charged for this visit. Your other visits stay." }, play: open }
/** A job that already holds a payment: a cancel never moves money, and Ryan will contact the customer. */
export const OpenHasPaymentPhone: Story = { ...phone, args: { service: "Repair", consequence: "Nothing more is charged. The $145 you already paid stays as it is, and Ryan will contact you about it." }, play: open }
/** A visit with no day yet. */
export const OpenNoDayPhone: Story = { ...phone, args: { dayWords: "No day yet" }, play: open }
export const CanceledPhone: Story = {
  ...phone,
  play: async (ctx) => {
    await open(ctx)
    await userEvent.click(within(document.body).getAllByRole("button", { name: "Cancel visit" }).at(-1)!)
    await expect(await within(document.body).findByText("Canceled. We texted you a note.")).toBeInTheDocument()
  },
}
export const RefusedPhone: Story = {
  ...phone,
  args: { onCancel: async () => ({ ok: false as const, message: "This visit is within 24 hours, so it can't be changed online. Text or call Ryan at (970) 692-7270." }) },
  play: async (ctx) => {
    await open(ctx)
    await userEvent.click(within(document.body).getAllByRole("button", { name: "Cancel visit" }).at(-1)!)
    await expect(await within(document.body).findByRole("alert")).toBeInTheDocument()
  },
}
