// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { PhotoItem } from "@/lib/photos/types"
import { Photos, photosAddedWords } from "./Photos"

afterEach(cleanup)

const photo = (n: number, over: Partial<PhotoItem> = {}): PhotoItem => ({
  id: `photo_${n}`, visitId: "v1", jobId: "j1", customerId: "c1", url: `/api/photos/photo_${n}`, contentType: "image/jpeg", bytes: 1000,
  addedBy: "ryan@example.com", addedByName: "Ryan Garner", byCustomer: false, shownToCustomer: false, canRemove: true, createdAt: "2026-11-17T17:00:00Z", ...over,
})
const file = (name = "a.jpg", type = "image/jpeg") => new File(["x"], name, { type })
const choose = (f: File) => fireEvent.change(screen.getByLabelText("Choose photos"), { target: { files: [f] } })

describe("Photos", () => {
  it("shows the empty words and an Add photo button", () => {
    render(<Photos photos={[]} onAdd={vi.fn()} />)
    expect(screen.getByText("No photos yet.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add photo" })).toBeTruthy()
  })

  it("says photos are not set up and offers no Add", () => {
    render(<Photos photos={[]} configured={false} onAdd={vi.fn()} />)
    expect(screen.getByText("Photos are not set up yet.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Add photo" })).toBeNull()
  })

  it("opens the camera on a phone for staff and not for the customer", () => {
    const { unmount } = render(<Photos photos={[]} onAdd={vi.fn()} />)
    expect(screen.getByLabelText("Choose photos").getAttribute("capture")).toBe("environment")
    unmount()
    render(<Photos photos={[]} audience="customer" onAdd={vi.fn()} />)
    expect(screen.getByLabelText("Choose photos").hasAttribute("capture")).toBe(false)
  })

  it("shows who took each photo and a Show to customer box only on staff's own photos", () => {
    render(<Photos photos={[photo(1), photo(2, { addedBy: "customer", addedByName: null, byCustomer: true, canRemove: false })]} />)
    expect(screen.getAllByRole("checkbox")).toHaveLength(1)
    expect(screen.getByText("Added by the customer")).toBeTruthy()
    expect(screen.getByText(/Ryan · Nov 17/)).toBeTruthy()
  })

  it("flips the box and calls onShow, then puts it back and says why when refused", async () => {
    const onShow = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, message: "Photo not found" })
    render(<Photos photos={[photo(1)]} onShow={onShow} />)
    const box = screen.getByRole("checkbox", { name: "Show to customer" }) as HTMLInputElement
    fireEvent.click(box)
    await waitFor(() => expect(onShow).toHaveBeenCalledWith("photo_1", true))
    expect(box.checked).toBe(true)
    fireEvent.click(box)
    await waitFor(() => expect(box.checked).toBe(true))
    expect((await screen.findByRole("alert")).textContent).toBe("Photo not found")
  })

  it("uploads a file as a tile that says Uploading, then shows the photo", async () => {
    let finish: (v: { ok: true; photo: PhotoItem }) => void = () => {}
    const onAdd = vi.fn(() => new Promise<{ ok: true; photo: PhotoItem }>((r) => (finish = r)))
    render(<Photos photos={[]} onAdd={onAdd} />)
    choose(file())
    expect((await screen.findByRole("status")).textContent).toBe("Uploading")
    finish({ ok: true, photo: photo(5) })
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull())
    expect(document.querySelector('[data-photo-id="photo_5"]')).toBeTruthy()
  })

  it("says Upload failed with Try again, which sends the same file once more", async () => {
    const onAdd = vi.fn().mockResolvedValueOnce({ ok: false, message: "Upload failed. Try again." }).mockResolvedValueOnce({ ok: true, photo: photo(6) })
    render(<Photos photos={[]} onAdd={onAdd} />)
    choose(file("b.jpg"))
    expect((await screen.findByRole("alert")).textContent).toBe("Upload failed. Try again.")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(2))
    expect(onAdd.mock.calls[1]![0]).toBe(onAdd.mock.calls[0]![0])
    await waitFor(() => expect(document.querySelector('[data-photo-id="photo_6"]')).toBeTruthy())
  })

  it("says That photo is over 10 MB with no Try again, and Dismiss clears it", async () => {
    const onAdd = vi.fn().mockResolvedValue({ ok: false, message: "That photo is over 10 MB." })
    render(<Photos photos={[]} onAdd={onAdd} />)
    choose(file("c.jpg"))
    expect((await screen.findByRole("alert")).textContent).toBe("That photo is over 10 MB.")
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("asks before removing, then hides the photo", async () => {
    const onRemove = vi.fn().mockResolvedValue({ ok: true })
    render(<Photos photos={[photo(1)]} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    fireEvent.click(await screen.findByRole("button", { name: "Remove photo" }))
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("photo_1"))
    await waitFor(() => expect(document.querySelector('[data-photo-id="photo_1"]')).toBeNull())
  })

  it("offers Remove only where the photo says it may be removed", () => {
    render(<Photos photos={[photo(1, { canRemove: false })]} onRemove={vi.fn()} />)
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull()
  })

  it("tells staff when a shown photo reaches the customer", () => {
    const { rerender } = render(<Photos photos={[photo(1)]} />)
    expect(screen.getByText(/once the visit is Done/)).toBeTruthy()
    rerender(<Photos photos={[photo(1)]} visitDone />)
    expect(screen.getByText(/reaches the customer now/)).toBeTruthy()
  })

  it("has no box and no staff names in the customer view, and Remove only on their own", () => {
    render(<Photos audience="customer" photos={[photo(1, { addedBy: "staff", addedByName: null, canRemove: false }), photo(2, { addedBy: "customer", addedByName: null, byCustomer: true, canRemove: true })]} onRemove={vi.fn()} />)
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1)
    expect(screen.getByText(/Trailhead · Nov 17/)).toBeTruthy()
    expect(screen.getByText(/You · Nov 17/)).toBeTruthy()
    expect(document.body.textContent).not.toContain("ryan@example.com")
  })

  it("words the Done step's count", () => {
    expect(photosAddedWords(0)).toBeNull()
    expect(photosAddedWords(1)).toBe("1 photo added")
    expect(photosAddedWords(2)).toBe("2 photos added")
  })
})
