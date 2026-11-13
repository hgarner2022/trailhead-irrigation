import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { JOB_WORDS, type JobState } from "@/lib/admin/jobs"
import { JobPill } from "./JobPill"

const STATES = Object.keys(JOB_WORDS) as JobState[]

const meta = {
  title: "Blocks/JobPill",
  component: JobPill,
  parameters: { layout: "padded" },
  args: { job: { state: "scheduled", notClosed: false } },
} satisfies Meta<typeof JobPill>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The eight states a visit can be in, the same words on the Passes panel, the Schedule, the pass page and Home. */
export const AllStates: Story = {
  render: () => (
    <ul className="flex flex-wrap gap-6">
      {STATES.map((state) => (
        <li key={state} className="flex flex-col items-center gap-2">
          <JobPill job={{ state, notClosed: false }} />
          <span className="text-xs text-muted-foreground">{state}</span>
        </li>
      ))}
    </ul>
  ),
}

/** Not closed is a flag beside the state, never a state: the day has passed and nobody marked the job done. */
export const NotClosed: Story = {
  args: { job: { state: "scheduled", notClosed: true } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Scheduled")).toBeInTheDocument()
    await expect(canvas.getByText("Not closed")).toBeInTheDocument()
  },
}
