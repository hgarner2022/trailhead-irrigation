import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { CheckoutFlow } from "./CheckoutFlow"
import type { CheckoutFields } from "./checkout-state"

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => sessionStorage.clear())

const answers: Partial<CheckoutFields> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie", access: "yes", today: "2026-11-12", zones: 8, firstName: "Andrea", email: "andrea@example.com", phone: "(970) 555-0123", termsAccepted: true }
const press = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }))

describe("validation that helps", () => {
  it("keeps Continue enabled, shows every contact problem at once and focuses the first one", () => {
    render(<CheckoutFlow season={2027} initialStep={5} prefill={{ ...answers, firstName: "", email: "andrea.example.com", phone: "" }} />)
    const button = screen.getByRole("button", { name: "Continue" })
    expect(button).toBeEnabled()
    press()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Who should we reach?")
    const name = screen.getByLabelText("First name")
    expect(name).toHaveFocus()
    for (const label of ["First name", "Email", "Phone"]) {
      const field = screen.getByLabelText(label)
      expect(field).toHaveAttribute("aria-invalid", "true")
      expect(field).toHaveAccessibleDescription(/\w/)
    }
    const summary = screen.getByRole("alert")
    expect(summary).toHaveTextContent("Check these before you continue: First name, Email, Phone.")
  })
  it("skips the summary for one problem and focuses that field", () => {
    render(<CheckoutFlow season={2027} initialStep={5} prefill={{ ...answers, phone: "12" }} />)
    press()
    expect(screen.getByLabelText("Phone")).toHaveFocus()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription("We need a ten-digit phone number for the day-of text.")
  })
  it("counts the terms box among the problems, names it in the summary and focuses it when it is the only one", () => {
    render(<CheckoutFlow season={2027} initialStep={5} prefill={{ ...answers, termsAccepted: false }} />)
    press()
    expect(screen.getByRole("checkbox", { name: /I accept the Season Pass terms/ })).toHaveFocus()
    expect(screen.getByText("Accept the terms to continue.")).toHaveClass("text-destructive")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
  it("tells the address step what is missing: the address, then the access answer", () => {
    render(<CheckoutFlow season={2027} />)
    press()
    expect(screen.getByRole("combobox", { name: "Street address" })).toHaveFocus()
    expect(screen.getByText("Pick your address from the list so we have it right.", { selector: "p[id]" })).toBeInTheDocument()
  })
  it("focuses the access question when only that is missing, and wires its message", () => {
    render(<CheckoutFlow season={2027} prefill={{ ...answers, access: null }} />)
    press()
    const first = screen.getAllByRole("button", { name: /^(Yes|No, I need)/ })[0]
    expect(first).toHaveFocus()
    expect(screen.getByRole("group", { name: /controller/ })).toHaveAccessibleDescription("Tell us whether we can get to the system without you.")
  })
  it("names the inputs", () => {
    render(<CheckoutFlow season={2027} initialStep={5} prefill={answers} />)
    expect(screen.getByLabelText("First name")).toHaveAttribute("name", "firstName")
    expect(screen.getByLabelText("Email")).toHaveAttribute("name", "email")
    expect(screen.getByLabelText("Phone")).toHaveAttribute("name", "phone")
  })
  it("keeps the action bar stuck to the bottom, padded for the phone's safe area, so Continue is always reachable", () => {
    render(<CheckoutFlow season={2027} initialStep={5} prefill={answers} />)
    const bar = document.querySelector('[data-slot="checkout-actions"]') as HTMLElement
    expect(bar).toHaveClass("sticky", "bottom-0")
    expect(bar.firstElementChild?.className).toContain("env(safe-area-inset-bottom)")
    expect(bar).toContainElement(screen.getByRole("button", { name: "Continue" }))
  })
})
