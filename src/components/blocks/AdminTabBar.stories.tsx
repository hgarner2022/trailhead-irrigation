import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { AdminTabBar } from "./AdminTabBar"

// The phone's bottom bar: Home, Schedule, Jobs, Customers and More (Reports, Settings, Sign out). The bar is `md:hidden`, so every story is at phone width.
// `fixed` puts it at the foot of the story's frame.

const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/AdminTabBar",
  component: AdminTabBar,
  parameters: { layout: "fullscreen" },
  globals: PHONE,
  args: { current: "jobs", user: { name: "Hannah" }, onSignOut: fn() },
  render: (args) => (
    <div className="min-h-svh bg-cream p-4">
      <p className="text-sm text-muted-foreground">The screen is above the bar.</p>
      <AdminTabBar {...args} />
    </div>
  ),
} satisfies Meta<typeof AdminTabBar>
export default meta
type Story = StoryObj<typeof meta>

/** Five tabs with their labels at 375px; the current screen is lit. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole("navigation", { name: "Main" }))
    await expect(bar.getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Schedule", "Jobs", "Customers"])
    await expect(bar.getByRole("button", { name: "More" })).toBeInTheDocument()
  },
}

/** Reports or Settings is the screen: More is lit (its menu, Reports, Settings and Sign out, is covered by the unit test). */
export const MoreLit: Story = {
  args: { current: "reports" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "More" })).toHaveAttribute("aria-current", "page")
  },
}

/** Nothing to sign out of (the catalog): the menu still opens and Sign out does nothing. */
export const Empty: Story = { args: { onSignOut: undefined } }

export const Phone: Story = {}
