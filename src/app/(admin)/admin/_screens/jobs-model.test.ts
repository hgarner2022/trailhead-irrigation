import { describe, expect, it } from "vitest"
import { BILLS_OUT, MONEY_OPTIONS, STAGE_OPTIONS, billsChip, billsOut, filterFrom, jobHeading, jobRows, jobsContext, moneyCell, seasonOptions, serviceOptions, jobService, type JobRow } from "./jobs-model"
import { JOBS_TODAY, jobsData } from "./jobs-fixture"
import type { AdminData, JobLine } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import { serviceGroups } from "./new-job-model"

const rows = jobRows(jobsData, JOBS_TODAY)
const row = (id: string) => rows.find((r) => r.id === id)!

describe("jobRows", () => {
  it("makes one row per job, a pass or a one-off, and none for an unfinished checkout", () => {
    const { soldOn: _sold, ...first } = jobsData.jobs![0]!
    void _sold
    // a pass that is not sold yet (no sold day): the checkout's card step is not finished
    const pending = { ...jobsData, jobs: [...jobsData.jobs!, { ...first, id: "job-pending", kind: "pass" as const, status: "open" as const }] }
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
    expect(rows.find((r) => r.kind === "pass" && r.source === "checkout")!.soldText).toMatch(/^[A-Z][a-z]{2} \d{1,2}, website$/)
  })

  it("says Not sold yet while a quote is waiting (no sold day), and Needs a quote is its stage", () => {
    const { soldOn: _sold, ...first } = jobsData.jobs!.find((j) => j.id === "job-a")!
    void _sold
    const waiting = { ...jobsData, jobs: [...jobsData.jobs!, { ...first, id: "job-quote", status: "needs-a-quote" as const }] }
    expect(jobRows(waiting, JOBS_TODAY).find((r) => r.id === "job-quote")).toMatchObject({ soldText: "Not sold yet", stage: "needs-a-quote", stageLabel: "Needs a quote" })
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
    expect(row("job-h")).toMatchObject({ stage: "cancelled", stageLabel: "Canceled" })
    expect(rows.some((r) => r.stage === "quoted")).toBe(false)
  })

  it("says the next visit's day, Unscheduled, or None", () => {
    expect(row("job-a").nextText).toBe("Thu, Nov 19")
    expect(row("job-b").nextText).toBe("Unscheduled")
    expect(row("job-d").nextText).toBe("None")
  })

  it("puts the invoices that are out first, the oldest due day on top", () => {
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
    expect(row("job-d")).toMatchObject({ money: "owed", moneyText: "$145 unpaid", owed: 145 })
  })
  it("reads Invoice sent with its due day, and Past due once that day has gone", () => {
    expect(row("job-g")).toMatchObject({ money: "bill-sent", moneyText: "$145 · Invoice sent, due Nov 24" })
    expect(row("job-f")).toMatchObject({ money: "overdue", moneyText: "$145 · Past due since Nov 3" })
  })
  it("reads Paid", () => {
    expect(row("job-e")).toMatchObject({ money: "paid", moneyText: "$145 · Paid", owed: 0 })
  })
  it("reads the part-paid job and its canceled line: struck lines add nothing", () => {
    expect(row("job-install")).toMatchObject({ total: 1310, owed: 810, stage: "open", money: "not-yet", moneyText: "$1,310 · $500 paid" })
  })
  it("says nothing of money for a canceled job with nothing held", () => {
    expect(row("job-h")).toMatchObject({ stage: "cancelled", money: "not-yet", moneyText: "" })
  })
  it("reads Quote later for an unpriced job and the price for work not yet due", () => {
    expect(row("job-b").moneyText).toBe("Quote later")
    expect(row("job-a")).toMatchObject({ money: "not-yet", moneyText: "$145" })
  })
  it("reads Failed with the amount", () => {
    expect(moneyCell("failed", { total: 145, owed: 145, words: "$145 unpaid" })).toBe("$145 · Failed")
  })
  it("never says Charged, Owed or request", () => {
    const all = rows.flatMap((r) => [r.moneyText, r.stageLabel, r.visitsText, r.nextText, r.soldText]).join(" ").toLowerCase()
    for (const word of ["charged", "owed", "request"]) expect(all).not.toContain(word)
    const options = [...MONEY_OPTIONS, ...STAGE_OPTIONS, ...serviceOptions(undefined, rows)].map((o) => o.label.toLowerCase()).join(" ")
    for (const word of ["charged", "owed", "request"]) expect(options).not.toContain(word)
  })
})

describe("filters and the header line", () => {
  it("offers the Money, Stage and Kind words and the seasons present", () => {
    expect(MONEY_OPTIONS.map((o) => o.label)).toEqual(["Unpaid", "Invoice sent", "Past due", "Paid", "Failed"])
    expect(STAGE_OPTIONS.map((o) => o.label)).toEqual(["Needs a quote", "Quote sent", "Open", "Done", "Canceled"])
    expect(seasonOptions(rows).map((o) => o.value)).toEqual([...new Set(rows.map((r) => String(r.season)))].sort().reverse())
  })
  it("counts the invoices out as the two bill states and offers them as the chip's filter", () => {
    expect(BILLS_OUT).toEqual(["bill-sent", "overdue"])
    expect(billsOut(rows)).toBe(2)
    expect(billsChip(2)).toBe("2 invoices out")
    expect(billsChip(1)).toBe("1 invoice out")
    expect(filterFrom("money", "bill-sent,overdue", MONEY_OPTIONS)).toEqual([{ column: "money", values: ["bill-sent", "overdue"] }])
    expect(filterFrom("money", "nonsense", MONEY_OPTIONS)).toEqual([])
    expect(filterFrom("money", undefined, MONEY_OPTIONS)).toEqual([])
  })
  it("writes the header line from the season's jobs, what is unpaid and what needs a quote", () => {
    const line = jobsContext(rows, JOBS_TODAY)
    expect(line).toMatch(/^\d+ jobs this season\./)
    // this season is this calendar year and after: the one-offs sold this November and the passes sold for next year
    expect(line).toContain(`${rows.length} jobs this season.`)
    expect(jobsContext(rows, "2027-02-01T12:00:00Z")).toContain(`${rows.filter((r) => r.season >= 2027).length} jobs this season.`)
    expect(line).toContain("1 unpaid.")
    expect(line).toContain("1 needs a quote.")
    const lone: JobRow[] = [rows.find((r) => r.id === "job-e")!]
    expect(jobsContext(lone, JOBS_TODAY)).toBe("1 job this season.")
  })
})

describe("the Job filter lists every service", () => {
  const groups = serviceGroups(SERVICE_LIST as never)
  const line = (name: string, over: Partial<JobLine> = {}): JobLine => ({ id: name, name, quantity: 1, unitPrice: 100, taxable: false, ...over })
  const other = rows.filter((r) => r.service === "other")

  it("lists Season Pass, then every active service by its catalogue name without the band, then Other only when a job needs it", () => {
    const names = serviceOptions(undefined, []).map((o) => o.label)
    expect(names[0]).toBe("Season Pass")
    expect(names).toContain("Spring turn-on & system check")
    expect(names.slice(1, 5)).toEqual(["Sprinkler repair visit", "Spring turn-on & system check", "Fall blowout & winterization", "Mid-season inspection & tune-up"])
    expect(names.filter((n) => /zones/.test(n))).toEqual([])
    expect(new Set(names).size).toBe(names.length)
    expect(names).not.toContain("Other")
    expect(serviceOptions(undefined, [{ service: "other" }]).map((o) => o.label).at(-1)).toBe("Other")
    expect(serviceOptions(undefined, []).map((o) => o.value)).toEqual(["pass", ...groups.map((g) => g.id)])
  })

  it("leaves out a service that is not active", () => {
    const services = (SERVICE_LIST as never as { key: string; active?: boolean }[]).map((s) => (s.key === "lights" ? { ...s, active: false } : s))
    expect(serviceOptions(services as never, []).map((o) => o.label)).not.toContain("Christmas lights")
  })

  it("matches a repair job to the repair service, by its line or by the kind it already has", () => {
    expect(jobService({ kind: "repair", lines: [line("Repair")] }, groups)).toBe("repair")
    expect(jobService({ kind: "repair", lines: [] }, groups)).toBe("repair")
    expect(jobService({ kind: "repair", lines: [line("Larger sprinkler repair")] }, groups)).toBe("repair-large")
  })

  it("matches a turn-on of any band to the one turn-on service", () => {
    expect(jobService({ kind: "other", lines: [line("Spring turn-on")] }, groups)).toBe("turn-on")
    expect(jobService({ kind: "other", lines: [line("Spring turn-on & system check, up to 12 zones")] }, groups)).toBe("turn-on")
    expect(jobService({ kind: "other", lines: [line("Spring turn-on & system check, up to 16 zones")] }, groups)).toBe("turn-on")
  })

  it("matches a pass to Season Pass whatever its lines say", () => {
    expect(jobService({ kind: "pass", lines: [line("Spring turn-on")] }, groups)).toBe("pass")
    expect(rows.filter((r) => r.kind === "pass").every((r) => r.service === "pass")).toBe(true)
  })

  it("reads the first line that is not canceled, and calls a custom line Other", () => {
    expect(jobService({ kind: "other", lines: [line("Repair", { cancelledAt: "2026-11-10T16:00:00Z" }), line("Core aeration")] }, groups)).toBe("aeration")
    expect(jobService({ kind: "other", lines: [line("Rotors, 12")] }, groups)).toBe("other")
    expect(jobService({ kind: "other", lines: [] }, groups)).toBe("other")
  })

  it("puts a row on its service and keeps the value the address uses stable", () => {
    expect(row("job-d").service).toBe("repair")
    expect(row("job-b").service).toBe("install")
    const options = serviceOptions(undefined, rows)
    expect(filterFrom("kind", "repair,pass,bogus", options)).toEqual([{ column: "kind", values: ["repair", "pass"] }])
    expect(other.length === 0 || options.some((o) => o.value === "other")).toBe(true)
  })
})
