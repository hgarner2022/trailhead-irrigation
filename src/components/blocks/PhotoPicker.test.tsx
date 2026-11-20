import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { PhotoPicker, photoCount } from "./PhotoPicker"

const samples = [
  { name: "a.jpg", src: "/images/sprinkler-spray-head-lawn.jpg" },
  { name: "b.jpg", src: "/images/micro-spray-garden-bed.jpg" },
]

describe("PhotoPicker", () => {
  it("counts photos and says one or many", () => {
    expect(photoCount(1)).toBe("1 photo")
    expect(photoCount(2)).toBe("2 photos")
  })
  it("has a real file input, adds the samples once and removes a photo", async () => {
    const onAdd = vi.fn()
    const onRemove = vi.fn()
    const { rerender } = render(<PhotoPicker photos={[]} onAdd={onAdd} onRemove={onRemove} samples={samples} />)
    expect(screen.getByLabelText("Add photos")).toHaveAttribute("type", "file")
    await userEvent.click(screen.getByRole("button", { name: "Add 2 sample photos" }))
    expect(onAdd).toHaveBeenCalledWith(samples)
    rerender(<PhotoPicker photos={samples} onAdd={onAdd} onRemove={onRemove} samples={samples} />)
    expect(screen.getByText(/2 photos added/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Remove a.jpg" }))
    expect(onRemove).toHaveBeenCalledWith("a.jpg")
    // photos already added are not added twice
    await userEvent.click(screen.getByRole("button", { name: "Add 2 sample photos" }))
    expect(onAdd).toHaveBeenLastCalledWith([])
  })
})
