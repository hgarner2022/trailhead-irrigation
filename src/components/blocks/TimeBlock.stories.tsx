import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Bell } from "lucide-react"
import { TimeBlock } from "./TimeBlock"
import { minutesToPx, type GridBlock } from "./time-grid-model"

// One visit as a block and as a chip: every height (30 minutes one line, 45 adds the time, 60 and up the service and town) and every state.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const B: GridBlock = { id: "b", day: "2026-11-24", personId: "p", start: 9 * 60, minutes: 60, title: "Briggs St", name: "Andrea", kind: "turn-on", town: "Erie", service: "Spring turn-on" }
const frame = (b: GridBlock, extra: Partial<React.ComponentProps<typeof TimeBlock>> = {}) => (
  <div className="relative w-44" style={{ height: minutesToPx(b.minutes) }}>
    <TimeBlock block={b} initials="RG" style={{ position: "absolute", inset: 0 }} {...extra} />
  </div>
)

const meta = {
  title: "Blocks/Scheduler/TimeBlock",
  component: TimeBlock,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { block: B, personIndex: 0, initials: "RG", onSelect: () => {}, onAction: () => {} },
  render: (args) => frame(args.block, args),
} satisfies Meta<typeof TimeBlock>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** No actions menu, nothing to press: a block with no callbacks. */
export const Empty: Story = { args: { onSelect: undefined, onAction: undefined, block: { ...B, minutes: 30 } } }
export const Phone: Story = { globals: PHONE, args: { touch: true } }

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      {[30, 45, 60, 90, 120].map((m) => <div key={m}>{frame({ ...B, id: `m${m}`, minutes: m })}</div>)}
    </div>
  ),
}
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      {frame(B, { selected: true })}
      {frame(B, { hovered: true })}
      {frame(B, { conflict: "Ryan has Dry Creek Rd at 3:00 pm." })}
      {frame({ ...B, notTold: true }, { notToldMark: <Bell aria-label="Customer not told" className="size-3.5 text-warning-ink" /> })}
      {frame({ ...B, waiting: true })}
      {frame({ ...B, done: true })}
      {frame({ ...B, planned: { day: "2026-11-23", personId: "p", start: 600 } })}
      {frame(B, { dragging: true })}
      {frame({ ...B, kind: "blowout" }, { personIndex: 1, initials: "TT" })}
    </div>
  ),
}
export const Chips: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <TimeBlock block={{ ...B, start: null, minutes: 60, title: "Cheesman St" }} variant="chip" onSelect={() => {}} onAction={() => {}} />
      <TimeBlock block={{ ...B, start: null, minutes: 120, title: "Dry Creek Rd", service: "Repair" }} variant="chip" personIndex={1} onSelect={() => {}} />
    </div>
  ),
}
