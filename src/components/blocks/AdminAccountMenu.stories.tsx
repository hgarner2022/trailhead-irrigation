import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { AdminAccountMenu } from "./AdminAccountMenu"

const meta = {
  title: "Blocks/AdminAccountMenu",
  component: AdminAccountMenu,
  parameters: { layout: "padded" },
  args: { user: { initials: "HG", name: "Hannah" }, profileHref: "/admin/profile", helpHref: "/admin/help", customerHref: "/account", onSignOut: fn() },
  render: (args) => (
    <div className="flex justify-end bg-cream p-4">
      <AdminAccountMenu {...args} />
    </div>
  ),
} satisfies Meta<typeof AdminAccountMenu>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** Only Sign out has an address: no Profile, Help or Open as customer. */
export const Empty: Story = { args: { profileHref: undefined, helpHref: undefined, customerHref: undefined } }
/** Initials only, at 375. */
export const Phone: Story = { args: { compact: true }, globals: { viewport: { value: "phone", isRotated: false } } }
