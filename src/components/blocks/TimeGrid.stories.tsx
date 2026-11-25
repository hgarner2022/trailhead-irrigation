import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { TimeGrid, TimeGridDndProvider } from "./TimeGrid"
import { ExternalJobDraggable } from "./ExternalJobDraggable"
import { NOW, PEOPLE, PLANNED, WEEK_ANYTIME, WEEK_BLOCKS, WEEK_COLUMNS, WEEK_EMPTY, WEEK_OFF, DAY_COLUMNS, CONFLICT_BLOCKS, dayColumns } from "./scheduler-calendar-fixtures"
import { clockWords, moveResult, rangeWords, visibleRange, type GridBlock } from "./time-grid-model"
import { weekdayName } from "@/lib/admin/calendar"
import type { TimeGridProps } from "./time-grid-types"

// The clock (design 7.1 to 7.3, 7.10, 7.13) over the week of Nov 23 2026. Each state at 1280; Phone is the same grid at 375 (a day strip and one
// day's column, no drag). "Drag playground" is live: drag a block to another day, time or person, drag its bottom edge, drag a chip into the
// clock, drag across empty hours for time off, or Tab to a block, press Space, use the arrows and press Enter. The line under it says what just happened.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const base: TimeGridProps = { people: PEOPLE, columns: WEEK_COLUMNS, blocks: WEEK_BLOCKS, anytime: WEEK_ANYTIME, timeOff: WEEK_OFF, now: NOW }

const meta = {
  title: "Blocks/Scheduler/TimeGrid",
  component: TimeGrid,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: base,
} satisfies Meta<typeof TimeGrid>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: "Week, two people" }
export const WeekOnePerson: Story = { name: "Week, one person", args: { people: [PEOPLE[1]!], allPeople: PEOPLE, blocks: WEEK_BLOCKS.filter((b) => b.personId === PEOPLE[1]!.id), anytime: WEEK_ANYTIME.filter((b) => b.personId === PEOPLE[1]!.id) } }
export const Empty: Story = { name: "Empty week", args: { columns: WEEK_EMPTY, blocks: [], anytime: [], timeOff: [], now: undefined } }
export const DayTwoPeople: Story = { name: "Day, two people", args: { columns: DAY_COLUMNS, showPersonNames: true } }
export const OverlapAndConflict: Story = { name: "Overlap and conflict", args: { columns: dayColumns(["2026-11-26"]), blocks: CONFLICT_BLOCKS, anytime: [], timeOff: [], showPersonNames: true } }
export const NotToldAndWaiting: Story = { name: "Not told and waiting",
  args: { columns: dayColumns(["2026-11-24", "2026-11-25"]), notToldMark: () => <span className="block size-2.5 rounded-full bg-warning" title="Customer not notified" /> },
}
export const TimeOff: Story = { name: "Time off", args: { columns: dayColumns(["2026-11-25", "2026-11-26"]), showPersonNames: true } }
export const PlannedMoves: Story = { name: "Planned moves", args: { planned: PLANNED } }
export const Selected: Story = { args: { selectedId: "v7", hoverId: "v10" } }
export const Phone: Story = { globals: PHONE }
export const PhoneWithPlans: Story = { name: "Phone, with plans", globals: PHONE, args: { planned: PLANNED, selectedId: "v7" } }

const day = (iso: string) => `${weekdayName(iso).slice(0, 3)} ${Number(iso.slice(8))}`

function Playground(args: TimeGridProps) {
  const [blocks, setBlocks] = useState<GridBlock[]>([...WEEK_BLOCKS, ...WEEK_ANYTIME])
  const [off, setOff] = useState(WEEK_OFF)
  const [selected, setSelected] = useState<string>()
  const [hover, setHover] = useState<string>()
  const [said, setSaid] = useState<{ text: string; undo?: () => void }>({ text: "Drag a visit. Tab to one and press Space to lift it." })
  const range = visibleRange(args.people)
  const find = (id: string) => blocks.find((b) => b.id === id)!
  const first = (id: string) => find(id).title
  const set = (id: string, patch: Partial<GridBlock>, text: string) => {
    const before = blocks
    setBlocks((all) => all.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    setSaid({ text, undo: () => { setBlocks(before); setSaid({ text: "Undone." }) } })
  }
  return (
    <div className="space-y-3">
      <TimeGrid
        {...args}
        blocks={blocks.filter((b) => b.start !== null)}
        anytime={blocks.filter((b) => b.start === null)}
        timeOff={off}
        selectedId={selected}
        hoverId={hover}
        onSelect={(id) => { setSelected(id); setSaid({ text: `${first(id)} opens in the visit panel.` }) }}
        onHover={(id) => setHover(id ?? undefined)}
        onMove={(m) => {
          const r = moveResult(find(m.id), m, range)
          set(m.id, { day: r.day, personId: r.personId, start: r.start }, `${first(m.id)} moved to ${day(r.day)}, ${r.start === null ? "Any time" : clockWords(r.start)}.${m.conflict ? ` ${m.conflict}` : ""}`)
        }}
        onResize={(r) => set(r.id, { minutes: r.minutes }, `${first(r.id)} now ${r.minutes} minutes.`)}
        onCreateAt={(c) => setSaid({ text: `New job on ${day(c.day)} at ${clockWords(c.start)}. Nothing is added in this story.` })}
        onTimeOffDrag={(t) => { setOff((o) => [...o, { id: `off${o.length + 1}`, personId: t.personId, day: t.day, start: t.start, end: t.end }]); setSaid({ text: `Time off ${day(t.day)}, ${rangeWords(t.start, t.end - t.start)}.` }) }}
        onAction={(id, a) => setSaid({ text: a === "move" ? `${first(id)}: Move opens the Move dialog.` : `${first(id)}: ${a}.` })}
      />
      <p role="status" className="text-sm text-navy">
        {said.text}
        {said.undo && <button type="button" onClick={said.undo} className="ml-2 inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary-deep underline underline-offset-2">Undo</button>}
      </p>
    </div>
  )
}

export const DragPlayground: Story = { name: "Drag playground",
  render: (args) => <Playground {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    // keyboard: Tab to Briggs St (Tuesday, 10:30), lift with Space, one row down, drop with Enter
    const block = (await c.findAllByRole("button", { name: /^Briggs St, Mid-season inspection/ }))[0]!
    block.focus()
    await userEvent.keyboard(" ")
    await userEvent.keyboard("{ArrowDown}")
    await userEvent.keyboard("{Enter}")
    await expect(await c.findByRole("status")).toHaveTextContent(/Briggs St moved to Tue 24, 10:45 am/)
  },
}
export const DragPlaygroundPhone: Story = { ...DragPlayground, name: "Drag playground, phone", globals: PHONE, play: undefined }

const pointer = (type: string, target: EventTarget, x: number, y: number, buttons = 1) =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0, buttons, clientX: x, clientY: y }))
const pause = () => new Promise((r) => setTimeout(r, 60))
/** A mouse drag from the middle of `el` by (dx, dy): press, three moves, release. */
async function mouseDrag(el: Element, dx: number, dy: number, grab = { x: 10, y: 10 }) {
  const r = el.getBoundingClientRect()
  const x = r.x + grab.x
  const y = r.y + grab.y
  pointer("pointerdown", el, x, y)
  for (const f of [0.3, 0.7, 1]) { await pause(); pointer("pointermove", document, x + dx * f, y + dy * f) }
  await pause()
  pointer("pointerup", document, x + dx, y + dy, 0)
}

/** The same playground, driven by a mouse in the test: an hour down moves Briggs St to 11:30, then the bottom edge is dragged 28 px for 30 minutes more. */
export const MouseDragCheck: Story = {
  name: "Drag playground, mouse check",
  render: (args) => <Playground {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const handle = (await c.findAllByRole("button", { name: /^Briggs St, Mid-season inspection/ }))[0]!
    await mouseDrag(handle, 0, 56)
    await expect(await c.findByRole("status")).toHaveTextContent(/Briggs St moved to Tue 24, 11:30 am/)
    const edge = canvasElement.querySelector<HTMLElement>('[data-id="v6"] [data-slot="time-block-resize"]')!
    await mouseDrag(edge, 0, 28, { x: 5, y: 4 })
    await expect(await c.findByRole("status")).toHaveTextContent(/Briggs St now 120 minutes/)
  },
}

function ExternalDemo(args: TimeGridProps) {
  const [said, setSaid] = useState("Drag the row onto the clock.")
  return (
    <TimeGridDndProvider>
      <div className="flex items-start gap-4">
        <ExternalJobDraggable id="job_larkspur" minutes={60} label="Larkspur Dr">
          <div className="w-56 rounded-lg border border-border bg-background p-3 text-sm text-navy">Larkspur Dr, spring turn-on, 1 h</div>
        </ExternalJobDraggable>
        <div className="min-w-0 flex-1">
          <TimeGrid {...args} onDropExternal={(d) => setSaid(`${d.id} dropped on ${day(d.day)}, ${d.start === null ? "Any time" : clockWords(d.start)}.${d.conflict ? ` ${d.conflict}` : ""}`)} />
          <p role="status" className="mt-2 text-sm text-navy">{said}</p>
        </div>
      </div>
    </TimeGridDndProvider>
  )
}

/** A row from outside the grid (the Unscheduled panel's) dropped on Ryan's Wednesday at 9:30: the grid reports it through onDropExternal. */
export const ExternalRowDrop: Story = {
  name: "Drag from outside",
  args: { columns: DAY_COLUMNS, showPersonNames: true, blocks: [], anytime: [], timeOff: [] },
  render: (args) => <ExternalDemo {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const row = canvasElement.querySelector("[data-unscheduled-id] > div")!
    const col = canvasElement.querySelector('[data-slot="time-grid-column"]')!.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    await mouseDrag(row, col.x + 40 - (r.x + 10), col.y + 98 - (r.y + 10))
    await expect(await c.findByRole("status")).toHaveTextContent(/job_larkspur dropped on Wed 25, 9:30 am/)
  },
}
