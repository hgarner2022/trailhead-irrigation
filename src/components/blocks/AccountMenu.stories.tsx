import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { userEvent, within } from "storybook/test"
import { AccountMenu } from "./AccountMenu"

const meta = {
  title: "Blocks/AccountMenu",
  component: AccountMenu,
  parameters: { layout: "padded" },
  args: { firstName: "Andrea" },
  decorators: [(Story) => <div className="flex justify-end"><Story /></div>],
} satisfies Meta<typeof AccountMenu>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const open = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Andrea" }))
}

export const ClosedPhone: Story = { ...phone }
export const OpenPhone: Story = { ...phone, play: open }
export const OpenLaptop: Story = { ...laptop, play: open }
/** Staff who are also customers get a way back to the admin. */
export const OpenStaffPhone: Story = { ...phone, args: { isStaff: true }, play: open }
