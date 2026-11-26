import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TimeGridColumn } from "./TimeGridColumn"
import { HourGutter } from "./TimeGridHeader"
import { PEOPLE, WEEK_BLOCKS, WEEK_OFF, RYAN } from "./scheduler-calendar-fixtures"
import { conflictMap, minutesToPx } from "./time-grid-model"

// One person's column on one day, beside the hour gutter: the pieces the grid repeats.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const range = { start: 8, end: 17 }
const blocks = WEEK_BLOCKS.filter((b) => b.day === "2026-11-24" && b.personId === RYAN)

const meta = {
  title: "Blocks/Scheduler/TimeGridColumn",
  component: TimeGridColumn,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { day: "2026-11-24", person: PEOPLE[0]!, personIndex: 0, range, hourPx: 56, working: true, blocks, timeOff: [], conflicts: conflictMap(blocks, [], () => "Ryan") },
  decorators: [(Story) => <div className="flex w-64 rounded-lg border border-border bg-background" style={{ height: minutesToPx(9 * 60) }}><HourGutter range={range} hourPx={56} /><Story /></div>],
} satisfies Meta<typeof TimeGridColumn>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const DayOff: Story = { args: { working: false, blocks: [], timeOff: [WEEK_OFF[1]!], day: "2026-11-26", person: PEOPLE[1]!, personIndex: 1 } }
