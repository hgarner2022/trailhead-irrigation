import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobFlow } from "./JobFlow"

// The whole job, clickable (Hannah, Nov 19 2026): Schedule, Move, On my way, Mark done, How is this paid?, the invoice and its reminder,
// Record the payment, the checklist with notes and photos, Cancel job. Fixtures and a reducer, no API. Start over resets it.

const meta = {
  title: "Design/Job flow (clickable)",
  component: JobFlow,
  parameters: { layout: "fullscreen", docs: { description: { component: "The job, clickable: Schedule, Move, On my way, Mark done, How is this paid?, the invoice and its reminder, Record the payment and Cancel job over a small reducer. Start over resets it." } } },
  render: () => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobFlow />
    </AdminShell>
  ),
} satisfies Meta<typeof JobFlow>
export default meta
type Story = StoryObj<typeof meta>

/** The same flow for a customer who wants email: the dialogs say email and the sentences name the channel. */
export const EmailCustomer: Story = { name: "Email customer", render: () => <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}><JobFlow channel="email" /></AdminShell>, globals: { viewport: { value: "laptop", isRotated: false } } }

/** Start at Unscheduled: Schedule, pick Today, On my way, Mark done, then choose how it is paid. */
export const Laptop: Story = { name: "Laptop", globals: { viewport: { value: "laptop", isRotated: false } } }
export const Phone: Story = { name: "Phone", globals: { viewport: { value: "phone", isRotated: false } } }
