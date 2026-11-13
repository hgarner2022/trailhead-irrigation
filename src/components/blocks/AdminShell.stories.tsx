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
        <PageHeader title="Passes" context="Every Season Pass sold, with its visits." actions={<Button size="sm">Export</Button>} />
        <p className="max-w-prose text-sm text-muted-foreground">The screen goes here, in one cream column of at most 1280px.</p>
      </>
    ),
  },
} satisfies Meta<typeof AdminShell>
export default meta
type Story = StoryObj<typeof meta>

// 1280: 240px rail, 56px top bar with the trigger, the title and its context line, then a 24px gap to the content.
export const Desktop: Story = {
  globals: { viewport: { value: "laptop", isRotated: false } },
}

// 1440 is the widest approval size: the column stops at 1280px and stays left-aligned.
export const Desktop1440: Story = {
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
