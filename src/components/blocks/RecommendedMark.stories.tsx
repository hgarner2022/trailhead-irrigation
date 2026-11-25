import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { DayCalendar } from "./DayCalendar"
import { RecommendedMark, recommendedChip, type RecommendedLook } from "./RecommendedMark"
import { fixtureCalendarDays, type DayTimePick } from "@/lib/booking/day-time"
import { cn } from "@/lib/utils"

// The customer's day-and-time step with ONE time marked (docs/plans/2026-11-25-scheduler-design.md, 7.12). The mark never says why. Three looks for the owner to choose between,
// each on the same time button: A the word "Recommended" under the time, B a star in the corner, C an outline with "Suggested" above. The app has no dark theme, so the candidates are shown on the
// cream page and, in the "OnNavy" story, on the navy background the Storybook toolbar offers. Default look until chosen: A.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const offers = fixtureCalendarDays(120, "2026-11-30", "2026-12-11")
const DAY = "2026-11-30"

function Step({ look, recommended = true }: { look: RecommendedLook; recommended?: boolean }) {
  const [pick, setPick] = useState<DayTimePick>({ day: DAY, start: null })
  return <DayCalendar offers={offers} value={pick} onChange={setPick} legend="Pick your day" headingLevel={3} recommendedStart={recommended ? "10:30" : null} recommendedDay={DAY} recommendedLook={look} />
}

const meta = {
  title: "Blocks/Scheduler/RecommendedMark",
  component: Step,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { look: "A" },
  render: (args) => (
    <div className="mx-auto max-w-xl p-4 md:p-8">
      <Step {...args} />
    </div>
  ),
} satisfies Meta<typeof Step>
export default meta
type Story = StoryObj<typeof meta>

/** Look A, the design's recommendation: the word under the time. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("Recommended")).toHaveLength(1)
    await expect(canvas.getByRole("radio", { name: /10:30 am/ })).toBeInTheDocument()
  },
}
export const Phone: Story = { globals: PHONE }

/** No time is marked (nothing is the best): the step looks as it did before. */
export const Empty: Story = { args: { recommended: false } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }

/** A candidate beside the others: the same time button three ways. Words, outline and star only; none says why. */
function Candidate({ look, title, name }: { look: RecommendedLook; title: string; name: string }) {
  return (
    <section aria-label={title} className="min-w-0 rounded-lg border border-border bg-card p-4">
      <h2 className="font-display text-xl text-navy">{title}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{`Read aloud as "${name}"`}</p>
      <div className="grid grid-cols-3 gap-2">
        {["9:00 am", "10:30 am", "12:00 pm"].map((time) => {
          const marked = time === "10:30 am"
          return (
            <span key={time} className={cn("relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg border border-border bg-background px-2 py-2 text-center text-navy", marked && recommendedChip(look))}>
              {marked && <RecommendedMark look={look} position="before" />}
              <span className="text-base font-semibold tabular-nums">{time}</span>
              {marked && <RecommendedMark look={look} position="after" />}
            </span>
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
        <span className="flex min-h-11 items-center justify-center rounded-lg border border-border bg-background text-base font-semibold text-navy">9:00 am</span>
        <span className={cn("relative flex min-h-11 flex-col items-center justify-center rounded-lg border border-navy bg-navy px-2 py-2 text-white", recommendedChip(look, true))}>
          <RecommendedMark look={look} position="before" checked />
          <span className="text-base font-semibold tabular-nums">10:30 am</span>
          <RecommendedMark look={look} position="after" checked />
        </span>
        <span className="flex min-h-11 items-center justify-center rounded-lg border border-border bg-background text-base font-semibold text-navy">12:00 pm</span>
      </div>
      <p aria-hidden className="mt-1 text-xs text-muted-foreground">The second row is the same time once it is chosen.</p>
    </section>
  )
}

function Candidates() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-3 md:p-8">
      <Candidate look="A" title="A: the word" name="Recommended" />
      <Candidate look="B" title="B: a star" name="Recommended time" />
      <Candidate look="C" title="C: an outline" name="Suggested time" />
    </div>
  )
}

/** The owner's choice: A, B and C side by side on the same time button, 1280. */
export const RecommendedMarkCandidates: Story = {
  render: () => <Candidates />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Recommended time" })).toBeInTheDocument()
    await expect(canvas.getAllByText("Recommended").length).toBeGreaterThan(0)
    await expect(canvas.getAllByText("Suggested").length).toBeGreaterThan(0)
  },
}
export const RecommendedMarkCandidatesPhone: Story = { render: () => <Candidates />, globals: PHONE }

/** The three looks on the navy page background. */
export const RecommendedMarkCandidatesOnNavy: Story = { render: () => <Candidates />, parameters: { backgrounds: { default: "navy" } } }

/** Looks B and C inside the real step, so the whole calendar is seen with each. */
export const LookBInTheStep: Story = { args: { look: "B" } }
export const LookCInTheStep: Story = { args: { look: "C" } }
export const LookBInTheStepPhone: Story = { args: { look: "B" }, globals: PHONE }
export const LookCInTheStepPhone: Story = { args: { look: "C" }, globals: PHONE }
