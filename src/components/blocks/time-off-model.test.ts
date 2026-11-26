import { describe, expect, it } from "vitest"
import { timeOffProblems, TIME_CHOICES, type TimeOffValue } from "./time-off-model"

const base: TimeOffValue = { personId: "p", allDay: false, from: "2026-12-04", to: "2026-12-04", startTime: "13:00", endTime: "15:00", note: "" }

describe("timeOffProblems", () => {
  it("accepts a span inside one day", () => expect(timeOffProblems(base)).toEqual({}))
  it("refuses an end before the start on one day, and ignores the times when all day", () => {
    expect(timeOffProblems({ ...base, endTime: "12:00" }).endTime).toBeTruthy()
    expect(timeOffProblems({ ...base, endTime: "12:00", allDay: true })).toEqual({})
  })
  it("refuses a last day before the first", () => expect(timeOffProblems({ ...base, to: "2026-12-03" }).to).toBeTruthy())
  it("lets a span over several days have any times", () => expect(timeOffProblems({ ...base, to: "2026-12-05", endTime: "09:00" })).toEqual({}))
  it("offers half hours from 6:00 am to 8:00 pm", () => {
    expect(TIME_CHOICES[0]).toEqual({ value: "06:00", label: "6:00 am" })
    expect(TIME_CHOICES.at(-1)).toEqual({ value: "20:00", label: "8:00 pm" })
  })
})
