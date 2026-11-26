import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { FindATime, type FindATimeProps } from "./FindATime"
import type { OpeningSort } from "./find-a-time-model"
import { FORCED, OPENINGS } from "./scheduler-panels-fixtures"

// Find a time inside New job, at 375 and 1280. Each state has a 1280 story and a 375 twin. The harness holds the sort, the pick and the tick like the screen does.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Harness({ initialSort = "recommended", initialPick = null, ...args }: FindATimeProps & { initialSort?: OpeningSort; initialPick?: string | null }) {
  const [sort, setSort] = useState<OpeningSort>(initialSort)
  const [picked, setPicked] = useState<string | null>(initialPick)
  const [ticked, setTicked] = useState(false)
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <FindATime {...args} sort={sort} onSort={setSort} selectedId={picked} onPick={(r) => setPicked(r.id)} forcedTicked={ticked} onForcedTicked={setTicked} />
    </div>
  )
}

const meta = {
  title: "Blocks/Scheduler/FindATime",
  component: Harness,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { state: "results", openings: OPENINGS, forced: FORCED, sort: "recommended", onSort: () => {}, onPick: () => {}, estimated: true, onFind: fn() },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** Five openings, the best one marked, the least-driving sort one tap away, forced rows folded. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const first = canvas.getAllByRole("radio").filter((r) => r.getAttribute("data-slot") === "opening")[0]!
    await expect(first).toHaveTextContent("Recommended")
    await expect(first).toHaveTextContent("Next to a Longmont visit")
    await userEvent.click(canvas.getByRole("radio", { name: "Soonest" }))
    await expect(canvas.getAllByRole("radio").filter((r) => r.getAttribute("data-slot") === "opening")[0]).toHaveTextContent("Mon, Nov 30")
  },
}
export const Phone: Story = { globals: PHONE }

/** No address yet: the button is off and says what to add. */
export const Empty: Story = { args: { state: "no-address", openings: [], forced: [] } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }

export const Searching: Story = { args: { state: "searching", openings: [], forced: [] } }
export const SearchingPhone: Story = { ...Searching, globals: PHONE }

export const SoonestFirst: Story = { args: { initialSort: "soonest" } }
export const SoonestFirstPhone: Story = { ...SoonestFirst, globals: PHONE }

export const LeastDrivingFirst: Story = { args: { initialSort: "least-driving" } }

/** One row chosen: it is outlined and the calendar and map behind it light up. */
export const RowPicked: Story = { args: { initialPick: "o-3" } }
export const RowPickedPhone: Story = { ...RowPicked, globals: PHONE }

/** "Show all times (3 more)" opens the rows that break a rule, greyed with the engine's words. */
export const ForcedRowsShown: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show all times (3 more)" }))
    await expect(canvas.getByText("Ryan has Dry Creek Rd at 3:00 pm.")).toBeInTheDocument()
  },
}
export const ForcedRowsShownPhone: Story = { ...ForcedRowsShown, globals: PHONE }

/** A forced row chosen: the tick "Book it anyway" appears under the list. */
export const ForcedRowPicked: Story = {
  args: { initialPick: "f-2" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show all times (3 more)" }))
    await expect(canvas.getByRole("checkbox", { name: "Book it anyway" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("checkbox", { name: "Book it anyway" }))
    await expect(canvas.getByRole("checkbox", { name: "Book it anyway" })).toBeChecked()
  },
}
export const ForcedRowPickedPhone: Story = { ...ForcedRowPicked, globals: PHONE }

/** Drive times are the straight-line estimate until a road lookup answers; this is the answered state, with no grey note. */
export const RoadTimes: Story = { args: { estimated: false } }

/** The road lookup could not answer: the rows use the straight-line estimate and say "Drive times are estimates." once above the list. */
export const RoadLookupFailed: Story = {
  args: { estimated: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Drive times are estimates.")).toBeInTheDocument()
    await expect(canvas.getAllByText(/\+\d+ min driving/).length).toBeGreaterThan(0)
  },
}

export const NoOpenings: Story = { args: { state: "none", openings: [], forced: [], noneBefore: "Nov 30" } }
export const NoOpeningsPhone: Story = { ...NoOpenings, globals: PHONE }

export const OutsideTheSixTowns: Story = { args: { state: "outside", openings: [], forced: [] } }
export const OutsideTheSixTownsPhone: Story = { ...OutsideTheSixTowns, globals: PHONE }
