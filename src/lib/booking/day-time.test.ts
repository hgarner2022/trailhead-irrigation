import { describe, expect, it } from "vitest"
import { SERVICES, QUOTE_SERVICES } from "./services"
import { clock12, dayAtTime, fixtureDayTimes, startDay } from "./day-time"

describe("day and time words", () => {
  it("writes a start on a 12 hour clock", () => {
    expect(clock12("09:00")).toBe("9:00 am")
    expect(clock12("12:30")).toBe("12:30 pm")
    expect(clock12("16:00")).toBe("4:00 pm")
  })
  it("joins a day and a time", () => {
    expect(dayAtTime("2027-04-20", "10:30")).toBe("Tuesday, April 20 at 10:30 am")
  })
})

describe("the fixture offer", () => {
  it("starts on the best day, marks one best time and sizes the times to the service", () => {
    const offers = fixtureDayTimes(120)
    expect(startDay(offers)).toBe("2027-04-20")
    expect(offers.flatMap((o) => o.times).filter((t) => t.best)).toHaveLength(1)
    const last = (m: number) => fixtureDayTimes(m)[4]!.times.at(-1)!.start
    expect(last(120)).toBe("15:00")
    expect(last(60)).toBe("16:00")
  })
})

describe("the services", () => {
  it("keeps quoted services out of the booking list", () => {
    expect(SERVICES.every((s) => s.kind !== "quote")).toBe(true)
    expect(QUOTE_SERVICES.every((s) => s.kind === "quote")).toBe(true)
    expect(SERVICES[0]!.kind).toBe("pass")
  })
})
