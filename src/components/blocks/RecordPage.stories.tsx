import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordFooter } from "./RecordFooter"
import { RecordPage } from "./RecordPage"
import { SectionHeading } from "./SectionHeading"
import { StatusPill } from "./StatusPill"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const noop = () => {}

const meta = {
  title: "Blocks/RecordPage",
  component: RecordPage,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: {
    crumb: { label: "Jobs", href: "/admin/jobs" },
    title: "Andrea Reyes",
    subtitle: "Sprinkler repair visit · Added Nov 18",
    pills: <StatusPill status="scheduled" />,
    phone: { text: "(970) 555-0123", href: "tel:+19705550123" },
    columns: [
      { heading: "When", rows: [["Day", "Tue, Nov 24"], ["Time", "Any time"], ["Who", "Ryan Garner"]] },
      { heading: "Where", rows: [["Address", "480 Briggs St, Erie"], ["Gate code", "4417"]] },
    ],
    footer: <RecordFooter primary={{ label: "Move", onClick: noop }} secondary={[{ label: "Mark done", onClick: noop }, { label: "Send a text", onClick: noop }]} destructive={{ label: "Cancel job", onClick: noop }} />,
  },
  render: (args) => (
    <div className="min-h-[640px] bg-cream">
      <RecordPage {...args}>
        <section><SectionHeading>What&apos;s included</SectionHeading></section>
      </RecordPage>
    </div>
  ),
} satisfies Meta<typeof RecordPage>
export default meta
type Story = StoryObj<typeof meta>

/** The job's page: header, the When and Where columns side by side, a section, and the footer bar. The primary is Move. */
export const Default: Story = {}

/** A page with no facts and no buttons, as a canceled record reads. */
export const Empty: Story = { args: { columns: [], footer: undefined, pills: <StatusPill status="cancelled" />, phone: undefined } }

/** On a phone the columns stack and the primary has its own row. */
export const Phone: Story = { globals: PHONE }
