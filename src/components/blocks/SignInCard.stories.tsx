import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SignInCard } from "./SignInCard"

const meta = {
  title: "Blocks/SignInCard",
  component: SignInCard,
  parameters: { layout: "fullscreen" },
  args: { audience: "admin" },
} satisfies Meta<typeof SignInCard>
export default meta
type Story = StoryObj<typeof meta>

export const Admin: Story = {}

export const Customer: Story = { args: { audience: "customer" } }

export const Sent: Story = {
  args: { audience: "customer", state: "sent", email: "andrea@example.com", retryHref: "/account/sign-in" },
}

export const Denied: Story = {
  args: { audience: "admin", state: "denied", email: "stranger@example.com" },
}

export const Failed: Story = { args: { audience: "customer", state: "failed", email: "andrea@example.com" } }

export const Phone: Story = {
  args: { audience: "customer", state: "denied", email: "andrea@example.com" },
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <SignInCard {...args} />
    </div>
  ),
}
