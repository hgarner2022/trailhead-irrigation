import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { AdminShell } from "./AdminShell"
import { PageHeader } from "./PageHeader"

// The frame on its own, with a placeholder header and one paragraph standing
// in for a screen. The screens' own stories show it with real content.

const meta = {
  title: "Blocks/AdminShell",
  component: AdminShell,
  parameters: { layout: "fullscreen" },
  args: {
    current: "schedule",
    user: { initials: "HG", name: "Hannah" },
    children: (
      <>
        <PageHeader title="Passes" context="Every Season Pass sold, with its visits." actions={<Button size="sm">Export</Button>} />
        <p className="max-w-prose text-sm text-muted-foreground">The screen goes here, in one cream column of at most 1280px.</p>
      </>
    ),
  },
} satisfies Meta<typeof AdminShell>
export default meta
type Story = StoryObj<typeof meta>

// 1280: 240px rail, 56px top bar with the trigger, the title and its context line, then a 24px gap to the content. The rail's header is the brand lockup:
// the 40px mark on a cream tile, "Trailhead" over "Lawn & Irrigation", a hairline under it; the account menu is its footer.
export const Desktop: Story = {
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector("[data-sidebar=header]") as HTMLElement
    const h = within(header)
    await expect(h.getByText("Trailhead")).toBeVisible()
    await expect(h.getByText("Lawn & Irrigation")).toBeVisible()
    await expect(h.getByRole("img", { name: "Trailhead Lawn & Irrigation" })).toBeVisible()
    // the mark is 40px and starts on the nav icons' inset
    const tile = header.querySelector("span.size-10") as HTMLElement
    await expect(Math.round(tile.getBoundingClientRect().width)).toBe(40)
    const icon = canvasElement.querySelector("[data-sidebar=menu-button] svg") as SVGElement
    await expect(Math.round(tile.getBoundingClientRect().left)).toBe(Math.round(icon.getBoundingClientRect().left))
  },
}

// 1440 is the widest approval size: the column stops at 1280px and stays left-aligned.
export const Desktop1440: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Collapsed to icons (3.5rem): the 40px mark alone, centred; the lockup's two lines are gone. */
export const Collapsed: Story = {
  args: { defaultOpen: false },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector("[data-sidebar=header]") as HTMLElement
    await expect(within(header).getByText("Lawn & Irrigation")).not.toBeVisible()
    const tile = header.querySelector("span.size-10") as HTMLElement
    const rect = tile.getBoundingClientRect()
    const rail = (canvasElement.querySelector("[data-slot=sidebar-inner]") as HTMLElement).getBoundingClientRect()
    await expect(Math.round(rect.left + rect.width / 2)).toBe(Math.round(rail.left + rail.width / 2))
  },
}

export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const WithSwitcher: Story = {
  args: {
    switcher: (
      <Button variant="outline" size="sm" disabled className="w-full justify-start">
        Trailhead
      </Button>
    ),
  },
  globals: { viewport: { value: "wide", isRotated: false } },
}
