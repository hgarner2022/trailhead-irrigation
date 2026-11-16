import { describe, expect, it } from "vitest"
import { crewSummary, twoHourWindow } from "./summary"

const v = (personName: string, town: string) => ({ personName, town })

describe("crewSummary", () => {
  it("says where each person is and how many, then what moved and what is unmarked, with nothing about approvals", () => {
    const tomorrow = [...Array(4).fill(v("Ryan Garner", "Erie")), ...Array(3).fill(v("Ryan Garner", "Firestone")), ...Array(5).fill(v("Second truck", "Longmont"))]
    const text = crewSummary({ tomorrow, movedInJobber: 3, notMarkedDone: 2 })
    expect(text).toBe("Tomorrow: 12 visits, Ryan Garner in Erie and Firestone (7), Second truck in Longmont (5). 3 moved in Jobber this week. 2 visits from yesterday not marked done.")
    expect(text).not.toMatch(/approv|propos/i)
  })
  it("leaves out a part with nothing in it and handles one visit and an empty day", () => {
    expect(crewSummary({ tomorrow: [v("Second truck", "Erie")], movedInJobber: 0, notMarkedDone: 1 })).toBe("Tomorrow: 1 visit, Second truck in Erie (1). 1 visit from yesterday not marked done.")
    expect(crewSummary({ tomorrow: [], movedInJobber: 0, notMarkedDone: 0 })).toBe("Tomorrow: nothing on the calendar.")
  })
  it("lists three towns with commas and an and", () => {
    expect(crewSummary({ tomorrow: [v("Ryan Garner", "Erie"), v("Ryan Garner", "Lafayette"), v("Ryan Garner", "Louisville")], movedInJobber: 0, notMarkedDone: 0 })).toContain("Erie, Lafayette and Louisville (3)")
  })
})

describe("twoHourWindow", () => {
  it("reads 8 to 10 am, 11 am to 1 pm and 3 to 5 pm", () => {
    expect([twoHourWindow("08:00"), twoHourWindow("11:30"), twoHourWindow("15:00")]).toEqual(["8 to 10 am", "11 am to 1 pm", "3 to 5 pm"])
  })
})
