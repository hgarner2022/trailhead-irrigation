import { describe, expect, it } from "vitest"
import { sectionOf } from "./section"

describe("sectionOf", () => {
  it("lights Home for the admin root and for a path it does not know", () => {
    expect(sectionOf("/admin")).toBe("home")
    expect(sectionOf("/admin/")).toBe("home")
    expect(sectionOf("/admin/nowhere")).toBe("home")
    expect(sectionOf(null)).toBe("home")
  })
  it("lights the section a path is under", () => {
    expect(sectionOf("/admin/schedule")).toBe("schedule")
    expect(sectionOf("/admin/passes?pass=p1")).toBe("passes")
    expect(sectionOf("/admin/revenue")).toBe("revenue")
    expect(sectionOf("/admin/customers/abc")).toBe("customers")
    expect(sectionOf("/admin/settings")).toBe("settings")
  })
})
