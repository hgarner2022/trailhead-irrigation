import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Footer } from "./Footer"

// UX audit row 16: the footer is the crawlable copy so it stays, but its links are tappable: 44px below md, compact from md. Markup unchanged.
describe("Footer tap targets", () => {
  it("every link in the three link columns is 44px below md and back to compact from md", () => {
    render(<Footer />)
    for (const heading of ["Services", "Service areas", "Company"]) {
      const links = screen.getByRole("navigation", { name: heading }).querySelectorAll("a")
      expect(links.length).toBeGreaterThan(0)
      for (const l of links) {
        expect(l.className).toContain("min-h-11")
        expect(l.className).toContain("md:min-h-0")
      }
    }
  })
  it("the phone, the email and the legal links are 44px below md too", () => {
    render(<Footer />)
    for (const name of [/\(970\) 692-7270/, /ryan@trailheadirrigation\.com/, "Privacy Policy", "Terms & Conditions"]) {
      const link = screen.getByRole("link", { name })
      expect(link.className).toContain("min-h-11")
      expect(link.className).toContain("md:min-h-0")
    }
  })
})
