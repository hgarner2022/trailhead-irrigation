import { describe, expect, it } from "vitest"
import { BILLS_OUT, KIND_OPTIONS, MONEY_OPTIONS, STAGE_OPTIONS, billsChip, billsOut, filterFrom, jobHeading, jobRows, jobsContext, moneyCell, seasonOptions, type JobRow } from "./jobs-model"
import { JOBS_TODAY, jobsData } from "./jobs-fixture"
import type { AdminData } from "@/lib/admin/types"

const rows = jobRows(jobsData, JOBS_TODAY)
const row = (id: string) => rows.find((r) => r.id === id)!

describe("jobRows", () => {
  it("makes one row per job, a pass or a one-off, and none for an unfinished checkout", () => {
    const pending = { ...jobsData, jobs: [...jobsData.jobs!, { ...jobsData.jobs![0]!, id: "job-pending", status: "pending" as const }] }
    expect(jobRows(pending, JOBS_TODAY)).toHaveLength(rows.length)
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length)
    expect(rows.some((r) => r.kind === "pass")).toBe(true)
    expect(rows.some((r) => r.kind === "repair")).toBe(true)
    expect(rows.some((r) => r.kind === "install")).toBe(true)
  })

  it("names the job: a pass by its number, a one-off by its work", () => {
    const pass = rows.find((r) => r.id === "job_p-office")!
    expect(pass).toMatchObject({ kind: "pass", title: "Season Pass TH-2027-0014", name: "Dana Reed", property: "12 Elm St, Erie" })
    expect(row("job-d")).toMatchObject({ title: "Repair", kindLabel: "Repair" })
    expect(row("job-b")).toMatchObject({ title: "Installation" })
    expect(jobHeading({ kind: "pass", passNumber: "TH-2027-0007", lines: [] }, 2027)).toBe("Season Pass TH-2027-0007 · 2027")
    expect(jobHeading({ kind: "repair", lines: [], soldOn: "2026-11-03" }, 2026)).toBe("Repair · sold Nov 3")
  })

  it("says when and how it was sold", () => {
    expect(row("job-a").soldText).toBe("Nov 3, office")
    expect(row("job-a").soldOn).toBe("2026-11-03")
    expect(rows.find((r) => r.kind === "pass" && r.source === "checkout")!.soldText).toBe("website")
  })

  it("counts the visits done of the visits still live", () => {
    expect(row("job-d").visitsText).toBe("1 of 1 done")
    expect(row("job-a").visitsText).toBe("0 of 1 done")
    expect(rows.find((r) => r.id === "job_p-office")!.visitsText).toBe("0 of 2 done")
    expect(row("job-h").visitsText).toBe("No visits")
  })

  it("reads the stage from the facts", () => {
    expect(row("job-a")).toMatchObject({ stage: "open", stageLabel: "Open" })
    expect(row("job-b")).toMatchObject({ stage: "needs-a-quote", stageLabel: "Needs a quote" })
    expect(row("job-d").stage).toBe("done")
    expect(row("job-h")).toMatchObject({ stage: "cancelled", stageLabel: "Cancelled" })
    expect(rows.some((r) => r.stage === "quoted")).toBe(false)
  })

  it("says the next visit's day, Unscheduled, or None", () => {
    expect(row("job-a").nextText).toBe("Thu, Nov 19")
    expect(row("job-b").nextText).toBe("Unscheduled")
    expect(row("job-d").nextText).toBe("None")
  })

  it("puts the bills that are out first, the oldest due day on top", () => {
    expect(rows.slice(0, 2).map((r) => r.id)).toEqual(["job-f", "job-g"])
    expect(rows[0]!.billDue).toBe("2026-11-03")
    expect(rows[1]!.billDue).toBe("2026-11-24")
    expect(rows.slice(2).every((r) => !r.billDue)).toBe(true)
  })

  it("finds a job by name, street or pass number", () => {
    const hit = (q: string) => rows.filter((r) => r.search.toLowerCase().includes(q.toLowerCase())).map((r) => r.id)
    expect(hit("Dana")).toContain("job-a")
    expect(hit("Spruce Way")).toEqual(["job-g"])
    expect(hit("TH-2027-0014")).toEqual(["job_p-office"])
  })

  it("reads no jobs from data without any", () => {
    const none: AdminData = { ...jobsData }
    delete none.jobs
    expect(jobRows(none, JOBS_TODAY)).toEqual([])
    expect(jobsContext([], JOBS_TODAY)).toBe("No jobs yet.")
  })
})

describe("the Money cell, in the words of money/words.ts", () => {
  it("reads Owed with the amount for a done job nobody paid", () => {
    expect(row("job-d")).toMatchObject({ money: "owed", moneyText: "$145 owed", owed: 145 })
  })
  it("reads Bill sent with its due day, and Overdue once that day has gone", () => {
    expect(row("job-g")).toMatchObject({ money: "bill-sent", moneyText: "$145 · Bill sent, due Nov 24" })
    expect(row("job-f")).toMatchObject({ money: "overdue", moneyText: "$145 · Overdue since Nov 3" })
  })
  it("reads Paid", () => {
    expect(row("job-e")).toMatchObject({ money: "paid", moneyText: "$145 · Paid", owed: 0 })
  })
  it("reads the part-paid job and its cancelled line: struck lines add nothing", () => {
    expect(row("job-install")).toMatchObject({ total: 1310, owed: 810, stage: "open", money: "not-yet", moneyText: "$1,310 · $500 paid" })
  })
  it("says nothing of money for a cancelled job with nothing held", () => {
    expect(row("job-h")).toMatchObject({ stage: "cancelled", money: "not-yet", moneyText: "" })
  })
  it("reads Quote later for an unpriced job and the price for work not yet due", () => {
    expect(row("job-b").moneyText).toBe("Quote later")
    expect(row("job-a")).toMatchObject({ money: "not-yet", moneyText: "$145" })
  })
  it("reads Failed with the amount", () => {
    expect(moneyCell("failed", { total: 145, owed: 145, words: "$145 owed" })).toBe("$145 · Failed")
  })
  it("never says Charged, Unpaid or request", () => {
    const all = rows.flatMap((r) => [r.moneyText, r.stageLabel, r.visitsText, r.nextText, r.soldText]).join(" ").toLowerCase()
    for (const word of ["charged", "unpaid", "request"]) expect(all).not.toContain(word)
    const options = [...MONEY_OPTIONS, ...STAGE_OPTIONS, ...KIND_OPTIONS].map((o) => o.label.toLowerCase()).join(" ")
    for (const word of ["charged", "unpaid", "request"]) expect(options).not.toContain(word)
  })
})

describe("filters and the header line", () => {
  it("offers the Money, Stage and Kind words and the seasons present", () => {
    expect(MONEY_OPTIONS.map((o) => o.label)).toEqual(["Owed", "Bill sent", "Overdue", "Paid", "Failed"])
    expect(STAGE_OPTIONS.map((o) => o.label)).toEqual(["Needs a quote", "Quoted", "Open", "Done", "Cancelled"])
    expect(KIND_OPTIONS.map((o) => o.label)).toEqual(["Season Pass", "Repair", "Installation", "Other"])
    expect(seasonOptions(rows).map((o) => o.value)).toEqual([...new Set(rows.map((r) => String(r.season)))].sort().reverse())
  })
  it("counts the bills out as the two bill states and offers them as the chip's filter", () => {
    expect(BILLS_OUT).toEqual(["bill-sent", "overdue"])
    expect(billsOut(rows)).toBe(2)
    expect(billsChip(2)).toBe("2 bills out")
    expect(billsChip(1)).toBe("1 bill out")
    expect(filterFrom("money", "bill-sent,overdue", MONEY_OPTIONS)).toEqual([{ column: "money", values: ["bill-sent", "overdue"] }])
    expect(filterFrom("money", "nonsense", MONEY_OPTIONS)).toEqual([])
    expect(filterFrom("money", undefined, MONEY_OPTIONS)).toEqual([])
  })
  it("writes the header line from the season's jobs, what is owed and what needs a quote", () => {
    const line = jobsContext(rows, JOBS_TODAY)
    expect(line).toMatch(/^\d+ jobs this season\./)
    // this season is this calendar year and after: the one-offs sold this November and the passes sold for next year
    expect(line).toContain(`${rows.length} jobs this season.`)
    expect(jobsContext(rows, "2027-02-01T12:00:00Z")).toContain(`${rows.filter((r) => r.season >= 2027).length} jobs this season.`)
    expect(line).toContain("1 owed.")
    expect(line).toContain("1 needs a quote.")
    const lone: JobRow[] = [rows.find((r) => r.id === "job-e")!]
    expect(jobsContext(lone, JOBS_TODAY)).toBe("1 job this season.")
  })
})
