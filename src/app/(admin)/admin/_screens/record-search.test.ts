import { describe, expect, it } from "vitest"
import { searchRecords } from "./record-search"
import { JOBS_TODAY, jobsData } from "./jobs-fixture"

// Cmd+K: customers, jobs and scheduled work found by name, street, phone or pass number, each hit naming the record it opens.

const first = jobsData.clients[0]!
const fullName = (c: typeof first) => [c.firstName, c.lastName].filter(Boolean).join(" ")

describe("searchRecords", () => {
  it("finds nothing for an empty or one-letter query", () => {
    expect(searchRecords(jobsData, JOBS_TODAY, "")).toEqual([])
    expect(searchRecords(jobsData, JOBS_TODAY, "  ")).toEqual([])
    expect(searchRecords(jobsData, JOBS_TODAY, "a")).toEqual([])
  })

  it("finds a customer by name, with its job and its days beside it", () => {
    const hits = searchRecords(jobsData, JOBS_TODAY, first.firstName.toLowerCase())
    const customer = hits.find((h) => h.kind === "customer" && h.id === first.id)
    expect(customer).toMatchObject({ title: fullName(first), href: `/admin/customers?customer=${first.id}` })
    expect(hits.some((h) => h.kind === "job" && h.title.startsWith(fullName(first)))).toBe(true)
  })

  it("finds by street and by phone, in any format", () => {
    const withStreet = jobsData.clients.find((c) => c.address && c.phone)!
    const street = searchRecords(jobsData, JOBS_TODAY, withStreet.address!.split(" ").slice(0, 2).join(" "))
    expect(street.some((h) => h.kind === "customer" && h.id === withStreet.id)).toBe(true)
    const digits = withStreet.phone!.replace(/\D/g, "").slice(-7)
    expect(searchRecords(jobsData, JOBS_TODAY, digits).some((h) => h.kind === "customer" && h.id === withStreet.id)).toBe(true)
  })

  it("finds a pass by its number and opens its job", () => {
    const pass = jobsData.jobs!.find((j) => j.passNumber)!
    const hits = searchRecords(jobsData, JOBS_TODAY, pass.passNumber!.toLowerCase())
    expect(hits).toContainEqual(expect.objectContaining({ kind: "job", id: pass.id, href: `/admin/jobs?job=${pass.id}` }))
  })

  it("matches every word of the query, not any", () => {
    const hits = searchRecords(jobsData, JOBS_TODAY, `${first.firstName} zzzzqqq`)
    expect(hits).toEqual([])
  })

  it("names a scheduled day by the customer and the work, and opens it on the Schedule", () => {
    const visit = jobsData.visits.find((v) => v.startAt)!
    const hits = searchRecords(jobsData, JOBS_TODAY, visit.clientName.toLowerCase())
    const hit = hits.find((h) => h.kind === "visit" && h.id === visit.id)
    expect(hit).toMatchObject({ title: visit.clientName, href: `/admin/schedule?visit=${visit.id}` })
    expect(hit!.detail).toMatch(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/)
  })

  it("finds a job with no day yet by its customer, and says so", () => {
    const undated = jobsData.visits.find((v) => !v.startAt && v.status !== "cancelled")
    if (!undated) return
    const hit = searchRecords(jobsData, JOBS_TODAY, undated.clientName.toLowerCase()).find((h) => h.kind === "visit" && h.id === undated.id)
    expect(hit?.detail).toMatch(/no day yet$/)
  })

  it("leaves out a canceled visit, so a search never calls it a job with no day yet", () => {
    const base = jobsData.visits.find((v) => v.startAt)!
    const gone = { ...base, id: "gone-visit", status: "cancelled" as const }
    const withGone = { ...jobsData, visits: [...jobsData.visits, gone, { ...gone, id: "gone-undated", startAt: undefined, scheduledOn: undefined }] }
    const hits = searchRecords(withGone, JOBS_TODAY, base.clientName.toLowerCase())
    expect(hits.some((h) => h.id === base.id)).toBe(true)
    expect(hits.some((h) => h.kind === "visit" && (h.id === "gone-visit" || h.id === "gone-undated"))).toBe(false)
  })

  it("caps customers at six and jobs and days at three each, with a See all line when there are more", () => {
    const hits = searchRecords(jobsData, JOBS_TODAY, "er")
    expect(hits.filter((h) => h.kind === "customer").length).toBeLessThanOrEqual(6)
    for (const kind of ["job", "visit"] as const) {
      const rows = hits.filter((h) => h.kind === kind)
      expect(rows.filter((h) => !h.seeAll).length).toBeLessThanOrEqual(3)
      if (rows.some((h) => h.seeAll)) {
        expect(rows.at(-1)).toMatchObject({ seeAll: true, title: expect.stringMatching(/^See all \d+ (jobs|days)$/) })
        expect(rows).toHaveLength(4)
      }
    }
  })

  it("says See all N with the true count, and links to the full list", () => {
    const base = jobsData.visits.find((v) => v.startAt)!
    const many = { ...jobsData, visits: [...jobsData.visits, ...[1, 2, 3, 4, 5].map((n) => ({ ...base, id: `extra-${n}` }))] }
    const hits = searchRecords(many, JOBS_TODAY, base.clientName.toLowerCase())
    const all = hits.find((h) => h.kind === "visit" && h.seeAll)!
    expect(all.href).toBe("/admin/schedule?view=list")
    expect(all.title).toMatch(/^See all \d+ days$/)
    expect(Number(all.title.match(/\d+/)![0])).toBeGreaterThan(3)
  })

  it("shows a customer's phone and email under the name, so two of one name are told apart", () => {
    const withBoth = jobsData.clients.find((c) => c.phone && c.email)!
    const hit = searchRecords(jobsData, JOBS_TODAY, withBoth.email!.toLowerCase()).find((h) => h.kind === "customer" && h.id === withBoth.id)!
    expect(hit.contact).toContain(withBoth.email!)
    expect(hit.contact).toMatch(/\(\d{3}\) \d{3}-\d{4}/)
  })
})
