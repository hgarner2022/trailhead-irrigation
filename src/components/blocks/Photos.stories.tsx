import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import type { PhotoItem } from "@/lib/photos/types"
import { Photos, type PendingPhoto } from "./Photos"

// The pictures on one visit: the staff view with the "Show to customer" box, an upload on its way, one that failed, one that was too
// big, and the customer's view of the same visit. The images are inline SVG pictures, so the stories load nothing from a store.
const pic = (hue: number) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl(${hue} 35% 62%)"/><circle cx="200" cy="170" r="70" fill="hsl(${hue} 40% 82%)"/><rect y="290" width="400" height="110" fill="hsl(${hue} 30% 40%)"/></svg>`)}`
const photo = (n: number, over: Partial<PhotoItem> = {}): PhotoItem => ({
  id: `photo_${n}`, visitId: "v1", jobId: "j1", customerId: "c1", url: pic(100 + n * 40), contentType: "image/jpeg", bytes: 2_000_000,
  addedBy: "ryan@trailheadirrigation.com", addedByName: "Ryan Garner", byCustomer: false, shownToCustomer: n % 2 === 0, canRemove: true, createdAt: `2026-11-1${n}T17:00:00Z`, ...over,
})
const photos = [photo(1), photo(2), photo(3, { addedBy: "customer", addedByName: null, byCustomer: true, shownToCustomer: true, canRemove: false })]

const ok = async () => ({ ok: true as const })
const addOk = async (file: File) => ({ ok: true as const, photo: photo(9, { url: pic(10), createdAt: "2026-11-18T17:00:00Z", addedBy: "ryan@trailheadirrigation.com", id: `photo_${file.name}` }) })

const meta = {
  title: "Blocks/Photos",
  component: Photos,
  parameters: { layout: "padded" },
  args: { photos, onAdd: addOk, onShow: fn(ok), onRemove: fn(ok) },
} satisfies Meta<typeof Photos>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

/** Staff on a laptop: four across, who took each, a box to show it to the customer, Remove for the person who added it. */
export const Default: Story = {
  ...laptop,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Photos" })).toBeInTheDocument()
    await expect(canvas.getAllByRole("checkbox", { name: "Show to customer" })).toHaveLength(2)
    await expect(canvas.getByRole("button", { name: "Add photo" })).toBeInTheDocument()
    await expect(canvas.getByText("Added by the customer")).toBeInTheDocument()
  },
}

export const Empty: Story = { args: { photos: [] }, ...laptop, play: async ({ canvas }) => { await expect(await canvas.findByText("No photos yet.")).toBeInTheDocument() } }

/** On a phone: two across, and Add photo opens the camera. */
export const Phone: Story = { ...phone }
export const EmptyPhone: Story = { args: { photos: [] }, ...phone }

const uploading: PendingPhoto[] = [{ key: "u1", name: "IMG_2041.jpg", state: "uploading" }]
export const Uploading: Story = { args: { initialPending: uploading }, ...phone, play: async ({ canvas }) => { await expect(await canvas.findByRole("status")).toHaveTextContent("Uploading") } }
export const UploadingLaptop: Story = { args: { initialPending: uploading }, ...laptop }

const failed: PendingPhoto[] = [{ key: "f1", name: "IMG_2042.jpg", state: "problem", message: "Upload failed. Try again.", file: new File(["x"], "IMG_2042.jpg", { type: "image/jpeg" }) }]
export const Failed: Story = { args: { initialPending: failed }, ...phone, play: async ({ canvas }) => { await expect(await canvas.findByRole("alert")).toHaveTextContent("Upload failed. Try again.") } }
export const FailedLaptop: Story = { args: { initialPending: failed }, ...laptop }

const tooBig: PendingPhoto[] = [{ key: "b1", name: "IMG_2043.jpg", state: "problem", message: "That photo is over 10 MB." }]
export const TooBig: Story = { args: { initialPending: tooBig }, ...phone, play: async ({ canvas }) => { await expect(await canvas.findByText("That photo is over 10 MB.")).toBeInTheDocument(); await expect(canvas.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument() } }
export const TooBigLaptop: Story = { args: { initialPending: tooBig }, ...laptop }

/** The customer's own view: their photo and the staff photos marked for them; Remove only on their own, no box. */
export const CustomerView: Story = {
  args: { audience: "customer", photos: [photo(2, { addedBy: "staff", addedByName: null }), photo(3, { addedBy: "customer", addedByName: null, byCustomer: true, shownToCustomer: true, canRemove: true })], onShow: undefined },
  ...phone,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("checkbox")).not.toBeInTheDocument()
    await expect(canvas.getAllByRole("button", { name: "Remove" })).toHaveLength(1)
  },
}
export const CustomerViewLaptop: Story = { args: { ...CustomerView.args }, ...laptop }

/** The store has no token yet: the section says so and offers no Add. */
export const NotSetUp: Story = { args: { configured: false }, ...phone, play: async ({ canvas }) => { await expect(await canvas.findByText("Photos are not set up yet.")).toBeInTheDocument(); await expect(canvas.queryByRole("button", { name: "Add photo" })).not.toBeInTheDocument() } }
