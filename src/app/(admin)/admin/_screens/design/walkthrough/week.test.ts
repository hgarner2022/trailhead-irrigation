import { describe, expect, it } from "vitest"
import { recommendedId, sortOpenings } from "@/components/blocks/find-a-time-model"
import { bestTimesFor, suggestionFor } from "../schedule-best-times"
import { dayShort } from "@/components/blocks/find-a-time-model"
import { changeWords, notToldList } from "../schedule-prototype-model"
import { initialState } from "../schedule-prototype-data"
import { jobView, rowOf } from "./jobs-data"
import { WEEK_VISITS, weekFacts } from "./week-visits"
import { buildWalkWorld } from "./visits-data"

describe("the walkthrough's week", () => {
  const world = buildWalkWorld()
  it("is full: 14 to 18 visits Monday to Friday across both people, with the mix the calendar needs", () => {
    const week = world.visits.filter((v) => v.day >= "2026-11-16" && v.day <= "2026-11-20")
    expect(week.length).toBeGreaterThanOrEqual(14)
    expect(week.length).toBeLessThanOrEqual(18)
    expect(new Set(week.map((v) => v.personId)).size).toBe(2)
    expect(new Set(week.map((v) => v.minutes))).toEqual(new Set([30, 60, 120]))
    expect(week.filter((v) => v.start === null && !v.done).length).toBeGreaterThanOrEqual(2)
    expect(week.filter((v) => v.waiting)).toHaveLength(1)
    expect(week.filter((v) => v.notTold).length).toBeGreaterThanOrEqual(1)
    expect(week.filter((v) => v.done && v.start !== null).length).toBeGreaterThanOrEqual(1)
  })
  it("every block's job page and Jobs row say the same day, time and who", () => {
    for (const w of WEEK_VISITS) {
      const v = jobView(w.id)
      expect(v.kind, w.id).toBe("page")
      if (v.kind !== "page") continue
      const f = weekFacts(w)
      expect(v.data.when, w.id).toEqual([["Day", f.day], ["Time", f.time], ["Who", f.who]])
      expect(rowOf(w.id)!.who).toBe(w.who)
    }
  })
  it("says where a moved visit was in the app's words, the day once when it did not change", () => {
    expect(changeWords({ day: "2026-11-18", start: 540 }, { day: "2026-11-18", start: 570 })).toBe("Moved from 9:00 am to 9:30 am, Wed, Nov 18")
    expect(changeWords({ day: "2026-11-19", start: 540 }, { day: "2026-11-20", start: 540 })).toBe("Moved from Thu, Nov 19, 9:00 am to Fri, Nov 20, 9:00 am")
    expect(notToldList(initialState({ visits: world.visits, meta: world.meta, unscheduled: [], timeOff: [], was: world.was })).every((r) => r.change)).toBe(true)
  })
})

describe("the best times", () => {
  const world = buildWalkWorld()
  const state = initialState({ visits: world.visits, meta: world.meta, unscheduled: world.unscheduled, timeOff: world.timeOff })
  const i = { state, people: world.people, today: world.today }
  it("take their minutes from the neighbours, so they are not all the same", () => {
    const best = bestTimesFor({ ...i, town: "Erie", minutes: 60, point: { lat: 40.05, lng: -105.05 } })
    expect(new Set(best.rows.map((r) => r.addedMinutes)).size).toBeGreaterThan(1)
  })
  it("sort correctly under each of the three sorts", () => {
    const rows = bestTimesFor({ ...i, town: "Lafayette", minutes: 60 }).rows
    const soon = sortOpenings(rows, "soonest").map((r) => `${r.day} ${r.start}`)
    expect([...soon].sort()).toEqual(soon)
    const drive = sortOpenings(rows, "least-driving").map((r) => r.addedMinutes)
    expect([...drive].sort((a, b) => a - b)).toEqual(drive)
    const rec = sortOpenings(rows, "recommended").map((r) => r.score)
    expect([...rec].sort((a, b) => a - b)).toEqual(rec)
  })
  it("the suggestion, the row marked Recommended and the preselected row are one opening", () => {
    const job = world.unscheduled[0]!
    const best = bestTimesFor({ ...i, town: job.town, minutes: job.minutes })
    const s = suggestionFor(job, i, dayShort)!
    expect(s.rowId).toBe(recommendedId(best.rows))
  })
})
