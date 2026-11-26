import { useCallback, useRef, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { PeekAnchor } from "./PeekAnchor"

// The card the visit peek rides in: beside the block that was clicked, 8 px away, to its right or (with no room) its left, kept inside the boundary. Three blocks in a boundary box.
const meta = { title: "Blocks/Scheduler/PeekAnchor", component: PeekAnchor, parameters: { layout: "padded" }, globals: { viewport: { value: "laptop", isRotated: false } } } satisfies Meta<typeof PeekAnchor>
export default meta
type Story = StoryObj<typeof meta>

const SPOTS = [
  { id: "first", label: "First column", style: { left: 8, top: 8 } },
  { id: "last", label: "Last column", style: { right: 8, top: 120 } },
  { id: "bottom", label: "Bottom", style: { left: 300, bottom: 8 } },
]

function Demo() {
  const [open, setOpen] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const find = useCallback((id: string) => box.current?.querySelector<HTMLElement>(`[data-spot="${id}"]`) ?? null, [])
  return (
    <div ref={box} className="relative h-[28rem] w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-background">
      {SPOTS.map((s) => (
        <button key={s.id} type="button" data-spot={s.id} style={s.style} onClick={() => setOpen(s.id)} className="absolute h-16 w-28 cursor-pointer rounded-md bg-primary/10 text-left text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {s.label}
        </button>
      ))}
      {open && (
        <PeekAnchor anchorId={open} find={find} boundary={box.current} onClose={() => setOpen(null)}>
          <aside aria-label="Peek" className="w-full rounded-lg border border-border bg-background p-4 text-sm text-navy">Peek for {open}. Another click swaps it in place.</aside>
        </PeekAnchor>
      )}
    </div>
  )
}

export const Beside: Story = {
  render: () => <Demo />,
  args: { anchorId: "", find: () => null, boundary: null, onClose: () => {}, children: null },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(c.getByRole("button", { name: "First column" }))
    const card = await waitFor(() => { const e = document.querySelector<HTMLElement>('[data-slot="peek-anchor"]'); if (!e) throw new Error("no card"); return e })
    await waitFor(() => expect(card).toHaveAttribute("data-side", "right"))
    await userEvent.click(c.getByRole("button", { name: "Last column" }))
    await waitFor(() => expect(document.querySelector('[data-slot="peek-anchor"]')).toHaveAttribute("data-side", "left"))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(document.querySelector('[data-slot="peek-anchor"]')).toBeNull())
  },
}
