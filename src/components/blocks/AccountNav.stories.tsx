import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AccountNav } from "./AccountNav"

const meta = {
  title: "Blocks/AccountNav",
  component: AccountNav,
  parameters: { layout: "fullscreen" },
  args: { firstName: "Andrea", current: "/account" },
} satisfies Meta<typeof AccountNav>
export default meta
type Story = StoryObj<typeof meta>

export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
/** On a visit page: Visits is lit. */
export const VisitPhone: Story = { args: { current: "/account/visits/v1" }, globals: { viewport: { value: "phone", isRotated: false } } }
/** On Details: its tab is lit. */
export const DetailsLaptop: Story = { args: { current: "/account/details" }, globals: { viewport: { value: "laptop", isRotated: false } } }
/** Not signed in: the logo and a quiet Sign in. */
export const SignedOutPhone: Story = { args: { firstName: undefined }, globals: { viewport: { value: "phone", isRotated: false } } }
