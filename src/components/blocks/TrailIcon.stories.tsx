import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { TRAIL_ICONS, TrailIcon, type TrailIconName } from "./TrailIcon"

// The customer's zero-state drawings: the family side by side, each at the two sizes EmptyState uses, and the drawing frame by frame (the same CSS animation, held at a moment
// with a negative delay and paused), so the motion can be reviewed as stills. Reload a story to watch a drawing play: it plays once.

const WHERE: Record<TrailIconName, string> = {
  trail: "Nothing booked",
  signpost: "No visits yet",
  compass: "A page that cannot be opened",
  photo: "No photos yet",
  receipt: "No receipts yet",
}

const meta = {
  title: "Blocks/TrailIcon",
  component: TrailIcon,
  parameters: { layout: "padded" },
  args: { name: "trail" },
} satisfies Meta<typeof TrailIcon>
export default meta
type Story = StoryObj<typeof meta>

function Family() {
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-5">
      {TRAIL_ICONS.map((name, i) => (
        <li key={name} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center">
          <TrailIcon name={name} delay={i * 120} />
          <span className="type-meta text-muted-foreground">{WHERE[name]}</span>
        </li>
      ))}
    </ul>
  )
}

/** The five drawings, each drawing itself once, one after another. */
export const Default: Story = {
  render: () => <Family />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="trail-icon"]')).toHaveLength(TRAIL_ICONS.length)
    await expect(within(canvasElement).getByText("Nothing booked")).toBeInTheDocument()
  },
}

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, render: () => <Family /> }

/** The two sizes: 72px over a whole empty list, 56px in a row inside a section. On white, cream and stone. */
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      {(["bg-card", "bg-cream", "bg-stone"] as const).map((bg) => (
        <div key={bg} className={`flex flex-wrap items-end gap-6 rounded-lg border border-border p-4 ${bg}`}>
          {TRAIL_ICONS.map((name) => (
            <div key={name} className="flex items-end gap-3">
              <TrailIcon name={name} />
              <TrailIcon name={name} className="size-14" />
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}

const MOMENTS = [0, 150, 300, 450, 650, 1100]

/** Every drawing at six moments of its one play, left to right (0 to 1.1 s). */
export const FrameStrip: Story = {
  render: () => (
    <div data-frames className="space-y-3">
      <style>{`[data-frames] svg * { animation-play-state: paused !important; }`}</style>
      <div className="grid grid-cols-6 gap-2 type-caption text-muted-foreground">
        {MOMENTS.map((ms) => (
          <span key={ms} className="text-center">{`${ms} ms`}</span>
        ))}
      </div>
      {TRAIL_ICONS.map((name) => (
        <div key={name} className="grid grid-cols-6 gap-2 rounded-lg border border-border bg-card p-2">
          {MOMENTS.map((ms) => (
            <div key={ms} className="flex justify-center">
              <TrailIcon name={name} delay={-ms} className="size-12 sm:size-18" />
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}
export const FrameStripPhone: Story = { ...FrameStrip, globals: { viewport: { value: "phone", isRotated: false } } }
