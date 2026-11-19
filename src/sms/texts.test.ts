import { describe, expect, it } from "vitest"
import { dateConfirmText, dateMovedText, dateSetText, dayBeforeText, invoiceReminderText, invoiceText, onTheWayText, SMS_TEMPLATES, visitCancelledText } from "./texts"
import type { VisitFacts } from "@/emails/format"

const origin = "https://www.trailheadirrigation.com"
const base = { origin, firstName: "Andrea", accountUrl: `${origin}/account`, signInUrl: `${origin}/account/sign-in?email=andrea%40example.com` }
const visit: VisitFacts = { id: "v1", name: "spring turn-on", day: "2027-05-05", startTime: "08:00", who: "Ryan", address: "412 Ash St", location: "412 Ash St, Erie", icsUrl: `${origin}/api/visits/v1/calendar.ics?token=abc` }
const blowout: VisitFacts = { ...visit, name: "fall blowout", day: "2027-10-14" }
const link = `Your Trailhead account: ${origin}/account`
const STOP = "Reply STOP to opt out."

describe("the day-of texts, worded as section 4 of the messages design", () => {
  it("date-set names the day, the window and who is coming", () => {
    expect(dateSetText({ ...base, visit: blowout })).toBe(`Trailhead: your fall blowout is Thu, Oct 14, 8 to 10 am. Ryan will be there. ${link} ${STOP}`)
  })
  it("date-set says nothing about who when the visit has no one, and drops the window when there is none", () => {
    expect(dateSetText({ ...base, visit: { ...blowout, who: null, startTime: null } })).toBe(`Trailhead: your fall blowout is Thu, Oct 14. ${link} ${STOP}`)
  })
  it("date-moved", () => {
    expect(dateMovedText({ ...base, visit: { ...blowout, day: "2027-10-21" } })).toBe(`Trailhead: your fall blowout moved to Thu, Oct 21, 8 to 10 am. Another day? ${link} ${STOP}`)
  })
  it("date-moved carries Ryan's line, in plain ASCII, after the words", () => {
    const moved = { ...blowout, day: "2027-10-21", visitUrl: `${origin}/account/visits/v1?t=abc` }
    expect(dateMovedText({ ...base, visit: { ...moved, note: "Rain on the 14th \u2014 sorry!" } })).toBe(`Trailhead: your fall blowout moved to Thu, Oct 21, 8 to 10 am. Another day? Rain on the 14th - sorry! Doesn't work? Pick another day: ${moved.visitUrl} ${STOP}`)
    expect(dateMovedText({ ...base, visit: { ...moved, note: "  Gate will be open  " } })).toContain("Another day? Gate will be open. Doesn't work?")
    expect(dateMovedText({ ...base, visit: { ...moved, note: "   " } })).not.toContain("  ")
  })
  it("date-moved for a property that must be home asks for the YES and still has the signed link", () => {
    const moved = { ...blowout, day: "2027-10-21", startTime: null, asked: true, visitUrl: `${origin}/account/visits/v1?t=abc` }
    expect(dateMovedText({ ...base, visit: { ...moved, note: "Rain on the 14th" } })).toBe(`Trailhead: your fall blowout moved to Thu, Oct 21. Rain on the 14th. Reply YES or pick another day: ${moved.visitUrl} ${STOP}`)
    // asked applies to a move only: the day-before text never asks
    expect(dayBeforeText({ ...base, visit: moved })).not.toContain("Reply YES")
  })
  it("date-confirm", () => {
    expect(dateConfirmText({ ...base, visit: blowout })).toBe(`Trailhead: your fall blowout is still Thu, Oct 14, 8 to 10 am. Need another day? ${link} ${STOP}`)
  })
  it("day-before names who is coming, never a truck", () => {
    const t = dayBeforeText({ ...base, visit })
    expect(t).toBe(`Trailhead: Ryan is coming tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Need to change it? Text Ryan at (970) 692-7270. ${link} ${STOP}`)
    expect(t).not.toMatch(/truck/i)
  })
  it("day-before says we're coming when the visit has no person, with nothing left dangling", () => {
    const t = dayBeforeText({ ...base, visit: { ...visit, who: null } })
    expect(t).toBe(`Trailhead: We're coming tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Need to change it? Text Ryan at (970) 692-7270. ${link} ${STOP}`)
    expect(t).not.toMatch(/will be there|  |, ,/)
  })
  it("on the way names the person and the address", () => {
    expect(onTheWayText({ ...base, visit })).toBe(`Trailhead: Ryan is on the way to 412 Ash St for your spring turn-on. ${link} ${STOP}`)
    expect(onTheWayText({ ...base, visit: { ...visit, who: null } })).toBe(`Trailhead: We're on the way to 412 Ash St for your spring turn-on. ${link} ${STOP}`)
  })
  it("leaves the opt-out line off a number that has had a text before", () => {
    expect(dayBeforeText({ ...base, visit }, { optOut: false })).toBe(`Trailhead: Ryan is coming tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Need to change it? Text Ryan at (970) 692-7270. ${link}`)
    expect(dateSetText({ ...base, visit }, { optOut: true }).match(/STOP/g)).toHaveLength(1)
  })
  it("uses the words the office saved, filled the same way", () => {
    const templates = { "day-before:sms": "{who} is coming tomorrow for your {service} at {address}." }
    expect(dayBeforeText({ ...base, visit }, { templates })).toBe(`Trailhead: Ryan is coming tomorrow for your spring turn-on at 412 Ash St. Need to change it? Text Ryan at (970) 692-7270. ${link} ${STOP}`)
  })
})

describe("the invoice texts", () => {
  const bill = { ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", address: "412 Ash St", lines: [{ name: "Repair", amount: 145 }], amount: 145, tax: 0, total: 145, dueOn: "2027-05-21", payUrl: `${origin}/pay/inv1?token=abc` }
  it("says the amount, the due day and the pay link, in the word invoice", () => {
    expect(invoiceText(bill)).toBe(`Trailhead: your invoice for the repair is $145, due May 21. Pay here: ${origin}/pay/inv1?token=abc ${STOP}`)
    expect(invoiceReminderText(bill)).toBe(`Trailhead: a reminder that $145 for the repair is still unpaid, due May 21. Pay here: ${origin}/pay/inv1?token=abc ${STOP}`)
    expect(invoiceText(bill).match(/STOP/g)).toHaveLength(1)
    expect(`${invoiceText(bill)} ${invoiceReminderText(bill)}`).not.toMatch(/\bbill|owed|overdue/i)
  })
  it("are the invoice and invoice-reminder templates", () => {
    expect(SMS_TEMPLATES.invoice).toBe(invoiceText)
    expect(SMS_TEMPLATES["invoice-reminder"]).toBe(invoiceReminderText)
  })
})

describe("every text", () => {
  const bill = { ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", address: "412 Ash St", lines: [{ name: "Repair", amount: 145 }], amount: 145, tax: 0, total: 145, dueOn: "2027-05-21", payUrl: `${origin}/pay/inv1?token=abc` }
  const all = [
    dateSetText({ ...base, visit }), dateMovedText({ ...base, visit }), dateConfirmText({ ...base, visit }), dayBeforeText({ ...base, visit }), onTheWayText({ ...base, visit }),
    dateSetText({ ...base, visit: { ...visit, who: null } }), dayBeforeText({ ...base, visit: { ...visit, who: null } }),
    invoiceText(bill), invoiceReminderText(bill),
  ]
  it("is plain ASCII, so a part holds 160 characters", () => {
    for (const t of all) expect(t).toMatch(/^[\x20-\x7E]+$/)
  })
  it("has no em dash, no exclamation mark, no pass number and no mention of a pass", () => {
    for (const t of all) {
      expect(t).not.toMatch(/—|!|TH-\d|your pass|season pass/i)
      expect(t.startsWith("Trailhead: ")).toBe(true)
    }
  })
  it("ends every text about a visit with that visit's own signed link: Pick another day on the day texts, See your visit on my way and the cancel note", () => {
    const v = { ...visit, visitUrl: `${origin}/account/visits/v1?t=1900000000.sig` }
    const urlText = `${origin}/account/visits/v1?t=1900000000.sig`
    for (const t of [dateSetText({ ...base, visit: v }), dateMovedText({ ...base, visit: v })]) expect(t).toContain(`Doesn't work? Pick another day: ${urlText}`)
    // the day-before text is past the online cut-off: it sends the customer to Ryan, never to another day
    expect(dayBeforeText({ ...base, visit: v })).toContain(`Need to change it? Text Ryan at (970) 692-7270. See your visit: ${urlText}`)
    expect(dayBeforeText({ ...base, visit: v })).not.toMatch(/pick another day/i)
    expect(dayBeforeText({ ...base, visit })).toContain("Need to change it? Text Ryan at (970) 692-7270. Your Trailhead account:")
    // the two-week text keeps its ask and says the last day to change online (the Monday before a Wednesday visit)
    expect(dateConfirmText({ ...base, visit: v })).toContain(`Last day to change online: Mon, May 3. Pick another day: ${urlText}`)
    expect(onTheWayText({ ...base, visit: v })).toContain(`See your visit: ${urlText}`)
    expect(visitCancelledText({ ...base, serviceName: "spring turn-on", address: "412 Ash St", day: "2027-05-05", paid: 0, visitUrl: urlText })).toContain(`See your visit: ${urlText}`)
    // without a signed link (an older row) it is the plain account link
    expect(dateSetText({ ...base, visit })).toContain(link)
  })
  it("names the account in the words of the portal design", () => {
    for (const t of all.slice(0, 7)) expect(t).toContain("Your Trailhead account: ")
  })
})
