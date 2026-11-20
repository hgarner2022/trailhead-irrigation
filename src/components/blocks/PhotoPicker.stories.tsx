import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { PhotoPicker, type PickedPhoto } from "./PhotoPicker"

// "Add photos": a real file input behind the button, thumbnails with Remove, one count line. The sample button is the prototype's way to see the state without a file.
const SAMPLES: PickedPhoto[] = [
  { name: "zone-3-head.jpg", src: "/images/sprinkler-spray-head-lawn.jpg" },
  { name: "garden-bed.jpg", src: "/images/micro-spray-garden-bed.jpg" },
]

function Harness({ start = [] }: { start?: PickedPhoto[] }) {
  const [photos, setPhotos] = useState<PickedPhoto[]>(start)
  return (
    <div className="max-w-xl container-padding-x py-8">
      <PhotoPicker photos={photos} onAdd={(p) => setPhotos((prev) => [...prev, ...p])} onRemove={(n) => setPhotos((prev) => prev.filter((p) => p.name !== n))} samples={SAMPLES} />
    </div>
  )
}

const meta = { title: "Blocks/PhotoPicker", component: Harness, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add 2 sample photos" }))
    await expect(await canvas.findByText(/2 photos added/)).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Remove garden-bed.jpg" }))
    await expect(await canvas.findByText(/1 photo added/)).toBeInTheDocument()
  },
}

export const WithPhotos: Story = { args: { start: SAMPLES } }

export const Phone: Story = { args: { start: SAMPLES }, globals: { viewport: { value: "phone", isRotated: false } } }
