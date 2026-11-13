import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SignInCard } from "./SignInCard"

describe("SignInCard", () => {
  it("renders the admin form with one email field and one button", () => {
    render(<SignInCard audience="admin" />)
    expect(screen.getByRole("heading", { level: 1, name: "Sign in to admin" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByRole("button", { name: "Email me a link" })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })
  it("prefills the email", () => {
    render(<SignInCard audience="customer" email="andrea@example.com" />)
    expect(screen.getByLabelText("Email")).toHaveValue("andrea@example.com")
  })
  it("shows the denied line as an alert tied to the field", () => {
    render(<SignInCard audience="admin" state="denied" />)
    expect(screen.getByRole("alert")).toHaveTextContent("not on the admin list")
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
  })
  it("shows the sent note with the address and the ten minutes", () => {
    render(<SignInCard audience="customer" state="sent" email="andrea@example.com" retryHref="/account/sign-in" />)
    expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeInTheDocument()
    expect(screen.getByText("andrea@example.com")).toBeInTheDocument()
    expect(screen.getByText("The link works one time and expires in 10 minutes.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("link", { name: "Use a different email" })).toHaveAttribute("href", "/account/sign-in")
  })
})

it("says plainly when the link could not be sent", () => {
  render(<SignInCard audience="admin" state="failed" />)
  expect(screen.getByRole("alert")).toHaveTextContent("We couldn't send the link")
})
