import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobFlow } from "./JobFlow"

// The whole job, clickable (Hannah, Nov 19 2026): Schedule, Move, On my way, Mark done, How is this paid?, the invoice and its reminder,
// Record the payment, the checklist with notes and photos, Cancel job. Fixtures and a reducer, no API. Start over resets it.

const meta = {
  title: "Design/Job flow (clickable)",
  component: JobFlow,
  parameters: { layout: "fullscreen" },
  render: () => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobFlow />
    </AdminShell>
  ),
} satisfies Meta<typeof JobFlow>
export default meta
type Story = StoryObj<typeof meta>

/** Start at Unscheduled: Schedule, pick Today, On my way, Mark done, then choose how it is paid. */
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
