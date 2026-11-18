import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RecordFooter } from "./RecordFooter"
import { FooterSlotContext } from "./record-slot"

const noop = () => {}

describe("RecordFooter", () => {
  it("is one filled primary, outlines, More and a destructive ghost, in that order", () => {
    render(<RecordFooter primary={{ label: "Mark done", onClick: noop }} secondary={[{ label: "Move", onClick: noop }, { label: "Not done", onClick: noop }]} more={[{ label: "Edit", onClick: noop }]} destructive={{ label: "Cancel visit", onClick: noop }} />)
    const names = screen.getAllByRole("button").map((b) => b.textContent)
    expect(names).toEqual(["Mark done", "Move", "Not done", "More", "Cancel visit"])
    expect(screen.getByRole("button", { name: "Mark done" })).toHaveClass("bg-primary-dark")
    expect(screen.getByRole("button", { name: "Move" })).toHaveClass("border")
    expect(screen.getByRole("button", { name: "Cancel visit" })).toHaveClass("ml-auto", "text-destructive")
  })

  it("never draws a third outline", () => {
    render(<RecordFooter secondary={[{ label: "One", onClick: noop }, { label: "Two", onClick: noop }, { label: "Three", onClick: noop }] as never} />)
    expect(screen.queryByRole("button", { name: "Three" })).toBeNull()
  })

  it("acts on a click and keeps the quiet ones under More", async () => {
    const edit = vi.fn()
    const done = vi.fn()
    render(<RecordFooter primary={{ label: "Mark done", onClick: done }} more={[{ label: "Edit", onClick: edit }]} />)
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }))
    expect(done).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "More" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }))
    expect(edit).toHaveBeenCalledTimes(1)
  })

  it("draws a link for an href and nothing for an empty footer", () => {
    const { container, rerender } = render(<RecordFooter primary={{ label: "Open job", href: "/admin/jobs?job=j1" }} />)
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=j1")
    rerender(<RecordFooter />)
    expect(container.querySelectorAll("button, a")).toHaveLength(0)
  })

  it("leaves a place for a primary the body draws, and hands the panel its element", () => {
    const setElement = vi.fn()
    render(
      <FooterSlotContext.Provider value={{ element: null, setElement }}>
        <RecordFooter slot />
      </FooterSlotContext.Provider>,
    )
    expect(setElement).toHaveBeenCalledWith(document.querySelector('[data-slot="record-footer-slot"]'))
  })
})
