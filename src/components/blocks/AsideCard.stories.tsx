import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AsideCard } from "./AsideCard"

const meta = {
  title: "Blocks/AsideCard",
  component: AsideCard,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="max-w-xs bg-cream p-6"><Story /></div>],
  args: { name: "Andrea Dalton", href: "/admin/customers", phone: { text: "(970) 555-0123", href: "tel:+19705550123" }, address: ["480 Briggs St", "Erie, CO"] },
} satisfies Meta<typeof AsideCard>
export default meta
type Story = StoryObj<typeof meta>

/** The customer at the top of the aside: initials, the name as the link, the phone and the address. */
export const Default: Story = {}

/** A customer with no phone on file shows the name and the address only. */
export const NoPhone: Story = { args: { phone: undefined } }
