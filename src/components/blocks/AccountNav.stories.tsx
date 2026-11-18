import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AccountNav } from "./AccountNav"

const meta = {
  title: "Blocks/AccountNav",
  component: AccountNav,
  parameters: { layout: "fullscreen" },
  args: { firstName: "Andrea", hasPass: true, current: "/account" },
} satisfies Meta<typeof AccountNav>
export default meta
type Story = StoryObj<typeof meta>

export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
/** A customer who has never held a pass: no Season Pass place. */
export const NoPassPhone: Story = { args: { hasPass: false, current: "/account/visits/v1" }, globals: { viewport: { value: "phone", isRotated: false } } }
export const NoPassLaptop: Story = { args: { hasPass: false, current: "/account/details" }, globals: { viewport: { value: "laptop", isRotated: false } } }
/** Not signed in: the logo and a quiet Sign in. */
export const SignedOutPhone: Story = { args: { firstName: undefined }, globals: { viewport: { value: "phone", isRotated: false } } }
