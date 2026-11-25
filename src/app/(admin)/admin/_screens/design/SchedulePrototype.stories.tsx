import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { SchedulePrototype } from "./SchedulePrototype"
import type { ProtoInitial } from "./use-schedule-prototype"

// The Schedule prototype (docs/plans/2026-11-25-scheduler-design.md, sections 7 and 9) over fixtures: the week of Monday, Nov 23 2026, Ryan Garner and Tech Two, today Wednesday the 25th.
// Each story opens in its state by doing what a person would do (a keyboard move, a click) so the whole path is tested; the "toast stays" ones hold "Visit moved" up (it closes after 10 seconds
// on its own). Phone stories are the same screen at 375: the day strip and one day's column, panels as sheets, no drag. Nothing is sent and nothing is saved.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Screens/Schedule prototype (Nov 25)",
  component: SchedulePrototype,
  parameters: { layout: "fullscreen", docs: { description: { component: "The new Schedule over fixtures. Drag a visit, press Notify, press Undo, open Unscheduled and Map together, Ask Jev, New job then Find a time. See Start here: Scheduler (Nov 25)." } } },
  globals: LAPTOP,
  render: (args) => (
    <AdminShell current="schedule" user={{ initials: "HG", name: "Hannah" }}>
      <SchedulePrototype {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof SchedulePrototype>
export default meta
type Story = StoryObj<typeof meta>

const body = () => within(document.body)
/** Tab to a block by its name, lift it with Space, move it by `rows` fifteen-minute rows and drop it with Enter. */
async function keyboardMove(root: HTMLElement, name: RegExp, rows: number) {
  const block = (await within(root).findAllByRole("button", { name }))[0]!
  block.focus()
  await userEvent.keyboard(" ")
  for (let i = 0; i < rows; i++) await userEvent.keyboard("{ArrowDown}")
  await userEvent.keyboard("{Enter}")
}
/** The phone has no drag: the block's menu is the way. */
async function menuAction(label: string, item: string) {
  await userEvent.click(await body().findByRole("button", { name: label }))
  await userEvent.click(await body().findByRole("menuitem", { name: item }))
}
/** A header action: a button on a laptop, an item in the More menu on a phone. */
async function header(name: string) {
  const direct = body().queryByRole("button", { name })
  if (direct) return userEvent.click(direct)
  await userEvent.click(await body().findByRole("button", { name: "More actions" }))
  await userEvent.click(await body().findByRole("menuitem", { name }))
}
const askJev = () => header("Ask Jev")
const planReady = async () => body().findByRole("heading", { name: /Jev's plan, week of Nov 23/ })

const held: ProtoInitial = { toastSeconds: 0 }
const phone = (s: Story): Story => ({ ...s, name: `${s.name ?? ""}, phone`, globals: PHONE })

export const Week: Story = { name: "Week" }
export const WeekPhone: Story = phone(Week)

export const WeekUnscheduledOpen: Story = { name: "Week with Unscheduled open", args: { panels: { unscheduled: true } } }
export const WeekUnscheduledOpenPhone: Story = phone(WeekUnscheduledOpen)

export const WeekMapOpen: Story = { name: "Week with Map open", args: { panels: { map: true } } }
export const WeekMapOpenPhone: Story = phone(WeekMapOpen)

export const WeekBothPanelsOpen: Story = { name: "Week with both panels open", args: { panels: { unscheduled: true, map: true } } }
// on a phone the panels are sheets, one at a time: the last one opened is the one shown
export const WeekBothPanelsOpenPhone: Story = { ...phone(WeekBothPanelsOpen), args: { panels: { unscheduled: false, map: true } } }

export const DayTwoPeople: Story = { name: "Day, two people", args: { view: "day" } }
export const DayTwoPeoplePhone: Story = phone(DayTwoPeople)

export const Month: Story = { name: "Month", args: { view: "month" } }
export const MonthPhone: Story = phone(Month)

/** Meadowlark Ln is lifted with Space, moved down one row (15 minutes) and dropped with Enter: "Visit moved" with Notify and Undo, and the visit is marked not told. */
export const JustMoved: Story = {
  name: "Just moved (toast showing)",
  args: held,
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Meadowlark Ln, Spring turn-on/, 1)
    await expect(await body().findByText("Visit moved")).toBeInTheDocument()
    await expect(await body().findByRole("button", { name: "Notify" })).toBeInTheDocument()
  },
}
export const JustMovedPhone: Story = {
  ...phone(JustMoved),
  play: async () => {
    await menuAction("Actions for Spruce Ct", "15 minutes longer")
    await expect(await body().findByText("Visit moved")).toBeInTheDocument()
  },
}

/** Notify opens the message first; nothing is sent until Send. */
export const NotifyDialogOpen: Story = {
  name: "Notify dialog open",
  args: held,
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Meadowlark Ln, Spring turn-on/, 1)
    await userEvent.click(await body().findByRole("button", { name: "Notify" }))
    await expect(await body().findByRole("dialog", { name: /Tell Sam about the new time/ })).toBeInTheDocument()
  },
}
export const NotifyDialogOpenPhone: Story = {
  ...phone(NotifyDialogOpen),
  play: async () => {
    await menuAction("Actions for Spruce Ct", "15 minutes longer")
    await userEvent.click(await body().findByRole("button", { name: "Notify" }))
    await expect(await body().findByRole("dialog", { name: /Tell Jan about the new time/ })).toBeInTheDocument()
  },
}

/** "3 not told" opens the Unscheduled panel on its Not told tab, with Notify, Don't tell and Notify all. */
export const NotToldList: Story = {
  name: "Not told list",
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "3 not told" }))
    await expect(await body().findByRole("button", { name: "Notify all" })).toBeInTheDocument()
  },
}
export const NotToldListPhone: Story = phone(NotToldList)

/** Briggs St is moved down one row and now overlaps Vista Pkwy: the drop asks "Move anyway?" and lists what it breaks. */
export const MoveAnywayDialog: Story = {
  name: "Move anyway dialog",
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Briggs St, Mid-season inspection/, 1)
    await expect(await body().findByRole("dialog", { name: "Move anyway?" })).toBeInTheDocument()
  },
}
export const MoveAnywayDialogPhone: Story = {
  ...phone(MoveAnywayDialog),
  args: { dialog: { kind: "confirm", action: { type: "move", id: "v15", to: { day: "2026-11-25", personId: "person_truck-1", start: 12 * 60 + 30 } }, problems: ["Ryan is off 12 to 2 pm."] } },
  play: async () => {
    await expect(await body().findByRole("dialog", { name: "Move anyway?" })).toBeInTheDocument()
  },
}

export const TimeOffDialogOpen: Story = {
  name: "Time off dialog",
  play: async () => {
    await header("Time off")
    await expect(await body().findByRole("dialog", { name: "Time off" })).toBeInTheDocument()
  },
}
export const TimeOffDialogOpenPhone: Story = phone(TimeOffDialogOpen)

/** The bands are drawn; pressing one opens it to edit, with Remove. */
export const WeekWithTimeOff: Story = {
  name: "Week with time off",
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: /Edit time off: Ryan off 12 to 2 pm/ }))
    await expect(await body().findByRole("button", { name: "Remove" })).toBeInTheDocument()
  },
}
export const WeekWithTimeOffPhone: Story = phone(WeekWithTimeOff)

export const JevDrafting: Story = {
  name: "Jev drafting",
  args: { jevDelayMs: 600_000 },
  play: async () => {
    await askJev()
    await expect(await body().findByText("Jev is working")).toBeInTheDocument()
  },
}
export const JevDraftingPhone: Story = phone(JevDrafting)

export const JevPlanDrawn: Story = {
  name: "Jev plan drawn",
  args: { jevDelayMs: 300 },
  play: async () => {
    await askJev()
    await planReady()
  },
}
export const JevPlanDrawnPhone: Story = phone(JevPlanDrawn)

/** Accept applies the three ticked moves: one toast "3 visits moved" with Notify all and Undo; the visits join Not told. */
export const JevPlanAccepted: Story = {
  name: "Jev plan accepted",
  args: { jevDelayMs: 300, toastSeconds: 0 },
  play: async () => {
    await askJev()
    await planReady()
    await userEvent.click(await body().findByRole("button", { name: /^Accept/ }))
    await expect(await body().findByText("3 visits moved")).toBeInTheDocument()
  },
}
export const JevPlanAcceptedPhone: Story = phone(JevPlanAccepted)

const findResults = async () => {
  await userEvent.click(await body().findByRole("button", { name: "New job" }))
  await userEvent.selectOptions(await body().findByRole("combobox", { name: "Customer" }), "Andrea Reyes")
  await userEvent.click(await body().findByRole("button", { name: "Find a time" }))
  await body().findByRole("radiogroup", { name: "Openings" }, { timeout: 5000 })
}
const firstOpening = async () => (await within(await body().findByRole("radiogroup", { name: "Openings" })).findAllByRole("radio"))[0]!
export const FindATimeInNewJob: Story = { name: "Find a time in New job (results)", play: findResults }
export const FindATimeInNewJobPhone: Story = phone(FindATimeInNewJob)

/** The chosen row lights a dotted block on the grid at that day, time and person, and its pin on the map. */
export const FindATimeRowPicked: Story = {
  name: "Find a time row picked",
  play: async () => {
    await findResults()
    await userEvent.click(await firstOpening())
    // the ghost lands on the picked row: Thursday, Ryan's column, 11:30 am; the whole list is still there
    await waitFor(() => expect(document.querySelector("[data-id='ghost']")).not.toBeNull())
    const col = document.querySelector("[data-id='ghost']")!.closest("[data-slot='time-grid-column']") as HTMLElement
    await expect(col.dataset.day).toBe("2026-11-26")
    await expect(col.dataset.person).toBe("person_truck-1")
    await expect(within(await body().findByRole("radiogroup", { name: "Openings" })).getAllByRole("radio").length).toBeGreaterThan(3)
  },
}
export const FindATimeRowPickedPhone: Story = {
  ...phone(FindATimeRowPicked),
  play: async () => {
    await findResults()
    await userEvent.click(await firstOpening())
  },
}

const pointer = (type: string, target: EventTarget, x: number, y: number, buttons = 1) =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0, buttons, clientX: x, clientY: y }))
const pause = () => new Promise((r) => setTimeout(r, 60))

/** The first Unscheduled row (Andrea, Kenosha Dr) is dragged onto Ryan's Wednesday at 11:00: "Visit scheduled", a bell on the new block, and the job leaves Unscheduled. */
export const DropFromUnscheduled: Story = {
  name: "Drop a row from Unscheduled",
  args: { panels: { unscheduled: true }, toastSeconds: 0 },
  play: async ({ canvasElement }) => {
    const row = await within(canvasElement).findByText("Andrea Reyes · Erie")
    const handle = row.closest("[data-unscheduled-id]")!.firstElementChild!
    const col = canvasElement.querySelector('[data-slot="time-grid-column"][data-day="2026-11-25"][data-person="person_truck-1"]')!.getBoundingClientRect()
    const from = handle.getBoundingClientRect()
    const [x0, y0, x1, y1] = [from.x + 10, from.y + 10, col.x + 40, col.y + 3 * 56 + 10]
    pointer("pointerdown", handle, x0, y0)
    for (const f of [0.3, 0.7, 1]) { await pause(); pointer("pointermove", document, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f) }
    await pause()
    pointer("pointerup", document, x1, y1, 0)
    await expect(await body().findByText("Visit scheduled")).toBeInTheDocument()
    await expect(await body().findByText(/Kenosha Dr, Wed, Nov 25, 11:00 am/)).toBeInTheDocument()
  },
}

export const EmptyWeek: Story = { name: "Empty week", args: { day: "2026-11-30" } }
export const EmptyWeekPhone: Story = phone(EmptyWeek)

export const ShortcutsHelp: Story = {
  name: "Shortcuts help",
  play: async () => {
    await userEvent.keyboard("?")
    await expect(await body().findByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument()
  },
}
