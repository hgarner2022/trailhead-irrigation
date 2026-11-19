import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordChip } from "./RecordChip"

const meta = {
  title: "Blocks/RecordChip",
  component: RecordChip,
  parameters: { layout: "padded" },
  args: { kind: "job", name: "Fall blowout", href: "/admin/jobs/job-0" },
} satisfies Meta<typeof RecordChip>
export default meta
type Story = StoryObj<typeof meta>

/** A job named in a line: the service is the link to that job's page. */
export const Job: Story = {}

/** A person named in a line. */
export const Person: Story = { args: { kind: "person", name: "Ryan", href: "/admin/settings?tab=people" } }

/** In a line of text, as in Past visits: the job, the day and the person. */
export const InALine: Story = {
  render: () => (
    <p className="text-sm">
      <RecordChip kind="job" name="Fall blowout" href="/admin/jobs/job-0" /> <span className="text-muted-foreground">· Oct 14, 2026 ·</span>{" "}
      <RecordChip kind="person" name="Ryan" href="/admin/settings?tab=people" />
    </p>
  ),
}
