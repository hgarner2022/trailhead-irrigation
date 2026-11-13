import { describe, it, expect } from "vitest"
import { emailProblem, emailSuggestion } from "./email-check"

describe("emailProblem", () => {
  it("needs something, then something shaped like an email", () => {
    expect(emailProblem("")).toBe("We need an email for the receipt.")
    expect(emailProblem("   ")).toBe("We need an email for the receipt.")
    expect(emailProblem("andrea")).toBe("That email doesn't look complete.")
    expect(emailProblem("andrea@gmail")).toBe("That email doesn't look complete.")
    expect(emailProblem("andrea@gmail.c")).toBe("That email doesn't look complete.")
    expect(emailProblem("andrea@gmail.com")).toBeNull()
    expect(emailProblem(" first.last+tag@sub.example.co ")).toBeNull()
  })
})

describe("emailSuggestion", () => {
  it("offers the common domain for a slip of one or two characters", () => {
    expect(emailSuggestion("andrea@gmail.con")).toBe("andrea@gmail.com")
    expect(emailSuggestion("Andrea@Gmial.com")).toBe("andrea@gmail.com")
    expect(emailSuggestion("ryan@hotmal.com")).toBe("ryan@hotmail.com")
    expect(emailSuggestion("ryan@yaho.com")).toBe("ryan@yahoo.com")
    expect(emailSuggestion("ryan@comcast.ent")).toBe("ryan@comcast.net")
  })

  it("leaves a common domain, a known real one and anything far from the list alone", () => {
    expect(emailSuggestion("andrea@gmail.com")).toBeNull()
    expect(emailSuggestion("andrea@mail.com")).toBeNull()
    expect(emailSuggestion("andrea@example.com")).toBeNull()
    expect(emailSuggestion("andrea@trailheadirrigation.com")).toBeNull()
    expect(emailSuggestion("not an email")).toBeNull()
  })
})
