import { describe, expect, it } from "vitest"
import { recordHref } from "@/components/blocks/record-preview-model"
import { dayTitle, navigate, parseHref, routeTitle, type Route } from "./routes"

describe("parseHref", () => {
  it("reads the hrefs recordHref emits", () => {
    expect(parseHref(recordHref.job("j1"))).toEqual({ screen: "job", id: "j1" })
    expect(parseHref(recordHref.customer("andrea"))).toEqual({ screen: "customer", id: "andrea" })
    expect(parseHref(recordHref.invoice("inv-42"))).toEqual({ screen: "invoice", id: "inv-42" })
    expect(parseHref(recordHref.day("2026-11-24"))).toEqual({ screen: "schedule", id: "2026-11-24" })
    expect(parseHref(recordHref.person())).toEqual({ screen: "settings" })
    expect(parseHref(recordHref.visit("v1"))).toEqual({ screen: "schedule" })
  })
  it("reads the nav links", () => {
    expect(parseHref("/admin")).toEqual({ screen: "home" })
    expect(parseHref("/admin/jobs")).toEqual({ screen: "jobs" })
    expect(parseHref("/admin/customers")).toEqual({ screen: "customers" })
    expect(parseHref("/admin/invoices")).toEqual({ screen: "invoices" })
    expect(parseHref("/admin/reports")).toEqual({ screen: "reports" })
    expect(parseHref("/admin/settings")).toEqual({ screen: "settings" })
    expect(parseHref("/admin/jobs?new=1&customer=c1")).toEqual({ screen: "jobs", newJob: true, id: "c1" })
    expect(parseHref("/admin/jobs?new=1")).toEqual({ screen: "jobs", newJob: true })
  })
  it("leaves the prototype for anything else", () => {
    for (const href of ["tel:+19705550123", "mailto:a@b.co", "https://dashboard.stripe.com", "https://trailheadirrigation.com/pay/1", "/account/receipts/r1", "/admin/payments?payment=p1", "#billing", ""]) expect(parseHref(href)).toBeNull()
  })
})

describe("navigate and titles", () => {
  const jobs: Route = { screen: "jobs" }
  const job: Route = { screen: "job", id: "a" }
  const cust: Route = { screen: "customer", id: "andrea" }
  it("pushes a record, pops back to the one below, resets on a root", () => {
    let s = navigate([jobs], job)
    s = navigate(s, cust)
    expect(s).toEqual([jobs, job, cust])
    expect(navigate(s, job)).toEqual([jobs, job])
    expect(navigate(s, { screen: "invoices" })).toEqual([{ screen: "invoices" }])
    expect(navigate(s, cust)).toEqual(s)
  })
  it("titles", () => {
    expect(routeTitle(jobs)).toBe("Jobs")
    expect(routeTitle(cust, () => "Andrea Dalton")).toBe("Andrea Dalton")
    expect(routeTitle({ screen: "schedule", id: "2026-11-24" })).toBe("Tuesday, November 24")
    expect(dayTitle("2026-11-24")).toBe("Tuesday, November 24")
  })
})

describe("Requests routes", () => {
  it("reads the Requests list, a request and Home's New filter", () => {
    expect(parseHref("/admin/requests")).toEqual({ screen: "requests" })
    expect(parseHref(recordHref.request("rq-rosa"))).toEqual({ screen: "request", id: "rq-rosa" })
    expect(parseHref("/admin/requests?status=new")).toEqual({ screen: "requests", filter: "new" })
    expect(parseHref(recordHref.quote("q-beth"))).toEqual({ screen: "job", id: "q-beth" })
  })
  it("makes Requests a root and a request one deeper, and titles them", () => {
    const list: Route = { screen: "requests" }
    const one: Route = { screen: "request", id: "rq-rosa" }
    expect(navigate([{ screen: "jobs" }], list)).toEqual([list])
    expect(navigate([list], one)).toEqual([list, one])
    expect(routeTitle(list)).toBe("Requests")
    expect(routeTitle(one, () => "Rosa Delgado")).toBe("Rosa Delgado")
  })
})
