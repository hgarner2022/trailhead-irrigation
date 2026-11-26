import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DesignShell } from "./DesignShell"
import { SchedulePrototype } from "./SchedulePrototype"
import type { ProtoInitial } from "./use-schedule-prototype"
import { orderStory } from "./schedule-order-fixture"
import { teamWorld } from "./schedule-team-fixture"
import { HOUR_PX } from "@/components/blocks/time-grid-model"

// The Schedule prototype (docs/plans/2026-11-25-scheduler-design.md, sections 7 and 9, and the second review, docs/plans/2026-11-26-scheduler-review-research.md) over the walkthrough's calendar:
// Ryan Garner and Hannah Garner, today Wednesday, Nov 18 2026, every visit read from its job page. The walkthrough's own Schedule is the way in (Admin walkthrough, clickable); these stories
// keep the states it cannot open directly: Week with both panels, a visit's peek, Edit visit with its Length, Just moved, the People menu with five people, the Week header's card, Day with its
// driving lines, Reorder stops, Month, Empty week and the phone twins. A click on a block opens its peek here and in the walkthrough (Open job goes to the job page there). Each story opens in its
// state by doing what a person would do (a keyboard move, a click); the "toast stays" ones hold "Moved to ..." up (it closes after 10 seconds on its own). Phone stories are the same screen at
// 375: the day strip and one day's column, panels as sheets, no drag. Nothing is sent and nothing is saved.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Screens/Schedule prototype (Nov 25)",
  component: SchedulePrototype,
  parameters: { layout: "fullscreen", docs: { description: { component: "The Schedule over the walkthrough's calendar. Drag a visit, press Notify the customer, press Undo, open Unscheduled and Map together, press Schedule on a job with no day. See Start here: Scheduler (Nov 25)." } } },
  globals: LAPTOP,
  render: (args) => (
    <DesignShell current="schedule">
      <SchedulePrototype {...args} />
    </DesignShell>
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
/** A tap or click on a block opens its peek. */
async function openPeek(root: HTMLElement, name: RegExp) {
  await userEvent.click((await within(root).findAllByRole("button", { name }))[0]!)
  return await body().findByRole("complementary", { name: "Ravi Shah" }).catch(async () => await body().findByRole("dialog", { name: "Ravi Shah" }))
}
/** The phone has no drag: peek, Edit visit, 15 minutes longer, confirm. */
async function editLonger(root: HTMLElement) {
  await openPeek(root, /^Willow Dr, Fall blowout/)
  await userEvent.click(await body().findByRole("button", { name: "Edit visit" }))
  await userEvent.click(await body().findByRole("button", { name: "15 minutes longer" }))
  await userEvent.click(await body().findByRole("button", { name: "Move and notify the customer" }))
}
const held: ProtoInitial = { toastSeconds: 0 }
const phone = (s: Story): Story => ({ ...s, name: `${s.name ?? ""}, phone`, globals: PHONE })

export const Week: Story = { name: "Week" }
export const WeekPhone: Story = { ...phone(Week), args: { view: "week" } }

export const WeekBothPanelsOpen: Story = { name: "Week with both panels open", args: { panels: { unscheduled: true, map: true } } }
// on a phone the panels are sheets, one at a time: the last one opened is the one shown
export const WeekBothPanelsOpenPhone: Story = { ...phone(WeekBothPanelsOpen), args: { panels: { unscheduled: false, map: true } } }

export const DayTwoPeople: Story = { name: "Day, two people", args: { view: "day" } }
export const DayTwoPeoplePhone: Story = phone(DayTwoPeople)

export const Month: Story = { name: "Month", args: { view: "month" } }
export const MonthPhone: Story = phone(Month)

/** Willow Dr is lifted with Space, moved down one row (15 minutes) and dropped with Enter: "Moved to Wed, Nov 18, 8:15 am" with Notify the customer and Undo. Nothing else stays on screen. */
export const JustMoved: Story = {
  name: "Just moved (toast showing)",
  args: held,
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Willow Dr, Fall blowout/, 1)
    await expect(await body().findByText("Moved to Wed, Nov 18, 8:15 am")).toBeInTheDocument()
    await expect(await body().findByRole("button", { name: "Notify the customer" })).toBeInTheDocument()
    await expect(body().queryByText(/not notified/i)).not.toBeInTheDocument()
  },
}
/** On a phone there is no drag: the peek's Edit visit, one step longer, and the toast says "Now 8:00 to 8:45 am" with Undo alone. */
export const JustMovedPhone: Story = {
  ...phone(JustMoved),
  play: async ({ canvasElement }) => {
    await editLonger(canvasElement)
    await expect(await body().findByText(/^Now 8:00 to 8:45 am/)).toBeInTheDocument()
  },
}

/** Notify the customer opens the one Send a message dialog, prefilled from the date-moved text; nothing is sent until Send, and then "Customer notified" closes by itself. */
export const MessageOpen: Story = {
  name: "Send a message open (Notify the customer)",
  args: held,
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Willow Dr, Fall blowout/, 1)
    await userEvent.click(await body().findByRole("button", { name: "Notify the customer" }))
    await expect(await body().findByRole("dialog", { name: "Send a message" })).toBeInTheDocument()
  },
}

/** A click on a visit opens its peek: docked at the right on a laptop, the grid stays usable. Edit visit, Mark done (today or earlier) and Open job. */
export const VisitPeekOpen: Story = {
  name: "A visit clicked, peek open",
  play: async ({ canvasElement }) => {
    const peek = await openPeek(canvasElement, /^Willow Dr, Fall blowout/)
    await expect(peek).toBeInTheDocument()
    await expect(within(peek).getByRole("button", { name: "Edit visit" })).toBeInTheDocument()
    await expect(within(peek).getByRole("button", { name: "Open job" })).toBeInTheDocument()
    await expect(within(peek).getByRole("button", { name: "Mark done" })).toBeInTheDocument()
    await expect(within(peek).getByText("Length")).toBeInTheDocument()
    const directions = within(peek).getByRole("link", { name: /^Directions to Willow Dr/ })
    await expect(directions).toHaveAttribute("href", expect.stringContaining("https://www.google.com/maps/dir/?api=1&destination=Willow%20Dr"))
    await expect(directions).toHaveAttribute("target", "_blank")
    await expect(body().queryByRole("button", { name: /^Actions for/ })).not.toBeInTheDocument()
  },
}
export const VisitPeekOpenPhone: Story = {
  ...phone(VisitPeekOpen),
  play: async ({ canvasElement }) => {
    const peek = await openPeek(canvasElement, /^Willow Dr, Fall blowout/)
    await expect(peek).toBeInTheDocument()
    await expect(within(peek).getByRole("link", { name: /^Directions to Willow Dr/ })).toBeInTheDocument()
  },
}

/** Enter opens the peek, and Escape closes it and gives the focus back to the block. */
export const PeekEscapeReturnsFocus: Story = {
  name: "Peek: Escape returns focus to the block",
  play: async ({ canvasElement }) => {
    const block = (await within(canvasElement).findAllByRole("button", { name: /^Willow Dr, Fall blowout/ }))[0]!
    block.focus()
    await userEvent.keyboard("{Enter}")
    await expect(await body().findByRole("complementary", { name: "Ravi Shah" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await expect(body().queryByRole("complementary", { name: "Ravi Shah" })).not.toBeInTheDocument()
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    await expect(block).toHaveFocus()
  },
}

/** Edit visit from the peek: the one reviewed dialog, with a Length field in 15 minute steps. */
export const EditVisitWithLength: Story = {
  name: "Edit visit, with Length",
  play: async ({ canvasElement }) => {
    await openPeek(canvasElement, /^Willow Dr, Fall blowout/)
    await userEvent.click(await body().findByRole("button", { name: "Edit visit" }))
    const dialog = within(await body().findByRole("dialog", { name: "Edit visit" }))
    await expect(dialog.getByRole("group", { name: "Length" })).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "15 minutes longer" }))
    await expect(dialog.getByText("45 min")).toBeInTheDocument()
  },
}
export const EditVisitWithLengthPhone: Story = { ...phone(EditVisitWithLength) }

/** The peek holds one visit at a time: another block swaps its content. */
export const PeekSwapsVisit: Story = {
  name: "Peek swaps to another visit",
  play: async ({ canvasElement }) => {
    await openPeek(canvasElement, /^Willow Dr, Fall blowout/)
    await userEvent.click((await within(canvasElement).findAllByRole("button", { name: /^(?!Willow Dr)\S.*, (Spring turn-on|Repair)/ }))[0]!)
    await expect(body().queryByRole("complementary", { name: "Ravi Shah" })).not.toBeInTheDocument()
    await expect(document.querySelectorAll("aside.visit-peek")).toHaveLength(1)
  },
}

/** Edit visit from a block: the one Schedule dialog with the best times above its calendar. */
export const ScheduleDialogFromBlock: Story = {
  name: "Schedule dialog with best times (Edit visit from a block)",
  args: { dialog: { kind: "schedule", id: "g-sam", job: false } },
  play: async () => {
    await expect(await body().findByRole("dialog", { name: "Edit visit" })).toBeInTheDocument()
    await expect(await body().findByRole("radiogroup", { name: "Openings" })).toBeInTheDocument()
  },
}
export const ScheduleDialogFromBlockPhone: Story = phone(ScheduleDialogFromBlock)

/** A job with no day: its row says "Suggested: ..." and Schedule opens the same dialog with that row already picked. */
export const ScheduleFromUnscheduledRow: Story = {
  name: "Schedule from an Unscheduled row (suggestion picked)",
  args: { panels: { unscheduled: true } },
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "Schedule Andrea Dalton" }))
    await expect(await body().findByRole("dialog", { name: "Schedule visit" })).toBeInTheDocument()
    await expect(await within(await body().findByRole("radiogroup", { name: "Openings" })).findAllByRole("radio", { checked: true })).toHaveLength(1)
  },
}
export const ScheduleFromUnscheduledRowPhone: Story = {
  ...phone(ScheduleFromUnscheduledRow),
  args: { panels: { unscheduled: true } },
}

/** Dropped on a place that breaks a rule: "Move anyway?" lists what it breaks. */
export const MoveTheVisitDialog: Story = {
  name: "Move anyway? (a place that breaks a rule)",
  args: { dialog: { kind: "confirm", action: { type: "move", id: "g-sam", to: { day: "2026-11-20", personId: "person_hannah", start: 13 * 60 } }, problems: ["Hannah is off 12 to 2 pm.", "Adds 25 min of driving."] } },
  play: async () => {
    const dialog = await body().findByRole("dialog", { name: "Move anyway?" })
    await expect(within(dialog).getByRole("button", { name: "Move anyway" })).toBeInTheDocument()
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  },
}
export const MoveTheVisitDialogPhone: Story = phone(MoveTheVisitDialog)

/** The band is drawn; pressing it goes to Settings, People (here only a note: the walkthrough routes it). */
export const WeekWithTimeOff: Story = {
  name: "Week with time off",
  args: { onOpenSettings: fn() },
  play: async () => {
    await expect(await body().findByRole("button", { name: /Time off, change it in Settings: Hannah off 12 to 2 pm/ })).toBeInTheDocument()
  },
}

const pointer = (type: string, target: EventTarget, x: number, y: number, buttons = 1) =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0, buttons, clientX: x, clientY: y }))
const pause = () => new Promise((r) => setTimeout(r, 60))

/** The first Unscheduled row is dragged onto Ryan's Thursday at 11:00: "Scheduled for Thu, Nov 19, 11:00 am" and the job leaves Unscheduled. */
export const DropFromUnscheduled: Story = {
  name: "Drop a row from Unscheduled",
  args: { panels: { unscheduled: true }, toastSeconds: 0 },
  play: async ({ canvasElement }) => {
    const row = await within(canvasElement).findByText("Andrea Dalton · Erie")
    const handle = row.closest("[data-unscheduled-id]")!.firstElementChild!
    const col = canvasElement.querySelector('[data-slot="time-grid-column"][data-day="2026-11-19"][data-person="person_ryan"]')!.getBoundingClientRect()
    const from = handle.getBoundingClientRect()
    const [x0, y0, x1, y1] = [from.x + 10, from.y + 10, col.x + 40, col.y + 3 * HOUR_PX + 10]
    pointer("pointerdown", handle, x0, y0)
    for (const f of [0.3, 0.7, 1]) { await pause(); pointer("pointermove", document, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f) }
    await pause()
    pointer("pointerup", document, x1, y1, 0)
    await expect(await body().findByText("Scheduled for Thu, Nov 19, 11:00 am")).toBeInTheDocument()
  },
}

export const EmptyWeek: Story = { name: "Empty week", args: { day: "2026-12-28" } }
export const EmptyWeekPhone: Story = { ...phone(EmptyWeek), args: { day: "2026-12-28", view: "week" } }

export const ShortcutsHelp: Story = {
  name: "Shortcuts help",
  play: async () => {
    await userEvent.keyboard("?")
    await expect(await body().findByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument()
  },
}

/** Thursday has a stop with no set time: Reorder stops previews where each stop would go and the driving it saves, then one change with Undo and no message to anyone. */
export const ReorderStops: Story = {
  name: "Reorder stops",
  // Ryan has three stops with no set time on Thursday in a poor order (Longmont, Broomfield, Firestone): ordering slots them into the gaps and saves driving
  args: { view: "day", day: "2026-11-19", toastSeconds: 0, state: orderStory() },
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "Reorder stops" }))
    const dialog = within(await body().findByRole("dialog", { name: "Reorder stops to save driving" }))
    await expect(dialog.getByRole("region", { name: "Now" })).toBeInTheDocument()
    await expect(dialog.getByRole("region", { name: "Reordered" })).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Reorder stops" }))
    await expect(await body().findByText(/^Stops reordered\. .* less driving\.$/)).toBeInTheDocument()
    await expect(body().queryByRole("button", { name: "Notify the customer" })).not.toBeInTheDocument()
  },
}
export const ReorderStopsPhone: Story = phone(ReorderStops)

/** Schedule all N: where each job with no day would go, from the same rule; each row can be removed and the rest are planned again. */
export const ScheduleAll: Story = {
  name: "Schedule all",
  args: { panels: { unscheduled: true }, toastSeconds: 0 },
  play: async () => {
    // three jobs wait for a day since the admin's Nov 26 merge (the job that waited on a price is a Draft quote now, not a job)
    await userEvent.click(await body().findByRole("button", { name: "Schedule all 3" }))
    const dialog = within(await body().findByRole("dialog", { name: "Schedule all 3" }))
    await expect(dialog.getAllByRole("listitem")).toHaveLength(3)
    await userEvent.click(dialog.getByRole("button", { name: "Remove Andrea Dalton" }))
    await expect(await body().findByRole("dialog", { name: "Schedule all 2" })).toBeInTheDocument()
    await userEvent.click(await body().findByRole("button", { name: "Schedule and notify the customer" }))
    await expect(await body().findByText(/^2 visits scheduled/, undefined, { timeout: 4000 })).toBeInTheDocument()
  },
}
// on a phone the Unscheduled sheet is open, so the toast waits for it: the phone twin stops at the preview
export const ScheduleAllPhone: Story = {
  ...phone(ScheduleAll),
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "Schedule all 3" }))
    await expect(await body().findByRole("dialog", { name: "Schedule all 3" })).toBeInTheDocument()
  },
}

/** List is the product's own visits grid over this calendar: a row opens the visit as a block does. */
export const ListView: Story = {
  name: "List",
  args: { view: "list" },
  play: async () => {
    await expect(await body().findByText(/visits this season/)).toBeInTheDocument()
  },
}
export const ListViewPhone: Story = phone(ListView)

/** Inside "Another day": a chosen day's own openings, ranked the way the best times are, with the times that break a rule greyed. */
export const AnotherDayRanked: Story = {
  name: "Schedule dialog, another day ranked",
  args: { dialog: { kind: "schedule", id: "g-sam", job: false } },
  play: async () => {
    await expect(await body().findByRole("dialog", { name: "Edit visit" })).toBeInTheDocument()
    await expect(document.querySelector('[data-slot="day-times"] [role="radiogroup"]')).not.toBeNull()
  },
}

/** One person hidden with the People menu in the toolbar: Week and Day lose their column, Month's counts, the Map and the List follow, and the last person shown cannot be turned off. */
export const OnePersonHidden: Story = {
  name: "One person hidden",
  args: { hidden: ["person_hannah"], panels: { map: true } },
  play: async () => {
    await expect(await body().findByRole("button", { name: "People: Ryan" })).toBeInTheDocument()
    await expect(document.querySelectorAll('[data-slot="day-head"]').length).toBeGreaterThan(0)
    await expect(document.querySelector('[data-slot="day-head"]')).not.toHaveTextContent("Hannah")
  },
}
export const OnePersonHiddenPhone: Story = { ...phone(OnePersonHidden), args: { hidden: ["person_hannah"] }, play: async () => {
  await expect(await body().findByRole("button", { name: "People: Ryan" })).toBeInTheDocument()
} }
export const TwoPeopleShown: Story = {
  name: "People menu, two people",
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "People: Everyone" }))
    await userEvent.click(await body().findByRole("checkbox", { name: "Hannah Garner" }))
    await expect(await body().findByRole("button", { name: "People: Ryan" })).toBeInTheDocument()
    await expect(await body().findByRole("checkbox", { name: "Ryan Garner" })).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(await body().findByRole("checkbox", { name: "Hannah Garner" }))
  },
}
export const TwoPeopleShownPhone: Story = {
  ...phone(TwoPeopleShown),
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "People: Everyone" }))
    await expect(await body().findByRole("dialog", { name: "People" })).toBeInTheDocument()
  },
}

/** Five people: the People button says "3 of 5", the Week gets narrow columns and scrolls sideways inside the grid only, with the hour gutter kept in view. */
export const WeekFivePeople: Story = {
  name: "Week, five people",
  args: { world: teamWorld(5), hidden: [] },
  play: async () => {
    await expect(await body().findByRole("button", { name: "People: Everyone" })).toBeInTheDocument()
  },
}
export const WeekFivePeoplePhone: Story = { ...phone({ ...WeekFivePeople, name: "Week, five people" }), args: { world: teamWorld(5), hidden: [], view: "week" } }
/** Fifteen people, three shown. The menu has a search box. */
export const WeekFifteenPeopleThreeShown: Story = {
  name: "Week, fifteen people, three shown",
  args: { world: teamWorld(15), hidden: Array.from({ length: 12 }, (_, i) => `person_${["sam", "ola", "wes", "cora", "ivy", "gus", "mina", "tom", "ana", "dev", "eli", "fay"][i]}`) },
  play: async () => {
    await expect(await body().findByRole("button", { name: "People: 3 of 15" })).toBeInTheDocument()
  },
}
export const DayFivePeople: Story = { name: "Day, five people", args: { world: teamWorld(5), view: "day", day: "2026-11-18" } }

/** The Week's day head is the day and one chip. Hover or focus it for the towns, open time and driving; press it to open the day. */
export const WeekHeaderCard: Story = {
  name: "Week header card",
  play: async ({ canvasElement }) => {
    const head = (await within(canvasElement).findAllByRole("button", { name: /Open the day$/ }))[2]!
    await userEvent.hover(head)
    await expect(await body().findAllByText(/open\./)).not.toHaveLength(0)
    await expect(document.querySelectorAll('[data-slot="day-head"] [data-slot="day-count"]').length).toBeGreaterThan(0)
  },
}

/** Day shows the towns and each person's open time and driving in its head, and "N min drive" between stops. Week shows neither. */
export const DayDriveLines: Story = {
  name: "Day: head and drive lines",
  args: { view: "day", day: "2026-11-18" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="drive-line"]').length).toBeGreaterThan(0)
    await expect(canvasElement.querySelector('[data-slot="day-head"][data-variant="day"]')).toHaveTextContent(/open/)
  },
}
export const WeekHasNoDriveLines: Story = {
  name: "Week: no drive lines",
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findAllByRole("button", { name: /Open the day$/ })).not.toHaveLength(0)
    await expect(canvasElement.querySelectorAll('[data-slot="drive-line"]')).toHaveLength(0)
  },
}

/** The Map's panel ends with each person's driving for the day shown. */
export const MapWithDriving: Story = {
  name: "Map with the day's driving",
  args: { panels: { map: true } },
  play: async () => {
    await expect(await body().findByRole("list", { name: "Driving" })).toBeInTheDocument()
  },
}

/** Nothing to reorder: Thursday's one stop with no set time already comes last in the best order, so there is no Reorder stops button. */
export const ReorderStopsNothingToReorder: Story = {
  name: "Reorder stops, nothing would change so no button",
  args: { view: "day", day: "2026-11-19" },
  play: async () => {
    await expect(await body().findByRole("button", { name: "People: Everyone" })).toBeInTheDocument()
    await expect(body().queryByRole("button", { name: "Reorder stops" })).not.toBeInTheDocument()
  },
}

// The phone pass (docs/plans/2026-11-26-scheduler-review-research.md): a phone opens on Day for today, as an agenda; Week keeps the clock for one person; two overlapping visits sit side by side.
export const DayOnePersonPhone: Story = {
  name: "Day, one person, agenda, phone",
  globals: PHONE,
  args: { hidden: ["person_hannah"], view: "day" },
  play: async () => {
    await expect(document.querySelector('[data-slot="day-agenda"]')).not.toBeNull()
    for (const row of document.querySelectorAll<HTMLElement>('[data-slot="agenda-row"] button')) await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(56)
  },
}
export const OpensOnTheDayPhone: Story = {
  name: "Opens on the day, phone",
  globals: PHONE,
  play: async () => {
    await expect(await body().findByRole("radio", { name: "Day" })).toBeChecked()
    await expect(document.querySelector('[data-slot="day-agenda"]')).not.toBeNull()
  },
}
export const WeekOnePersonOverlapPhone: Story = {
  name: "Week, one person, two overlapping visits side by side, phone",
  globals: PHONE,
  args: { hidden: ["person_hannah"], view: "week" },
  play: async () => {
    const [a, b] = [await body().findByRole("button", { name: /^Aspen Dr/ }), await body().findByRole("button", { name: /^Birch Ln/ })]
    const [ra, rb] = [a.getBoundingClientRect(), b.getBoundingClientRect()]
    await expect(Math.abs(ra.top - rb.top)).toBeLessThan(ra.height)
    await expect(ra.right <= rb.left + 1 || rb.right <= ra.left + 1).toBe(true)
  },
}
