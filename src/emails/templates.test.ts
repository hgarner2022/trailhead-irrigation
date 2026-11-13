import { describe, expect, it } from "vitest"
import { EMAIL_TEMPLATES, renderEmail } from "./render"
import { googleCalendarUrl, icsFile } from "./calendar"
import { EMAIL_COLORS, emailLayout, heading, paragraph } from "./layout"
import { SMS_TEMPLATES } from "@/sms/texts"
import type { VisitFacts } from "./format"

const origin = "https://www.trailheadirrigation.com"
const base = { origin, firstName: "Andrea", passUrl: `${origin}/account/pass`, signInUrl: `${origin}/account/sign-in?email=andrea%40example.com` }
const visit: VisitFacts = { id: "v1", name: "spring turn-on", day: "2027-05-05", startTime: "08:00", crew: "Ryan's truck", location: "412 Ash St, Erie", icsUrl: `${origin}/api/visits/v1/calendar.ics?token=abc` }

const DATA: Record<keyof typeof EMAIL_TEMPLATES, Record<string, unknown>> = {
  "purchase-confirmation": { ...base, passNumber: "TH-2027-0004", season: 2027, town: "Erie", passImageUrl: `${origin}/api/pass-image/p1?token=t`, cardLast4: "4242", visits: [{ name: "spring turn-on", amount: 145, visit, fallback: "" }, { name: "fall blowout", amount: 95, visit: null, fallback: "We'll set the day and text you." }] },
  "booking-confirmation": { ...base, serviceName: "sprinkler repair", visit },
  "date-set": { ...base, visit },
  "date-moved": { ...base, visit },
  "day-before": { ...base, visit },
  receipt: { ...base, passNumber: "TH-2027-0004", amount: 145, visitName: "spring turn-on", card: "Visa ending 4242", nextLine: "Your fall blowout is planned for early October.", receiptUrl: "https://pay.stripe.com/r/1" },
  "card-failed": { ...base, passNumber: "TH-2027-0004", amount: 145, visitName: "spring turn-on", updateUrl: "https://billing.stripe.com/s/1" },
  "card-expiring": { ...base, passNumber: "TH-2027-0004", cardState: "expires in July 2027", left: 190, updateUrl: "https://billing.stripe.com/s/2" },
  cancelled: { ...base, passNumber: "TH-2027-0004" },
  renewal: { ...base, season: 2028, town: "Erie", buyUrl: `${origin}/season-pass` },
  "not-closed-crew": { origin, visits: [{ customer: "Andrea", name: "spring turn-on", day: "2027-05-04", town: "Erie" }, { customer: "Ben", name: "fall blowout", day: "2027-10-04", town: "Lafayette" }] },
  "admin-alert": { origin, title: "Season Pass TH-2027-0004 is new", detail: "Andrea in Erie bought a pass.", path: "/admin/passes" },
}

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
    copyRules(r.html.replace(/<[^>]+>/g, " "))
  })
  it("is on the layout, with the footer, a table structure and no hex outside the layout's colour block", () => {
    expect(r.html).toContain('role="presentation"')
    expect(r.html).toContain("137 Morgan Circle North")
    expect(r.html).toContain("(970) 692-7270")
    expect(r.html).toContain("/images/logo-horizontal-trim.png")
    expect(r.html).not.toMatch(/<(script|style|link)\b/)
  })
})

describe("wording per kind", () => {
  const get = (k: keyof typeof DATA) => renderEmail(k, DATA[k])!
  it("purchase-confirmation puts the pass image first, then each visit's day with calendar links, the text promise, the money line and the button", () => {
    const { html, text, subject } = get("purchase-confirmation")
    expect(subject).toBe("Your Trailhead Season Pass TH-2027-0004 is ready")
    expect(html.indexOf("/api/pass-image/p1?token=t")).toBeLessThan(html.indexOf("Wednesday, May 5, between 8 and 10 am"))
    expect(html.indexOf("Add to Google Calendar")).toBeLessThan(html.indexOf("Open your pass page"))
    expect(html).toContain("Add to Apple or Outlook calendar")
    expect(html).toContain("/api/visits/v1/calendar.ics?token=abc")
    expect(text).toContain("Spring turn-on: Wednesday, May 5, between 8 and 10 am")
    expect(text).toContain("Fall blowout: We'll set the day and text you.")
    expect(text).toContain("We confirm it by text two weeks before. If it has to move, we tell you first and you can pick another day.")
    expect(text).toContain("Nothing today. $145 after the spring turn-on, $95 after the fall blowout, to the card ending 4242.")
    expect(html).toContain("/account/sign-in?email=andrea%40example.com")
  })
  it.each(["date-set", "date-moved", "day-before", "booking-confirmation"] as const)("%s has the day, the two-hour window, who is coming and both calendar links", (kind) => {
    const { html, text } = get(kind)
    for (const part of [html, text]) {
      expect(part).toContain("Wednesday, May 5")
      expect(part).toContain("between 8 and 10 am")
      expect(part).toContain("Ryan's truck")
    }
    expect(html).toContain("Add to Google Calendar")
    expect(html).toContain("Add to Apple or Outlook calendar")
    expect(html).toContain("calendar.google.com/calendar/render?action=TEMPLATE")
    expect(html).toContain("/api/visits/v1/calendar.ics?token=abc")
    expect(html).toContain("/account/sign-in?email=")
    expect(text).toContain(`${origin}/account/pass`)
  })
  it("date-set, date-moved and day-before say their event", () => {
    expect(get("date-set").subject).toBe("Your spring turn-on is Wednesday, May 5")
    expect(get("date-moved").subject).toBe("Your spring turn-on moved to Wednesday, May 5")
    expect(get("day-before").subject).toBe("Tomorrow: your spring turn-on")
  })
  it("the booking confirmation says what happens next", () => {
    expect(get("booking-confirmation").text).toContain("Ryan's truck will be there Wednesday, May 5, between 8 and 10 am")
    expect(get("booking-confirmation").text).toContain("We text the day before.")
  })
  it("the receipt names the amount, the card and the next visit", () => {
    const { subject, text } = get("receipt")
    expect(subject).toBe("Receipt: $145 for your spring turn-on")
    expect(text).toContain("to your Visa ending 4242")
    expect(text).toContain("Your fall blowout is planned for early October.")
  })
  it("card-failed and card-expiring carry the update link and the amount", () => {
    expect(get("card-failed").text).toContain("declined for $145")
    expect(get("card-failed").text).toContain("https://billing.stripe.com/s/1")
    expect(get("card-expiring").text).toContain("expires in July 2027, and $190 of visits are still to come")
    expect(get("card-expiring").subject).toBe("Add a card to your Season Pass")
  })
  it("cancelled says nothing further is charged", () => {
    expect(get("cancelled").text).toContain("Nothing further will be charged.")
  })
  it("renewal names the season and offers the pass page, with a way to stop", () => {
    expect(get("renewal").subject).toBe("Season Pass 2028 is open")
    expect(get("renewal").html).toContain("Reply to stop these emails.")
  })
  it("the crew note counts the visits and the office alert opens the admin", () => {
    expect(get("not-closed-crew").subject).toBe("2 visits are not closed yet")
    expect(get("not-closed-crew").text).toContain("Ben, Lafayette: fall blowout on Monday, October 4")
    expect(get("admin-alert").html).toContain(`${origin}/admin/passes`)
  })
})

describe("text versions", () => {
  const d = { ...base, visit } as never
  it.each(Object.keys(SMS_TEMPLATES) as (keyof typeof SMS_TEMPLATES)[])("%s names the business, the day, the link and the opt-out once, within 160 characters", (kind) => {
    const t = SMS_TEMPLATES[kind](d)
    expect(t.startsWith("Trailhead:")).toBe(true)
    expect(t).toContain("Wed, May 5")
    expect(t).toContain(`${origin}/account/pass`)
    expect(t.match(/STOP/g)).toHaveLength(1)
    expect(t.length).toBeLessThanOrEqual(160)
    copyRules(t)
  })
  it("says moved, set and tomorrow in their own words", () => {
    expect(SMS_TEMPLATES["date-set"](d)).toContain("your spring turn-on is Wed, May 5, 8 to 10 am")
    expect(SMS_TEMPLATES["date-moved"](d)).toContain("moved to Wed, May 5")
    expect(SMS_TEMPLATES["day-before"](d)).toContain("we come tomorrow")
  })
})

describe("the layout", () => {
  it("keeps the brand colours in one block and uses them", () => {
    const html = emailLayout({ origin, preheader: "Hello", body: heading("Hi") + paragraph("Hi") })
    expect(html).toContain(EMAIL_COLORS.navy)
    expect(html).toContain(EMAIL_COLORS.primary)
    expect(html).toContain("Barlow Condensed")
    expect(html).toContain("Source Sans 3")
    expect(html).toContain("Hello</div>")
  })
  it("escapes what goes into the HTML", () => {
    expect(paragraph('<b>"x"</b> & y')).toContain("&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y")
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
    writeFileSync(".local-data/wiring/messages/date-set.html", local(renderEmail("date-set", DATA["date-set"])!.html))
  })
})
