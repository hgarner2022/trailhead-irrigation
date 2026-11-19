import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AsideCard } from "./AsideCard"
import { RecordFooter } from "./RecordFooter"
import { RecordFacts } from "./RecordPanel"
import { RecordPage } from "./RecordPage"
import { SectionCard } from "./SectionCard"
import { StatusPill } from "./StatusPill"
import { SummaryBand } from "./SummaryBand"

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
    title: "Andrea Dalton",
    subtitle: "Sprinkler repair visit · Added Nov 18",
    badges: <StatusPill status="scheduled" size="lg" />,
    band: (
      <SummaryBand
        items={[
          { label: "When", value: "Tue, Nov 24", sub: "Any time" },
          { label: "Who", value: "Ryan Garner" },
          { label: "Where", value: "480 Briggs St", sub: "Erie" },
          { label: "Total", value: "$145", sub: "Not billed yet" },
        ]}
      />
    ),
    aside: (
      <>
        <AsideCard name="Andrea Dalton" href="/admin/customers" phone={{ text: "(970) 555-0123", href: "tel:+19705550123" }} address={["480 Briggs St", "Erie, CO"]} />
        <SectionCard title="Property" id="p">
          <RecordFacts divided rows={[["Gate code", "4417"], ["Must be home", "No"]]} />
        </SectionCard>
      </>
    ),
    actions: <RecordFooter primary={{ label: "Move", onClick: noop }} secondary={[{ label: "Mark done", onClick: noop }]} more={[{ label: "Edit", onClick: noop }]} destructive={{ label: "Cancel job", onClick: noop }} destructiveInMenu />,
  },
  render: (args) => (
    <div className="min-h-[640px] bg-cream">
      <RecordPage {...args}>
        <SectionCard title="What's included" id="inc">
          <p className="text-sm">Repair, $145</p>
        </SectionCard>
      </RecordPage>
    </div>
  ),
} satisfies Meta<typeof RecordPage>
export default meta
type Story = StoryObj<typeof meta>

/** The frame: header with the badge beside the title and the actions at the top right, the summary band, the main column and the aside. */
export const Default: Story = {}

/** A page with no band, aside or buttons, as a canceled record reads. */
export const Empty: Story = { args: { band: undefined, aside: undefined, actions: undefined, badges: <StatusPill status="cancelled" size="lg" /> } }

/** On a phone: one column (band, main, aside) and the actions are one bar pinned to the bottom. */
export const Phone: Story = { globals: PHONE }
