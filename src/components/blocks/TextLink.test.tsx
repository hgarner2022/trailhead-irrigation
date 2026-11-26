import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TextLink, textLinkClass } from "./TextLink"

describe("TextLink", () => {
  it("is a link with an href and a button without one", () => {
    const onClick = vi.fn()
    render(
      <>
        <TextLink href="/admin/jobs?job=j1">Open job</TextLink>
        <TextLink onClick={onClick}>Edit</TextLink>
      </>,
    )
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=j1")
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("type", "button")
  })

  it("keeps tel:, mailto: and other sites as plain anchors and makes a new tab safe", () => {
    render(
      <>
        <TextLink href="tel:+19705550100">(970) 555-0100</TextLink>
        <TextLink href="https://dashboard.stripe.com/x" target="_blank">Open in Stripe</TextLink>
      </>,
    )
    expect(screen.getByRole("link", { name: "(970) 555-0100" })).toHaveAttribute("href", "tel:+19705550100")
    expect(screen.getByRole("link", { name: "Open in Stripe" })).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("is a 44px target alone and takes its own line inside a sentence", () => {
    render(
      <>
        <TextLink href="/a">Alone</TextLink>
        <TextLink href="/b" touch="inline">In a sentence</TextLink>
      </>,
    )
    expect(screen.getByRole("link", { name: "Alone" }).className).toContain("min-h-11")
    expect(screen.getByRole("link", { name: "In a sentence" }).className).not.toContain("min-h-11")
  })

  it("draws the shared solid focus ring, orange text and the underline rule", () => {
    const hover = textLinkClass()
    expect(hover).toContain("focus-visible:ring-ring")
    expect(hover).toContain("text-primary-dark")
    expect(hover).toContain("hover:underline")
    expect(textLinkClass({ underline: "always" })).toContain("underline decoration-primary/40")
    // inside a sentence a link is always underlined; alone it is underlined on hover
    expect(textLinkClass({ touch: "inline" })).toContain("underline decoration-primary/40")
    expect(textLinkClass({ touch: "inline", underline: "hover" })).not.toContain("decoration-primary/40")
    expect(textLinkClass({ tone: "destructive" })).toContain("text-destructive")
  })

  it("is a square 44px target for an icon", () => {
    render(<TextLink href="/x" icon aria-label="Open invoice">i</TextLink>)
    const link = screen.getByRole("link", { name: "Open invoice" })
    expect(link.className).toContain("size-11")
    expect(link.className).not.toContain("hover:underline")
  })
})
