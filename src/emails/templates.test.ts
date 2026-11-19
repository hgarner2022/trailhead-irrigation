import { describe, expect, it } from "vitest"
import { EMAIL_TEMPLATES, renderEmail } from "./render"
import { googleCalendarUrl, icsFile } from "./calendar"
import { EMAIL_COLORS, FONT, button, emailLayout, greetingLine, paragraph } from "./layout"
import { capitalFirst, withoutGreeting } from "./editable"
import { signInEmail } from "./sign-in"
import { SMS_TEMPLATES } from "@/sms/texts"
import type { VisitFacts } from "./format"

const origin = "https://www.trailheadirrigation.com"
const base = { origin, firstName: "Andrea", accountUrl: `${origin}/account`, signInUrl: `${origin}/account/sign-in?email=andrea%40example.com` }
const visit: VisitFacts = { id: "v1", name: "spring turn-on", day: "2027-05-05", startTime: "08:00", who: null, address: "412 Ash St", location: "412 Ash St, Erie", icsUrl: `${origin}/api/visits/v1/calendar.ics?token=abc` }

const blowoutVisit: VisitFacts = { ...visit, id: "v2", name: "fall blowout", day: "2027-10-05", icsUrl: `${origin}/api/visits/v2/calendar.ics?token=def` }
const TWO_DAYS = { ...base, passNumber: "TH-2027-0004", season: 2027, town: "Erie", address: "412 Ash St", passImageUrl: `${origin}/api/pass-image/p1?token=t`, cardLast4: "4242", visits: [{ kind: "turn-on", name: "spring turn-on", amount: 145, visit, fallback: "" }, { kind: "blowout", name: "fall blowout", amount: 95, visit: blowoutVisit, fallback: "", note: "Your first choice, Friday, October 1, filled up, so we put it on Tuesday, October 5." }] }

const INVOICE = { ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", address: "412 Ash St", lines: [{ name: "Repair", amount: 145 }], amount: 145, tax: 0, total: 145, dueOn: "2027-05-21", payUrl: `${origin}/pay/inv1?token=abc` }
const RECEIPT = { ...base, amount: 145, serviceName: "spring turn-on", address: "412 Ash St", paidOn: "2027-05-05", card: "Visa ending 4242", nextLine: "Your fall blowout is planned for early October.", receiptUrl: "https://pay.stripe.com/r/1" }

const DATA: Record<keyof typeof EMAIL_TEMPLATES, Record<string, unknown>> = {
  "purchase-confirmation": { ...base, passNumber: "TH-2027-0004", season: 2027, town: "Erie", address: "412 Ash St", passImageUrl: `${origin}/api/pass-image/p1?token=t`, cardLast4: "4242", visits: [{ kind: "turn-on", name: "spring turn-on", amount: 145, visit, fallback: "" }, { kind: "blowout", name: "fall blowout", amount: 95, visit: null, fallback: "Ryan sets the day and we text it to you." }] },
  "booking-confirmation": { ...base, serviceName: "sprinkler repair", visit },
  "date-set": { ...base, visit },
  "date-moved": { ...base, visit },
  "day-before": { ...base, visit },
  "date-confirm": { ...base, visit },
  receipt: RECEIPT,
  invoice: INVOICE,
  "invoice-reminder": INVOICE,
  "card-failed": { ...base, amount: 145, visitName: "spring turn-on", card: "Visa ending 4242", address: "412 Ash St", updateUrl: "https://billing.stripe.com/s/1" },
  "card-expiring": { ...base, card: "Visa ending 4242", cardState: "expires in July 2027", left: 190, updateUrl: "https://billing.stripe.com/s/2" },
  cancelled: { ...base, season: 2027 },
  "visit-cancelled": { ...base, serviceName: "spring turn-on", address: "412 Ash St", day: "2027-05-05", paid: 0 },
  renewal: { ...base, season: 2028, town: "Erie", buyUrl: `${origin}/season-pass` },
  "not-closed-crew": { origin, visits: [{ customer: "Andrea", name: "spring turn-on", day: "2027-05-04", town: "Erie" }, { customer: "Ben", name: "fall blowout", day: "2027-10-04", town: "Lafayette" }] },
  "admin-alert": { origin, title: "Season Pass TH-2027-0004 is new", detail: "Andrea in Erie bought a pass.", path: "/admin/passes" },
}

const CUSTOMER_KINDS = (Object.keys(DATA) as (keyof typeof DATA)[]).filter((k) => k !== "not-closed-crew" && k !== "admin-alert")

/** The copy rules from CLAUDE.md, on every part of every message. */
function copyRules(s: string) {
  expect(s).not.toContain("—")
  expect(s).not.toContain("–")
  expect(s).not.toContain("!")
  expect(s).not.toMatch(/\bnot [^.]{1,40}, it'?s\b/i)
  expect(s).not.toMatch(/\bno [a-z]+, no [a-z]+/i)
}

describe.each(Object.keys(DATA) as (keyof typeof DATA)[])("%s", (kind) => {
  const r = renderEmail(kind, DATA[kind])!
  it("renders a subject, text and HTML that follow the copy rules", () => {
    expect(r.subject.length).toBeGreaterThan(8)
    copyRules(r.subject)
    copyRules(r.text)
    copyRules(r.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " "))
  })
  it("is on the layout, with the footer, a table structure and no hex outside the layout's colour block", () => {
    expect(r.html).toContain('role="presentation"')
    expect(r.html).toContain("137 Morgan Circle North")
    expect(r.html).toContain("(970) 692-7270")
    expect(r.html).toContain("/images/logo-email.png")
    expect(r.html).not.toMatch(/<(script|link)\b/)
    expect(r.html.match(/<style\b/g)).toHaveLength(1)
  })
})

describe("every customer email", () => {
  it.each(CUSTOMER_KINDS)("%s is signed by the crew, and says no pass number or 'your pass' unless it is the purchase or the renewal", (kind) => {
    const { text, html } = renderEmail(kind, DATA[kind])!
    const signOff = kind === "purchase-confirmation" ? "Less time in the yard. More time on the trail." : "The Trailhead crew"
    expect(text).toContain(signOff)
    expect(html).toContain(signOff)
    expect(html.indexOf(signOff)).toBeLessThan(html.indexOf("137 Morgan Circle North"))
    if (kind !== "purchase-confirmation" && kind !== "renewal") for (const part of [text, html, renderEmail(kind, DATA[kind])!.subject]) expect(part).not.toMatch(/TH-\d{4}|\byour pass\b|pass page|pass number/i)
  })
  it.each(CUSTOMER_KINDS.filter((k) => k !== "booking-confirmation"))("%s never says bill, owed, overdue, cancelled or a truck", (kind) => {
    const r = renderEmail(kind, DATA[kind])!
    for (const part of [r.text, r.subject, r.html.replace(/<[^>]+>/g, " ")]) expect(part).not.toMatch(/\bbills?\b|\bowed\b|overdue|cancelled|truck/i)
  })
  it("the staff emails carry no sign-off", () => {
    expect(renderEmail("not-closed-crew", DATA["not-closed-crew"])!.html).not.toContain("The Trailhead crew")
    expect(renderEmail("admin-alert", DATA["admin-alert"])!.html).not.toContain("The Trailhead crew")
  })
  it("rows queued before this wording still render: a receipt with a visit name and no address, a cancel with no season, a purchase with no address", () => {
    const receipt = renderEmail("receipt", { ...base, passNumber: "TH-2027-0004", amount: 145, visitName: "spring turn-on", card: "Visa ending 4242", nextLine: "", receiptUrl: null })!
    expect(receipt.subject).toBe("Receipt: $145 for your spring turn-on")
    expect(receipt.text).toContain("Your spring turn-on is paid.")
    expect(receipt.text).not.toMatch(/undefined|Where:|Paid on:/)
    const cancelled = renderEmail("cancelled", { ...base, passNumber: "TH-2027-0004" })!
    expect(cancelled.subject).toBe("Your Season Pass is canceled")
    const { address: _address, ...noAddress } = DATA["purchase-confirmation"] as Record<string, unknown>
    expect(renderEmail("purchase-confirmation", noAddress)!.text).not.toMatch(/undefined|Where:/)
  })
  it("a row queued before the account link existed still renders, with the account link built from its origin", () => {
    const old = { ...base, visit } as Record<string, unknown>
    delete old.accountUrl
    old.passUrl = `${origin}/account/pass`
    expect(renderEmail("date-set", old)!.text).toContain(`${origin}/account`)
  })
})

describe("wording per kind", () => {
  const get = (k: keyof typeof DATA) => renderEmail(k, DATA[k])!
  it("purchase-confirmation puts the pass image first, then each visit's day with calendar links, where, the text promise, the money line and the button", () => {
    const { html, text, subject } = get("purchase-confirmation")
    expect(subject).toBe("Your 2027 Season Pass is reserved")
    expect(html).toContain("Welcome to the 2027 season")
    expect(html.indexOf("/api/pass-image/p1?token=t")).toBeLessThan(html.indexOf("Wednesday, May 5, between 8 and 10 am"))
    expect(html.indexOf("Add to Google Calendar")).toBeLessThan(html.indexOf("Open your Trailhead account"))
    expect(html.indexOf("Wednesday, May 5, between 8 and 10 am")).toBeLessThan(html.indexOf(">Where<"))
    expect(html).toContain("Add to Apple or Outlook calendar")
    expect(html).toContain("/api/visits/v1/calendar.ics?token=abc")
    expect(text).toContain("Spring turn-on: Wednesday, May 5, between 8 and 10 am")
    expect(text).toContain("Where: 412 Ash St")
    expect(text).toContain("Fall blowout: Ryan sets the day and we text it to you.")
    expect(text).toContain("Ryan sets the days that are missing and we text them to you.")
    expect(text).not.toMatch(/days are set|reserved in July|on our way/)
    expect(text).toContain("We confirm it by text two weeks before and remind you the day before. If it has to move, we tell you first and you can pick another day.")
    expect(text).toContain("You pay $0 today. We charge $145 after the spring turn-on and $95 after the fall blowout to the card ending 4242.")
    expect(html).toContain("/account/sign-in?email=andrea%40example.com")
    expect(html).toContain("Season Pass TH-2027-0004")
  })
  it("purchase-confirmation with every visit dated says so, shows what Ryan does, and says when a day filled up", () => {
    const { html, text } = renderEmail("purchase-confirmation", TWO_DAYS)!
    expect(text).toContain("Here are your days.")
    expect(text).toContain("Fall blowout: Tuesday, October 5, between 8 and 10 am")
    expect(text).toContain("Your first choice, Friday, October 1, filled up, so we put it on Tuesday, October 5.")
    expect(text).toContain("Ryan blows the water out of every line before the first hard freeze.")
    expect(html.match(/Add to Google Calendar/g)).toHaveLength(2)
    expect(html.match(/Add to Apple or Outlook calendar/g)).toHaveLength(2)
  })
  it("purchase-confirmation shows what was sold as the money table: a line to a row, quantity when it is not one, and the season total", () => {
    const lines = [{ name: "Spring turn-on, 8 zones", amount: 145, quantity: 1, unitPrice: 145 }, { name: "fall blowout, 8 zones", amount: 95, quantity: 1, unitPrice: 95 }]
    const { html, text } = renderEmail("purchase-confirmation", { ...TWO_DAYS, lines })!
    expect(text).toContain("Spring turn-on, 8 zones: $145\nFall blowout, 8 zones: $95\nSeason total: $240\n")
    expect(text).not.toContain("Subtotal")
    expect(html).toContain("Spring turn-on, 8 zones")
    expect(html).toContain("Season total")
    expect(html.indexOf("Season total")).toBeLessThan(html.indexOf("Open your Trailhead account"))
    expect(renderEmail("purchase-confirmation", TWO_DAYS)!.text).not.toContain("Season total")
  })
  it.each(["date-set", "date-moved", "day-before", "date-confirm", "booking-confirmation"] as const)("%s has the day, the two-hour window, who is coming, where, both calendar links and a button to the account", (kind) => {
    const { html, text } = get(kind)
    for (const part of [html, text]) {
      expect(part).toContain("Wednesday, May 5")
      expect(part).toContain("between 8 and 10 am")
      expect(part).toContain("Ryan")
      expect(part).toContain("412 Ash St, Erie")
      expect(part).not.toMatch(/truck/i)
    }
    expect(html).toContain("Add to Google Calendar")
    expect(html).toContain("Add to Apple or Outlook calendar")
    expect(html).toContain("calendar.google.com/calendar/render?action=TEMPLATE")
    expect(html).toContain("/api/visits/v1/calendar.ics?token=abc")
    // an older row with no signed link falls back to the account; the day-before email is past the cut-off and carries Text Ryan instead
    if (kind !== "day-before") {
      expect(html).toContain("/account/sign-in?email=")
      expect(html).toContain("Open your Trailhead account")
    }
    if (kind !== "day-before") expect(text).toContain(`Change your day or anything else in your Trailhead account: ${origin}/account`)
  })
  it("the day-before email is past the online cut-off: it says Text Ryan with the phone as a tel link, and never offers another day", () => {
    const { html, text } = get("day-before")
    expect(html).toContain('Need to change it? Text Ryan at <a href="tel:9706927270"')
    expect(html).toContain(">(970) 692-7270</a>")
    expect(text).toContain("Need to change it? Text Ryan at (970) 692-7270.")
    for (const part of [html, text]) expect(part).not.toMatch(/different day|another day|Change your day/i)
    expect(html).not.toContain("pick another day")
    expect(html).toContain('href="sms:9706927270"')
    expect(html).toContain(">Text Ryan</a>")
    expect(html).not.toContain("Change this visit")
    // the earlier emails still offer the change online
    expect(get("date-confirm").text).toContain("Change your day or anything else")
  })
  it.each(["date-set", "date-moved", "date-confirm", "booking-confirmation"] as const)("%s links to the signed one-visit page as Change this visit, with the last day to change online", (kind) => {
    const signed = { ...visit, who: "Ryan", visitUrl: `${origin}/account/visits/v1?t=1900000000.sig` }
    const { html, text } = renderEmail(kind, { ...DATA[kind], visit: signed })!
    expect(html).toContain(`href="${origin}/account/visits/v1?t=1900000000.sig"`)
    expect(html).toContain("Change this visit")
    expect(html).toContain("Last day to change online: Mon, May 3.")
    expect(html).not.toContain("/account/sign-in?email=")
    expect(text).toContain(`Change this visit (last day to change online: Mon, May 3): ${origin}/account/visits/v1?t=1900000000.sig`)
  })
  it("the day-before email shows the visit link only as a plain See your visit line, never as Change this visit", () => {
    const signed = { ...visit, visitUrl: `${origin}/account/visits/v1?t=1900000000.sig` }
    const { html, text } = renderEmail("day-before", { ...base, visit: signed })!
    expect(html).not.toContain("Change this visit")
    expect(text).toContain(`Need to change it? Text Ryan at (970) 692-7270. See your visit: ${origin}/account/visits/v1?t=1900000000.sig`)
  })
  it("day-before names who is coming when the visit has a person, and leaves the sentence out when it has none", () => {
    const named = renderEmail("day-before", { ...base, visit: { ...visit, who: "Ryan" } })!
    expect(named.text).toContain("Hi Andrea,\n\nA reminder that we're coming tomorrow, Wednesday, May 5, for your spring turn-on. Ryan will be there.")
    expect(named.html).toContain("Ryan will be there.")
    const nobody = renderEmail("day-before", { ...base, visit: { ...visit, who: null } })!
    expect(nobody.text).toContain("we're coming tomorrow, Wednesday, May 5, for your spring turn-on.")
    expect(nobody.text).not.toMatch(/will be there|\.\s*\. |  /)
  })
  it("ignores a stored `crew` key in message data queued before the label went: nothing says a truck", () => {
    const old = { ...visit, who: "Ryan", crew: "Truck 1" } as typeof visit
    for (const kind of ["date-set", "date-moved", "day-before", "booking-confirmation"] as const) {
      const out = renderEmail(kind, { ...base, serviceName: "sprinkler repair", visit: old })!
      for (const part of [out.html, out.text]) {
        expect(part).toContain("Ryan")
        expect(part).not.toMatch(/truck/i)
      }
    }
    const text = SMS_TEMPLATES["day-before"]({ ...base, visit: old })
    expect(text).toContain("Ryan is coming tomorrow")
    expect(text).not.toMatch(/truck/i)
  })
  it("date-set, date-moved, date-confirm and day-before say their event in subject and headline", () => {
    expect(get("date-set").subject).toBe("Your spring turn-on is Wednesday, May 5")
    expect(get("date-set").html).toContain("Your spring turn-on has a day")
    expect(get("date-moved").subject).toBe("Your spring turn-on moved to Wednesday, May 5")
    expect(get("date-confirm").html).toContain("Your spring turn-on is in two weeks")
    expect(get("day-before").subject).toBe("Tomorrow: your spring turn-on")
    expect(get("day-before").html).toContain("We're coming tomorrow")
  })
  it("uses the words the office saved for the first sentence, and the shipped words when it saved none", () => {
    const saved = renderEmail("date-set", { ...base, visit: { ...visit, who: "Ryan" } }, { "date-set:email": "Hi {firstName}, {who} will be at {address} on {day} for your {service}." })!
    expect(saved.text).toContain("Hi Andrea,\n\nRyan will be at 412 Ash St on Wednesday, May 5 for your spring turn-on.")
    expect(saved.text.match(/Hi Andrea/g)).toHaveLength(1)
    expect(renderEmail("date-set", { ...base, visit })!.text).toContain("Hi Andrea,\n\nYour spring turn-on is set for Wednesday, May 5.")
  })
  it("the booking confirmation says who is coming, when, and what happens next", () => {
    const repair = { ...base, serviceName: "sprinkler repair", visit: { ...visit, name: "repair", who: "Ryan" } }
    const { subject, text, html } = renderEmail("booking-confirmation", repair)!
    expect(subject).toBe("Your sprinkler repair is booked for Wednesday, May 5")
    expect(html).toContain("Your repair is booked")
    expect(text).toContain("Hi Andrea,\n\nRyan will be there Wednesday, May 5, between 8 and 10 am. We text you the day before.")
    expect(get("booking-confirmation").text).toContain("Ryan and the crew will be there Wednesday, May 5, between 8 and 10 am")
    for (const label of ["Day", "Who is coming", "Where"]) expect(text).toContain(`${label}: `)
  })
  it("the receipt for a visit carries what was bought: where, who did it and when, the receipt number, each line, the totals, what was paid and one link to the account", () => {
    const receipt = { ...RECEIPT, paidBy: "check", card: null, who: "Ryan", day: "2027-05-05", number: "R-1A2B3C4D", lines: [{ name: "repair", amount: 145, quantity: 1, unitPrice: 145 }], subtotal: 145, tax: 0, total: 145, nextLine: "" }
    const { subject, text, html } = renderEmail("receipt", receipt)!
    expect(subject).toBe("Receipt: $145 for your spring turn-on at 412 Ash St")
    expect(html).toContain("Paid, thank you")
    expect(text.split("\n").slice(0, 16).join("\n")).toBe([
      "Hi Andrea,",
      "",
      "Thank you. Your spring turn-on at 412 Ash St is paid.",
      "",
      "Where: 412 Ash St",
      "Done: Wednesday, May 5, with Ryan",
      "Receipt: R-1A2B3C4D",
      "",
      "Repair: $145",
      "Subtotal: $145",
      "Total: $145",
      "",
      "Paid: $145, Check",
      "Paid on: Wednesday, May 5",
      "",
      "See it in your account: https://www.trailheadirrigation.com/account",
    ].join("\n"))
    expect(html).toContain(">See it in your account<")
    expect(html).toContain(">View the receipt<")
    expect(html).not.toMatch(/Visit:|paid by check|>check</)
    expect(html).toContain("You are getting this because a visit of yours was completed.")
  })
  it("the receipt shows a quantity under the line, sales tax only when a line was taxed, the card in words, and a next visit when there is one", () => {
    const receipt = { ...RECEIPT, who: null, day: "2027-05-05", number: "R-1A2B3C4D", lines: [{ name: "Repair", amount: 145, quantity: 1, unitPrice: 145 }, { name: "Extra zones", amount: 20, quantity: 2, unitPrice: 10 }], subtotal: 165, tax: 13, total: 178, amount: 178 }
    const { text, html } = renderEmail("receipt", receipt)!
    expect(text).toContain("Done: Wednesday, May 5\n")
    expect(text).toContain(["Repair: $145", "Extra zones (2 × $10): $20", "Subtotal: $165", "Sales tax: $13", "Total: $178", "", "Paid: $178, Visa ending 4242"].join("\n"))
    expect(html).toContain("2 × $10")
    expect(text).toContain("Your fall blowout is planned for early October.")
    const untaxed = renderEmail("receipt", { ...receipt, tax: 0, total: 165, amount: 165 })!
    expect(untaxed.text).not.toContain("Sales tax")
    expect(untaxed.html).not.toContain("Sales tax")
    expect(renderEmail("receipt", { ...receipt, card: null, paidBy: "Venmo" })!.text).toContain("Paid: $178, Venmo")
    expect(renderEmail("receipt", { ...receipt, receiptUrl: null })!.html).not.toContain("View the receipt")
  })
  it("the receipt for an invoice paid on the pay page lists its frozen lines and a credit as a minus, with the receipt and invoice numbers", () => {
    const paid = { ...RECEIPT, serviceName: "repair", amount: 233, invoiceNumber: "INV-2027-0001", number: "R-9F8E7D6C", who: "Ryan", day: "2027-05-05", lines: [{ name: "Repair", amount: 145, quantity: 1, unitPrice: 145 }, { name: "Extra zones", amount: 20, quantity: 2, unitPrice: 10 }, { name: "Payments received", amount: -45, quantity: 1, unitPrice: -45 }], subtotal: 220, tax: 13, total: 233, nextLine: "", receiptUrl: "https://pay.stripe.com/r/2" }
    const { subject, text, html } = renderEmail("receipt", paid)!
    expect(subject).toBe("Receipt: $233 for your repair at 412 Ash St")
    expect(subject).not.toContain("INV-")
    expect(text.split("\n").slice(0, 18).join("\n")).toBe([
      "Hi Andrea,",
      "",
      "Thank you. Your repair at 412 Ash St is paid.",
      "",
      "Where: 412 Ash St",
      "Done: Wednesday, May 5, with Ryan",
      "Receipt: R-9F8E7D6C",
      "Invoice: INV-2027-0001",
      "",
      "Repair: $145",
      "Extra zones (2 × $10): $20",
      "Payments received: -$45",
      "Subtotal: $220",
      "Sales tax: $13",
      "Total: $233",
      "",
      "Paid: $233, Visa ending 4242",
      "Paid on: Wednesday, May 5",
    ].join("\n"))
    expect(html).toContain("View the receipt")
    copyRules(text)
  })
  it("the invoice carries the job: where, who did it and when, the invoice number, each line, the totals, the amount due, the due day, one Pay button and one link to the account", () => {
    const invoice = { ...INVOICE, who: "Ryan", day: "2027-05-04", lines: [{ name: "Repair", amount: 145, quantity: 1, unitPrice: 145 }] }
    const { subject, text, html } = renderEmail("invoice", invoice)!
    expect(subject).toBe("Your Trailhead invoice for the repair at 412 Ash St: $145")
    expect(html).toContain("Your invoice is ready")
    expect(text.split("\n").slice(0, 17).join("\n")).toBe([
      "Hi Andrea,",
      "",
      "Here is your invoice for the repair at 412 Ash St: $145, due Friday, May 21.",
      "",
      "Where: 412 Ash St",
      "Done: Tuesday, May 4, with Ryan",
      "Invoice: INV-2027-0001",
      "",
      "Repair: $145",
      "Subtotal: $145",
      "Total: $145",
      "",
      "Amount due: $145",
      "Due: Friday, May 21",
      "",
      `Pay here: ${origin}/pay/inv1?token=abc`,
      "See it in your account: https://www.trailheadirrigation.com/account",
    ].join("\n"))
    expect(text).not.toContain("Sales tax")
    expect(html).not.toMatch(/Sales tax/)
    expect(html).toContain(">Pay $145<")
    expect(html.match(/Pay \$145/g)).toHaveLength(1)
    expect(html).toContain(">See it in your account<")
    const taxed = renderEmail("invoice", { ...INVOICE, lines: [{ name: "Repair", amount: 145, quantity: 1, unitPrice: 145 }, { name: "Spring turn-on", amount: 100, quantity: 1, unitPrice: 100 }], amount: 245, tax: 12, total: 257 })!
    expect(taxed.subject).toBe("Your Trailhead invoice for the repair at 412 Ash St: $257")
    expect(taxed.text).toContain(["Subtotal: $245", "Sales tax: $12", "Total: $257", "", "Amount due: $257"].join("\n"))
    expect(taxed.html).toContain(">Pay $257<")
  })
  it("the reminder is the same invoice under a reminder heading", () => {
    const { subject, text, html } = get("invoice-reminder")
    expect(subject).toBe("Your Trailhead invoice, $145, is still unpaid")
    expect(html).toContain("A reminder about your invoice")
    expect(text).toContain("Hi Andrea,\n\nA reminder that $145 for the repair is still unpaid, due Friday, May 21")
    expect(text).toContain(`Pay here: ${origin}/pay/inv1?token=abc`)
  })
  it("card-failed says which card, for which visit and where, then how to fix it", () => {
    const { subject, text, html } = get("card-failed")
    expect(subject).toBe("The card for your spring turn-on didn't go through")
    expect(html).toContain("Your card needs a quick update")
    expect(text).toContain("Hi Andrea,\n\nYour spring turn-on at 412 Ash St is done, but your Visa ending 4242 didn't go through for $145.")
    expect(text).toContain("Add a new card and we'll try it right away.")
    expect(text).toContain("https://billing.stripe.com/s/1")
    expect(text).toContain("The link is good for 24 hours. Your Trailhead account can make a new one.")
    expect(html).toContain(">Update your card<")
    const link = renderEmail("card-failed", { ...base, amount: null, visitName: null, card: null, address: null, updateUrl: "https://billing.stripe.com/s/3" })!
    expect(link.subject).toBe("Update the card in your Trailhead account")
    expect(link.text).toContain("Here is the link to update the card in your Trailhead account")
  })
  it("card-expiring names the card, when it ends and what is still to come", () => {
    const { subject, text, html } = get("card-expiring")
    expect(subject).toBe("Your Visa ending 4242 expires in July 2027")
    expect(text).toContain("Hi Andrea,\n\nThe card we have for your visits expires in July 2027, and $190 of visits are still to come. A new card now keeps them on schedule.")
    expect(html).toContain(">Add a new card<")
    expect(renderEmail("card-expiring", { ...DATA["card-expiring"], left: 0 })!.text).not.toContain("still to come")
  })
  it("cancelled says the season, that nothing further is charged and how to book later", () => {
    const { subject, text, html } = get("cancelled")
    expect(subject).toBe("Your 2027 Season Pass is canceled")
    expect(text).toContain("Hi Andrea,\n\nYour 2027 Season Pass is canceled and your remaining visits are off the schedule. We won't charge you again.")
    expect(text).toContain("If you want a visit later, book online or call (970) 692-7270.")
    expect(html).toContain(">Book a visit<")
    expect(html).toContain(`${origin}/book`)
  })
  it("renewal names the season, the town and the two visits, with a way to stop", () => {
    const { subject, text, html } = get("renewal")
    expect(subject).toBe("Reserve your 2028 turn-on and blowout")
    expect(html).toContain("Season Pass 2028 is open")
    expect(text).toContain("Hi Andrea,\n\nYou can reserve your Erie spring turn-on and fall blowout for 2028 now and pick your days in the same step.")
    expect(text).toContain("You pay after each visit, on the card we have on file.")
    expect(html).toContain(">Reserve 2028<")
    expect(html).toContain("Reply to stop these emails.")
  })
  it("the crew note counts the visits and the office alert opens the admin", () => {
    expect(get("not-closed-crew").subject).toBe("2 visits still need to be marked done")
    expect(get("not-closed-crew").text).toContain("Ben, Lafayette: fall blowout on Monday, October 4")
    expect(get("admin-alert").html).toContain(`${origin}/admin/passes`)
  })
})

describe("text versions", () => {
  const d = { ...base, visit } as never
  const visitKinds = ["date-set", "date-moved", "day-before", "date-confirm", "on-the-way"] as const
  it.each(visitKinds)("%s names the business, the account link and the opt-out once, in plain ASCII", (kind) => {
    const t = SMS_TEMPLATES[kind](d)
    expect(t.startsWith("Trailhead:")).toBe(true)
    expect(t).toContain(`Your Trailhead account: ${origin}/account`)
    expect(t.match(/STOP/g)).toHaveLength(1)
    expect(t).toMatch(/^[\x20-\x7E]+$/)
    copyRules(t)
  })
  it.each(["invoice", "invoice-reminder"] as const)("%s names the business, the amount, the due day and the pay link, with the opt-out once and the copy rules kept", (kind) => {
    const t = SMS_TEMPLATES[kind]({ ...INVOICE, dueOn: "2027-12-01" } as never)
    expect(t.startsWith("Trailhead:")).toBe(true)
    expect(t).toContain("$145")
    expect(t).toContain("due Dec 1")
    expect(t).toContain(`${origin}/pay/inv1?token=abc`)
    expect(t.match(/STOP/g)).toHaveLength(1)
    copyRules(t)
  })
})

describe("the layout", () => {
  it("keeps the brand colours in one block and uses them", () => {
    const html = emailLayout({ origin, preheader: "Hello", title: "Hi", body: button(`${origin}/x`, "Go") + paragraph("Hi"), why: "You are getting this because a test ran." })
    expect(html).toContain(EMAIL_COLORS.navy)
    expect(html).toContain(EMAIL_COLORS.primary)
    expect(html).toContain(EMAIL_COLORS.accent)
    expect(html).toContain(FONT)
    expect(html).not.toMatch(/Barlow|Source Sans/)
    expect(html).toContain("Hello")
  })
  it("escapes what goes into the HTML", () => {
    expect(paragraph('<b>"x"</b> & y')).toContain("&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y")
  })
})

describe("the greeting", () => {
  it("reads 'Hi Andrea,' from the stored first name: a full name is trimmed to its first word, a shouted or lower-case name is capitalised, a typed capital stays", () => {
    expect(greetingLine("Andrea")).toBe("Hi Andrea,")
    expect(greetingLine("  Andrea Lopez ")).toBe("Hi Andrea,")
    expect(greetingLine("andrea")).toBe("Hi Andrea,")
    expect(greetingLine("ANDREA")).toBe("Hi Andrea,")
    expect(greetingLine("McKay")).toBe("Hi McKay,")
    expect(greetingLine("O'Brien")).toBe("Hi O'Brien,")
  })
  it("falls back to 'Hi there,' for an empty value, an email address or anything with a digit", () => {
    for (const bad of ["", "   ", null, undefined, "andrea@example.com", "412", "N/A", "-", ","]) expect(greetingLine(bad)).toBe("Hi there,")
  })
  it("keeps initials as typed, drops trailing punctuation, and keeps accented and hyphenated names", () => {
    expect(greetingLine("AJ")).toBe("Hi AJ,")
    expect(greetingLine("Andrea,")).toBe("Hi Andrea,")
    expect(greetingLine("Zoë")).toBe("Hi Zoë,")
    expect(greetingLine("Mary-Jo")).toBe("Hi Mary-Jo,")
  })
  it("is one line under the heading on a customer email, and nothing sits in front of it but the heading", () => {
    const { html } = renderEmail("receipt", DATA.receipt)!
    expect(html.match(/>Hi Andrea,</g)).toHaveLength(1)
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf(">Hi Andrea,<"))
    expect(html.indexOf(">Hi Andrea,<")).toBeLessThan(html.indexOf("Thank you. Your"))
    const noName = renderEmail("receipt", { ...DATA.receipt, firstName: "" })!
    expect(noName.html).toContain(">Hi there,<")
    expect(noName.text).toContain("Hi there,\n\nThank you.")
  })
  it("never prints 'Hi, ' with a comma after Hi, whatever is stored", () => {
    for (const kind of CUSTOMER_KINDS) for (const name of ["Hannah", "Hannah Garner", "", "hannah"]) {
      const r = renderEmail(kind, { ...DATA[kind], firstName: name })!
      expect(r.text).not.toMatch(/\bHi, /)
      expect(r.html).not.toMatch(/>Hi, /)
    }
  })
  it("strips an opening greeting from a saved sentence, in any form the office might type, and falls back to the shipped words if only a greeting was saved", () => {
    for (const saved of ["Hi {firstName}, {who} will be at {address} on {day}.", "Hi, {firstName}, {who} will be at {address} on {day}.", "Hello {firstName}: {who} will be at {address} on {day}.", "hi {firstName} - {who} will be at {address} on {day}."]) {
      const out = renderEmail("date-set", { ...base, visit: { ...visit, who: "Ryan" } }, { "date-set:email": saved })!
      expect(out.text).toContain("Hi Andrea,\n\nRyan will be at 412 Ash St on Wednesday, May 5.")
      expect(out.text.match(/Andrea/g)).toHaveLength(1)
    }
    expect(renderEmail("date-set", { ...base, visit }, { "date-set:email": "Hi {firstName}," })!.text).toContain("Hi Andrea,\n\nYour spring turn-on is set for Wednesday, May 5.")
    expect(withoutGreeting("Hi {firstName}, your {service} is {day}.")).toBe("your {service} is {day}.")
    expect(capitalFirst("your spring turn-on")).toBe("Your spring turn-on")
  })
})

describe("every email is on the one template", () => {
  const kinds = [...(Object.keys(DATA) as (keyof typeof DATA)[]), "sign-in" as const]
  const make = (k: (typeof kinds)[number]) => (k === "sign-in" ? signInEmail({ url: `${origin}/account/sign-in/verify?token=abc`, host: "www.trailheadirrigation.com" }) : renderEmail(k, DATA[k])!)
  const STAFF = ["not-closed-crew", "admin-alert"]
  const visible = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<div style="display:none[\s\S]*?<\/div>/, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ")
  it.each(kinds)("%s has one h1 and one button, in the one frame", (k) => {
    const { html } = make(k)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html.match(/class="cta"/g)).toHaveLength(1)
    expect(html.match(/border-radius:8px;background:/g)?.length).toBeGreaterThanOrEqual(1)
  })
  it.each(kinds)("%s uses only the four sizes, the one font stack and 16px body text", (k) => {
    const { html } = make(k)
    const sizes = new Set([...html.matchAll(/font-size:(\d+)px/g)].map((m) => Number(m[1])))
    sizes.delete(1)
    for (const size of sizes) expect([28, 18, 16, 14]).toContain(size)
    expect(sizes.has(16)).toBe(true)
    expect(html).toContain(FONT)
    expect(html).not.toMatch(/Barlow|Source Sans|Arial Narrow/)
    expect(html).not.toMatch(/font-size:(15|17|22|34)px/)
  })
  it.each(kinds)("%s ends with the business name, address, phone and a why line, in the HTML and in the text", (k) => {
    const { html, text } = make(k)
    for (const part of [html, text]) {
      expect(part).toContain("Trailhead Lawn")
      expect(part).toContain("137 Morgan Circle North, Erie, CO 80516")
      expect(part).toContain("(970) 692-7270")
      expect(part).toMatch(/You are getting this (because|about)|A note for the Trailhead/)
    }
    expect(html).toContain('href="tel:9706927270"')
    expect(html.indexOf("137 Morgan Circle North")).toBeGreaterThan(html.indexOf("<h1"))
  })
  it.each(kinds)("%s carries a greeting only when it is a customer email with a name to use, and its preheader is not a line of its body", (k) => {
    const { html, text } = make(k)
    if (STAFF.includes(k) || k === "sign-in") {
      expect(html).not.toMatch(/>Hi /)
      expect(text).not.toMatch(/^Hi\b/m)
    } else {
      expect(html.match(/>Hi (Andrea|there),</g)).toHaveLength(1)
      expect(text).toMatch(/^Hi Andrea,$/m)
    }
    const pre = html.match(/opacity:0[^>]*>([^<]*)</)![1]!.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/(&zwnj;&nbsp;)+$/, "")
    expect(pre.trim().length).toBeGreaterThan(20)
    expect(pre.trim().length).toBeLessThanOrEqual(100)
    expect(visible(html)).not.toContain(pre.trim())
  })
  it("the day emails give both calendar actions as text links under the one button, and the money emails give a second action as a link, not a button", () => {
    for (const k of ["booking-confirmation", "date-set", "date-moved", "day-before", "date-confirm"] as const) {
      const { html } = make(k)
      expect(html.indexOf("Open your Trailhead account")).toBeLessThan(html.indexOf("Add to Google Calendar"))
      expect(html).toMatch(/<a href="[^"]*calendar\.google[^"]*" style="color:#B45309;font-weight:700;text-decoration:underline">Add to Google Calendar/)
    }
    expect(make("receipt").html).toMatch(/style="color:#B45309;font-weight:700;text-decoration:underline">View the receipt/)
    expect(make("invoice").html).toMatch(/style="color:#B45309;font-weight:700;text-decoration:underline">See it in your account/)
  })
  it("the sign-in email says why in its footer and gives the link under the button for a client that blocks buttons", () => {
    const { html, text } = make("sign-in")
    expect(html).toContain("You are getting this because someone asked to sign in to Trailhead with this email address.")
    expect(html).toContain("If the button doesn't work")
    expect(text).not.toContain("Hi,")
    expect(text).toContain("The Trailhead crew")
    expect(html).toContain("The Trailhead crew")
  })
})

describe("the branches of each email keep to the template", () => {
  const one = (html: string) => {
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html.match(/class="cta"/g)).toHaveLength(1)
    expect(html).not.toMatch(/undefined|null|NaN/)
  }
  it("a purchase with a card still to add has one button (Add your card) and the account as a text link", () => {
    const { html } = renderEmail("purchase-confirmation", { ...DATA["purchase-confirmation"], cardLast4: null, cardUpdateUrl: "https://billing.stripe.com/s/9" })!
    one(html)
    expect(html).toContain(">Add your card<")
    expect(html).toMatch(/underline">Open your Trailhead account/)
    const none = renderEmail("purchase-confirmation", { ...DATA["purchase-confirmation"], cardLast4: null, cardUpdateUrl: null })!.html
    one(none)
    expect(none).toContain(">Open your Trailhead account<")
  })
  it("card emails with no update link still have one button, the greeting and the why line", () => {
    for (const kind of ["card-failed", "card-expiring"] as const) {
      const r = renderEmail(kind, { ...DATA[kind], updateUrl: null })!
      one(r.html)
      expect(r.html).toContain(">Open your Trailhead account<")
      expect(r.text).toContain("Hi Andrea,")
      expect(r.text).toContain("You are getting this about the card")
    }
  })
  it("a day email with no time and no person still has one button, a greeting and both calendar links", () => {
    for (const kind of ["date-set", "date-moved", "day-before", "date-confirm", "booking-confirmation"] as const) {
      const r = renderEmail(kind, { ...base, serviceName: "repair", visit: { ...visit, startTime: null, who: null } })!
      one(r.html)
      expect(r.html).toContain("Add to Google Calendar")
      expect(r.text).toMatch(/^Hi Andrea,$/m)
      expect(r.text).not.toMatch(/  |\.\s*\. /)
    }
  })
  it("a receipt with no lines, no day and no receipt link has one button and its footer", () => {
    const r = renderEmail("receipt", { ...base, amount: 145, serviceName: "repair", address: "412 Ash St", paidOn: "2027-05-05", card: null, paidBy: "cash", nextLine: "", receiptUrl: null })!
    one(r.html)
    expect(r.html).not.toContain("View the receipt")
    expect(r.text).toContain("You are getting this because a visit of yours was completed.")
  })
  it("a saved sentence that names the customer with no name stored never reads 'there, ...'", () => {
    for (const saved of ["{firstName}, your {service} is set for {day}.", "Thanks, {firstName}. Your {service} is set for {day}."]) {
      const r = renderEmail("date-set", { ...base, firstName: "", visit }, { "date-set:email": saved })!
      expect(r.text).toContain("Hi there,\n\n")
      expect(r.text).not.toMatch(/There,|there, your|Thanks, there/)
      expect(r.text).toMatch(/Your spring turn-on is set for Wednesday, May 5\.|Thanks\. Your spring turn-on is set for Wednesday, May 5\./)
    }
  })
  it("escapes an address or a name with quotes and ampersands in the facts, the picture alt and the lead", () => {
    const address = 'A & "B" <St>'
    const r = renderEmail("purchase-confirmation", { ...DATA["purchase-confirmation"], address, firstName: 'An"dr<ea' })!
    expect(r.html).toContain("A &amp; &quot;B&quot; &lt;St&gt;")
    expect(r.html).not.toContain("<St>")
    expect(r.html).not.toContain('"B"')
    const inv = renderEmail("invoice", { ...DATA.invoice, address })!
    expect(inv.html).toContain("A &amp; &quot;B&quot; &lt;St&gt;")
  })
  it("a long sign-in link wraps inside the card instead of running past it", () => {
    const r = signInEmail({ url: `${origin}/api/auth/callback/resend?token=${"a".repeat(200)}&callbackUrl=${encodeURIComponent(`${origin}/account`)}`, host: "www.trailheadirrigation.com" })
    expect(r.html).toContain("overflow-wrap:anywhere")
  })
  it("the plain-text twin of every email carries the HTML's one button link (or the account it opens)", () => {
    const kinds = [...(Object.keys(DATA) as (keyof typeof DATA)[]), "sign-in" as const]
    for (const k of kinds) {
      const r = k === "sign-in" ? signInEmail({ url: `${origin}/account/sign-in/verify?token=abc&b=c`, host: "www.trailheadirrigation.com" }) : renderEmail(k, DATA[k])!
      const href = r.html.match(/class="cta"[\s\S]*?<a href="([^"]+)"/)![1]!.replace(/&amp;/g, "&")
      // a Text Ryan button (sms:) is the phone number in the twin
      expect(r.text.includes(href) || (href.startsWith(`${origin}/account`) && r.text.includes(`${origin}/account`)) || (href.startsWith("sms:") && r.text.includes("(970) 692-7270"))).toBe(true)
    }
  })
})

describe("calendar links", () => {
  it("Google's link carries the Mountain time, a two-hour span, the title and the place", () => {
    const u = new URL(googleCalendarUrl(visit))
    expect(u.searchParams.get("dates")).toBe("20270505T080000/20270505T100000")
    expect(u.searchParams.get("ctz")).toBe("America/Denver")
    expect(u.searchParams.get("text")).toBe("Trailhead: your spring turn-on")
    expect(u.searchParams.get("location")).toBe("412 Ash St, Erie")
  })
  it("a visit with no time is an all-day event", () => {
    const u = new URL(googleCalendarUrl({ ...visit, startTime: null }))
    expect(u.searchParams.get("dates")).toBe("20270505/20270506")
  })
  it("the .ics is UTC from Mountain daylight time and escapes its text", () => {
    const ics = icsFile(visit, new Date("2027-04-20T15:00:00Z"), "https://x/y")
    expect(ics).toContain("DTSTART:20270505T140000Z")
    expect(ics).toContain("DTEND:20270505T160000Z")
    expect(ics).toContain("LOCATION:412 Ash St\\, Erie")
    expect(ics).toContain("UID:visit-v1@trailheadirrigation.com")
    expect(icsFile({ ...visit, day: "2027-12-01" }, new Date(), "u")).toContain("DTSTART:20271201T150000Z")
  })
})

describe("a rendered file to look at", () => {
  it("writes the purchase confirmation and a date email under .local-data/wiring/messages for a browser", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs")
    mkdirSync(".local-data/wiring/messages", { recursive: true })
    const local = (html: string) => html.replace(`${origin}/api/pass-image/p1?token=t`, "pass-image.png").replace(`${origin}/images/`, "../../../public/images/")
    writeFileSync(".local-data/wiring/messages/purchase-confirmation.html", local(renderEmail("purchase-confirmation", DATA["purchase-confirmation"])!.html))
    writeFileSync(".local-data/wiring/messages/purchase-confirmation-2.html", local(renderEmail("purchase-confirmation", TWO_DAYS)!.html))
    writeFileSync(".local-data/wiring/messages/date-set.html", local(renderEmail("date-set", DATA["date-set"])!.html))
  })
})

describe("the date-moved email for a move Ryan made", () => {
  it("says his line and, for a property that must be home, asks them to confirm", () => {
    const moved = renderEmail("date-moved", { ...base, visit: { ...visit, note: "Rain on Tuesday", asked: true } })!
    expect(moved.text).toContain("Rain on Tuesday.")
    expect(moved.text).toContain("please confirm that day works")
    const plain = renderEmail("date-moved", { ...base, visit })!
    expect(plain.text).not.toContain("please confirm")
  })
})
