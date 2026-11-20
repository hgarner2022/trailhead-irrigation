import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { SectionCard } from "./SectionCard"
import { RequestRows, type RequestRow } from "./RequestRows"

const NOW = "2026-11-18T18:00:00Z"
const rows: RequestRow[] = [
  { kind: "new-requests", count: 2, oldestAt: "2026-11-18T13:12:00Z" },
  { kind: "quote-waiting", id: "Q-2026-0007", jobId: "q-beth", customer: "Beth Orr", service: "Christmas lights", amount: "$1,200", sentAt: "2026-11-09T21:00:00Z" },
  { kind: "quote-waiting", id: "Q-2026-0008", jobId: "q-greg", customer: "Greg Olsen", service: "Larger sprinkler repair", amount: "$860", sentAt: "2026-11-14T17:00:00Z", remindedAt: "2026-11-16T17:00:00Z" },
  { kind: "quote-decided", id: "Q-2026-0006", jobId: "g-lena-lights", customer: "Lena Park", outcome: "approved", amount: "$600", at: "2026-11-18T14:00:00Z" },
]

const meta = {
  title: "Blocks/RequestRows",
  component: RequestRows,
  parameters: { layout: "padded", docs: { description: { component: "Home's rows for requests and quotes, in the anatomy of a Needs action row: an icon in a tinted circle, the message, how long it has been waiting and one action. One row opens the Requests list filtered to New; one row per quote waiting says its age and has Remind (pressed by hand, once a day); a decided quote has one row Dismiss clears. A tech sees none of them." } } },
  args: { rows, now: NOW },
  render: (args) => (
    <div className="max-w-2xl">
      <SectionCard title="Needs action" flush>
        <div className="px-5">
          <RequestRows {...args} />
        </div>
      </SectionCard>
    </div>
  ),
} satisfies Meta<typeof RequestRows>
export default meta
type Story = StoryObj<typeof meta>

/** Two new requests, two quotes waiting (one already reminded) and one decided. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText("2 new requests")).toBeInTheDocument()
    await expect(c.getAllByRole("button", { name: "Remind" })).toHaveLength(2)
  },
}

/** Nothing new and nothing waiting: the block draws nothing, and Home shows its other rows or "Nothing needs you." */
export const Empty: Story = { args: { rows: [] } }

/** A tech sees none of these rows. */
export const ReadOnly: Story = { args: { readOnly: true } }

/** One new request says when it came in, not how long it has waited for an answer. */
export const OneRequest: Story = { args: { rows: [{ kind: "new-requests", count: 1, oldestAt: "2026-11-18T16:02:00Z" }] } }

/** At 375 the action drops under the message and stays 44px tall. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }

/** Remind is off the rest of the day once it has been pressed. */
export const RemindedToday: Story = { args: { rows: [{ kind: "quote-waiting", id: "Q-2026-0008", jobId: "q-greg", customer: "Greg Olsen", service: "Larger sprinkler repair", amount: "$860", sentAt: "2026-11-14T17:00:00Z", remindedAt: "2026-11-18T14:00:00Z", remindedToday: true }] } }
