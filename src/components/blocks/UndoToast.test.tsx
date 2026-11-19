import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { UndoToastProvider, useUndoToast } from "./UndoToast"

function Demo({ undo }: { undo: () => void }) {
  const toast = useUndoToast()
  return (
    <button type="button" onClick={() => toast("Marked done.", undo)}>
      Mark done
    </button>
  )
}

describe("UndoToast", () => {
  it("sits at the top of the screen, never along the bottom where a record panel's footer is", async () => {
    render(
      <UndoToastProvider>
        <Demo undo={() => undefined} />
      </UndoToastProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }))
    const toast = document.querySelector('[data-slot="undo-toast"]')!
    expect(toast.className).toMatch(/\btop-/)
    expect(toast.className).not.toMatch(/\bbottom-/)
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
  })

  it("runs the reverse on Undo and takes the toast away", async () => {
    const undo = vi.fn()
    render(
      <UndoToastProvider>
        <Demo undo={undo} />
      </UndoToastProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }))
    await userEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(undo).toHaveBeenCalledOnce()
    expect(document.querySelector('[data-slot="undo-toast"]')).toBeNull()
  })
})
