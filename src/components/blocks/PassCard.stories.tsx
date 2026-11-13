import { useRef } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { toPng } from "html-to-image"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { Button } from "@/components/ui/button"
import { PassCard } from "./PassCard"

// passes[0] is Andrea in Erie with the turn-on done and the blowout preferred
// for mid October; passes[1] is Reese in Firestone.
const passes = snapshot.passes as Pass[]
const active = passes[0]
const allDone: Pass = {
  ...passes[1],
  visits: passes[1].visits.map((v, i) => ({
    ...v,
    scheduledAt: v.scheduledAt ?? ["2027-05-04T16:00:00Z", "2027-07-13T15:00:00Z", "2027-10-12T16:00:00Z"][i],
    completedAt: ["2027-05-04T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-12T16:40:00Z"][i],
    chargedAt: ["2027-05-04T17:12:00Z", "2027-07-13T16:07:00Z", "2027-10-12T16:42:00Z"][i],
  })),
}
const cancelled: Pass = { ...passes[1], status: "cancelled" }

const meta = {
  title: "Blocks/PassCard",
  component: PassCard,
  parameters: { layout: "centered" },
  args: { pass: active },
} satisfies Meta<typeof PassCard>
export default meta
type Story = StoryObj<typeof meta>

/** The card with a plain download button under it, so Hannah can save a PNG. */
function Downloadable(props: React.ComponentProps<typeof PassCard>) {
  const wrap = useRef<HTMLDivElement>(null)
  const save = async () => {
    const card = wrap.current?.querySelector<HTMLElement>('[data-slot="pass-card"]')
    if (!card) return
    const url = await toPng(card, { pixelRatio: 2, cacheBust: true })
    const link = document.createElement("a")
    link.href = url
    link.download = `${props.pass.number}.png`
    link.click()
  }
  return (
    <div ref={wrap} className="flex w-[640px] max-w-full flex-col items-start gap-4">
      <PassCard {...props} />
      <Button variant="outline" onClick={save}>
        Save as image
      </Button>
    </div>
  )
}

export const Full: Story = {
  render: (args) => <Downloadable {...args} />,
}

export const Holo: Story = {
  args: { art: "holo" },
}

export const Compare: Story = {
  render: (args) => (
    <div className="grid w-[1200px] max-w-full gap-8 md:grid-cols-2">
      <figure className="flex flex-col gap-3">
        <PassCard {...args} art="flat" />
        <figcaption className="text-sm text-muted-foreground">Flat art with the moving sheen</figcaption>
      </figure>
      <figure className="flex flex-col gap-3">
        <PassCard {...args} art="holo" />
        <figcaption className="text-sm text-muted-foreground">Holographic art with a lighter sheen</figcaption>
      </figure>
    </div>
  ),
}

export const Thumb: Story = {
  args: { size: "thumb" },
}

export const ThumbCancelled: Story = {
  args: { size: "thumb", pass: cancelled },
}

export const Static: Story = {
  args: { interactive: false },
}

export const AllDone: Story = {
  args: { pass: allDone },
}

export const Cancelled: Story = {
  args: { pass: cancelled },
}

export const InEmail: Story = {
  args: { art: "holo", interactive: false },
  render: (args) => (
    <div className="w-[664px] max-w-full rounded-lg bg-background p-8 shadow-sm">
      <p className="font-display text-3xl text-navy">Your season is reserved</p>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">This is how the card sits in the confirmation email, with the sheen fixed.</p>
      <div className="w-[600px] max-w-full">
        <PassCard {...args} />
      </div>
    </div>
  ),
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px]">
      <PassCard {...args} />
    </div>
  ),
}
