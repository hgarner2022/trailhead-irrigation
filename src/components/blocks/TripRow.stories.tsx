import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordList } from "./RecordPanel"
import { StatusPill } from "./StatusPill"
import { TripRow } from "./TripRow"

const PHONE = { viewport: { value: "phone", isRotated: false } }
const noop = () => {}

const meta = {
  title: "Blocks/TripRow",
  component: TripRow,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-xl"><RecordList><Story /></RecordList></div>],
  args: {
    title: "Spring turn-on",
    detail: "Mon, May 3 · Ryan · Any time",
    pills: <StatusPill status="scheduled" />,
    money: "$145, charged after the visit",
    actions: [{ label: "Move", onClick: noop }, { label: "Mark done", onClick: noop }],
  },
} satisfies Meta<typeof TripRow>
export default meta
type Story = StoryObj<typeof meta>

/** A trip ahead: Move and Mark done are on the row. */
export const Default: Story = {}

/** A trip with no day yet and nothing due: the pill says Unscheduled and the money word is a dash. */
export const Empty: Story = { args: { detail: "No day yet", pills: <StatusPill status="needs-a-day" />, money: null, actions: [{ label: "Schedule", onClick: noop }] } }

/** A done trip with its money word and no buttons. */
export const Done: Story = { args: { detail: "Mon, May 3 · Ryan", pills: <StatusPill status="done" />, money: "Paid, card", actions: [] } }

/** On a phone the buttons wrap under the text. */
export const Phone: Story = { globals: PHONE }
