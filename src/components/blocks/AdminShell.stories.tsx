import type { Meta, StoryObj } from "@storybook/nextjs-vite"
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
    current: "passes",
    user: { initials: "HG", name: "Hannah" },
    children: (
      <>
        <PageHeader title="Passes" context="Every Season Pass sold, with its three visits." />
        <p className="max-w-prose text-sm text-muted-foreground">The screen goes here, in one cream column of at most 1280px.</p>
      </>
    ),
  },
} satisfies Meta<typeof AdminShell>
export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Collapsed: Story = {
  args: { defaultOpen: false },
  globals: { viewport: { value: "wide", isRotated: false } },
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
