import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { SchedulePrototype } from "./SchedulePrototype"
import type { ProtoInitial } from "./use-schedule-prototype"
import { orderStory } from "./schedule-order-fixture"

// The Schedule prototype (docs/plans/2026-11-25-scheduler-design.md, sections 7 and 9) over the walkthrough's calendar: Ryan Garner and Hannah Garner, today Wednesday, Nov 18 2026, every
// visit read from its job page. The walkthrough's own Schedule is the way in (Admin walkthrough, clickable); these stories keep the states it cannot open directly: Week with both panels,
// Just moved, Not notified list, the Schedule dialog with the best times, Month, Empty week and the phone twins. A click on a block only selects it here (the walkthrough opens the job page).
// Each story opens in its state by doing what a person would do (a keyboard move, a click); the "toast stays" ones hold "Moved to ..." up (it closes after 10 seconds on its own).
// Phone stories are the same screen at 375: the day strip and one day's column, panels as sheets, no drag. Nothing is sent and nothing is saved.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Screens/Schedule prototype (Nov 25)",
  component: SchedulePrototype,
  parameters: { layout: "fullscreen", docs: { description: { component: "The Schedule over the walkthrough's calendar. Drag a visit, press Notify the customer, press Undo, open Unscheduled and Map together, press Schedule on a job with no day. See Start here: Scheduler (Nov 25)." } } },
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
  await userEvent.click((await body().findAllByRole("button", { name: label }))[0]!)
  await userEvent.click(await body().findByRole("menuitem", { name: item }))
}
const held: ProtoInitial = { toastSeconds: 0 }
const phone = (s: Story): Story => ({ ...s, name: `${s.name ?? ""}, phone`, globals: PHONE })

export const Week: Story = { name: "Week" }
export const WeekPhone: Story = phone(Week)

export const WeekBothPanelsOpen: Story = { name: "Week with both panels open", args: { panels: { unscheduled: true, map: true } } }
// on a phone the panels are sheets, one at a time: the last one opened is the one shown
export const WeekBothPanelsOpenPhone: Story = { ...phone(WeekBothPanelsOpen), args: { panels: { unscheduled: false, map: true } } }

export const DayTwoPeople: Story = { name: "Day, two people", args: { view: "day" } }
export const DayTwoPeoplePhone: Story = phone(DayTwoPeople)

export const Month: Story = { name: "Month", args: { view: "month" } }
export const MonthPhone: Story = phone(Month)

/** Willow Dr is lifted with Space, moved down one row (15 minutes) and dropped with Enter: "Moved to Wed, Nov 18, 8:15 am" with Notify the customer and Undo, and the visit is marked not notified. */
export const JustMoved: Story = {
  name: "Just moved (toast showing)",
  args: held,
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Willow Dr, Fall blowout/, 1)
    await expect(await body().findByText("Moved to Wed, Nov 18, 8:15 am")).toBeInTheDocument()
    await expect(await body().findByRole("button", { name: "Notify the customer" })).toBeInTheDocument()
  },
}
export const JustMovedPhone: Story = {
  ...phone(JustMoved),
  play: async () => {
    await menuAction("Actions for Willow Dr", "15 minutes longer")
    await expect(await body().findByText(/^Changed to 8:00 to 8:45 am/)).toBeInTheDocument()
  },
}

/** Notify the customer opens the one Send a message dialog, prefilled; nothing is sent until Send. */
export const MessageOpen: Story = {
  name: "Send a message open (Notify the customer)",
  args: held,
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Willow Dr, Fall blowout/, 1)
    await userEvent.click(await body().findByRole("button", { name: "Notify the customer" }))
    await expect(await body().findByRole("dialog", { name: "Send a message" })).toBeInTheDocument()
  },
}
export const MessageOpenPhone: Story = {
  ...phone(MessageOpen),
  play: async () => {
    await menuAction("Actions for Willow Dr", "15 minutes longer")
    await userEvent.click(await body().findByRole("button", { name: "Notify the customer" }))
    await expect(await body().findByRole("dialog", { name: "Send a message" })).toBeInTheDocument()
  },
}

/** A move, then "1 customer not notified" opens the Unscheduled panel on its Not notified tab, with Notify the customer, Don't notify and Notify all. */
export const NotNotifiedList: Story = {
  name: "Not notified list",
  play: async ({ canvasElement }) => {
    await keyboardMove(canvasElement, /^Willow Dr, Fall blowout/, 1)
    await userEvent.click(await body().findByRole("button", { name: /^\d+ customers? not notified$/ }))
    await expect(await body().findByRole("button", { name: "Notify all" })).toBeInTheDocument()
  },
}
export const NotNotifiedListPhone: Story = {
  ...phone(NotNotifiedList),
  play: async () => {
    await menuAction("Actions for Willow Dr", "15 minutes longer")
    await userEvent.click(await body().findByRole("button", { name: /^\d+ customers? not notified$/ }))
    await expect(await body().findByRole("button", { name: "Notify all" })).toBeInTheDocument()
  },
}

/** A block's menu, Move: the one Schedule dialog with the best times above its calendar. */
export const ScheduleDialogFromBlock: Story = {
  name: "Schedule dialog with best times (Move from a block)",
  args: { dialog: { kind: "schedule", id: "g-sam", job: false } },
  play: async () => {
    await expect(await body().findByRole("dialog", { name: "Move the visit" })).toBeInTheDocument()
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
    await expect(await body().findByRole("dialog", { name: "Schedule the job" })).toBeInTheDocument()
    await expect(await within(await body().findByRole("radiogroup", { name: "Openings" })).findAllByRole("radio", { checked: true })).toHaveLength(1)
  },
}
export const ScheduleFromUnscheduledRowPhone: Story = {
  ...phone(ScheduleFromUnscheduledRow),
  args: { panels: { unscheduled: true } },
}

/** Dropped on a place that breaks a rule: "Move the visit" lists what it breaks. */
export const MoveTheVisitDialog: Story = {
  name: "Move the visit (a place that breaks a rule)",
  args: { dialog: { kind: "confirm", action: { type: "move", id: "g-sam", to: { day: "2026-11-20", personId: "person_hannah", start: 13 * 60 } }, problems: ["Hannah is off 12 to 2 pm.", "Adds 25 min of driving."] } },
  play: async () => {
    await expect(await body().findByRole("dialog", { name: "Move the visit" })).toBeInTheDocument()
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

/** The first Unscheduled row is dragged onto Ryan's Thursday at 11:00: "Scheduled for Thu, Nov 19, 11:00 am", a bell on the new block, and the job leaves Unscheduled. */
export const DropFromUnscheduled: Story = {
  name: "Drop a row from Unscheduled",
  args: { panels: { unscheduled: true }, toastSeconds: 0 },
  play: async ({ canvasElement }) => {
    const row = await within(canvasElement).findByText("Andrea Dalton · Erie")
    const handle = row.closest("[data-unscheduled-id]")!.firstElementChild!
    const col = canvasElement.querySelector('[data-slot="time-grid-column"][data-day="2026-11-19"][data-person="person_ryan"]')!.getBoundingClientRect()
    const from = handle.getBoundingClientRect()
    const [x0, y0, x1, y1] = [from.x + 10, from.y + 10, col.x + 40, col.y + 3 * 56 + 10]
    pointer("pointerdown", handle, x0, y0)
    for (const f of [0.3, 0.7, 1]) { await pause(); pointer("pointermove", document, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f) }
    await pause()
    pointer("pointerup", document, x1, y1, 0)
    await expect(await body().findByText("Scheduled for Thu, Nov 19, 11:00 am")).toBeInTheDocument()
  },
}

export const EmptyWeek: Story = { name: "Empty week", args: { day: "2026-12-28" } }
export const EmptyWeekPhone: Story = phone(EmptyWeek)

export const ShortcutsHelp: Story = {
  name: "Shortcuts help",
  play: async () => {
    await userEvent.keyboard("?")
    await expect(await body().findByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument()
  },
}

/** Thursday has a stop with no set time: Order the day previews where each stop would go and the driving it saves, then one change with Undo and no message to anyone. */
export const OrderTheDay: Story = {
  name: "Order the day",
  // Ryan has three stops with no set time on Thursday in a poor order (Longmont, Broomfield, Firestone): ordering slots them into the gaps and saves driving
  args: { view: "day", day: "2026-11-19", toastSeconds: 0, state: orderStory() },
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "Order the day" }))
    const dialog = within(await body().findByRole("dialog", { name: "Order the day" }))
    await expect(dialog.getByRole("region", { name: "Now" })).toBeInTheDocument()
    await expect(dialog.getByRole("region", { name: "Ordered" })).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Order the day" }))
    await expect(await body().findByText(/^Ordered Thu, Nov 19, saves/)).toBeInTheDocument()
    await expect(body().queryByRole("button", { name: "Notify the customer" })).not.toBeInTheDocument()
  },
}
export const OrderTheDayPhone: Story = phone(OrderTheDay)

/** Schedule all N: where each job with no day would go, from the same rule; each row can be removed and the rest are planned again. */
export const ScheduleAll: Story = {
  name: "Schedule all",
  args: { panels: { unscheduled: true }, toastSeconds: 0 },
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "Schedule all 4" }))
    const dialog = within(await body().findByRole("dialog", { name: "Schedule all 4" }))
    await expect(dialog.getAllByRole("listitem")).toHaveLength(4)
    await userEvent.click(dialog.getByRole("button", { name: "Remove Andrea Dalton" }))
    await expect(await body().findByRole("dialog", { name: "Schedule all 3" })).toBeInTheDocument()
    await userEvent.click(await body().findByRole("button", { name: "Schedule and notify the customer" }))
    await expect(await body().findByText(/^Scheduled 3 jobs/, undefined, { timeout: 4000 })).toBeInTheDocument()
  },
}
// on a phone the Unscheduled sheet is open, so the toast waits for it: the phone twin stops at the preview
export const ScheduleAllPhone: Story = {
  ...phone(ScheduleAll),
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "Schedule all 4" }))
    await expect(await body().findByRole("dialog", { name: "Schedule all 4" })).toBeInTheDocument()
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
    await expect(await body().findByRole("dialog", { name: "Move the visit" })).toBeInTheDocument()
    await expect(document.querySelector('[data-slot="day-times"] [role="radiogroup"]')).not.toBeNull()
  },
}

/** One person hidden with the control in the toolbar: Week and Day lose their column, Month's counts, the Map and the List follow, and the other chip cannot be turned off. */
export const OnePersonHidden: Story = {
  name: "One person hidden",
  args: { hidden: ["person_hannah"], panels: { map: true } },
  play: async () => {
    const hannah = await body().findByRole("button", { name: "Show Hannah Garner's visits" })
    await expect(hannah).toHaveAttribute("aria-pressed", "false")
    await expect(await body().findByRole("button", { name: "Show Ryan Garner's visits" })).toHaveAttribute("aria-disabled", "true")
    await expect(document.querySelectorAll('[data-slot="day-head"]').length).toBeGreaterThan(0)
    await expect(document.querySelector('[data-slot="day-head"]')).not.toHaveTextContent("Hannah")
  },
}
export const OnePersonHiddenPhone: Story = { ...phone(OnePersonHidden), args: { hidden: ["person_hannah"] }, play: async () => {
  await expect(await body().findByRole("button", { name: "Show Hannah Garner's visits" })).toHaveAttribute("aria-pressed", "false")
} }
export const TwoPeopleShown: Story = {
  name: "Two people shown",
  play: async () => {
    await userEvent.click(await body().findByRole("button", { name: "Show Hannah Garner's visits" }))
    await expect(await body().findByRole("button", { name: "Show Hannah Garner's visits" })).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(await body().findByRole("button", { name: "Show Hannah Garner's visits" }))
  },
}
export const TwoPeopleShownPhone: Story = phone(TwoPeopleShown)

/** Nothing to reorder: Thursday's one stop with no set time already comes last in the best order, so there is no Order the day button. */
export const OrderTheDayNothingToReorder: Story = {
  name: "Order the day, nothing would change so no button",
  args: { view: "day", day: "2026-11-19" },
  play: async () => {
    await expect(await body().findByRole("button", { name: "Show Hannah Garner's visits" })).toBeInTheDocument()
    await expect(body().queryByRole("button", { name: "Order the day" })).not.toBeInTheDocument()
  },
}
