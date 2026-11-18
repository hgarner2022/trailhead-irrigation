import { describe, expect, it } from "vitest"
import { EDITABLE_MESSAGES, PLACEHOLDERS, PLACEHOLDER_NAMES, bodyOf, defaultBody, fillTemplate, messagesWith, migratePlaceholders, overridesOf, templateProblem, textParts } from "./editable"

const fill = { firstName: "Andrea", service: "fall blowout", address: "480 Briggs St", day: "Fri, Oct 14", window: "8 to 10 am", who: "Ryan" }

describe("the editable messages", () => {
  it("are the day-of voice and the invoice reminder text, each with the shipped words and a rule-free default", () => {
    expect(EDITABLE_MESSAGES.map((m) => `${m.key}:${m.channel}`)).toEqual([
      "date-set:sms", "date-set:email", "date-moved:sms", "date-moved:email", "date-confirm:sms", "date-confirm:email", "day-before:sms", "day-before:email", "on-the-way:sms", "invoice-reminder:sms",
    ])
    for (const m of EDITABLE_MESSAGES) expect(templateProblem(m.key, m.channel, m.body)).toBeNull()
  })
  it("use only the placeholders the screen lists, which are the plain words", () => {
    expect(PLACEHOLDER_NAMES).toEqual(["firstName", "service", "address", "day", "window", "who", "amount", "due", "payLink"])
    for (const m of EDITABLE_MESSAGES) for (const [, name] of m.body.matchAll(/\{(\w+)\}/g)) expect(PLACEHOLDER_NAMES).toContain(name)
  })
  it("never say truck, bill, owed or overdue", () => {
    for (const m of EDITABLE_MESSAGES) expect(m.body).not.toMatch(/truck|\bbill|owed|overdue|\{(visit|date|truck|nextVisit)\}/i)
  })
  it("describe each placeholder in words a person may read: {amount} is what is unpaid, never owed", () => {
    expect(PLACEHOLDERS.find((p) => p.name === "amount")!.about).toBe('what is unpaid: "$145"')
    for (const p of PLACEHOLDERS) expect(p.about).not.toMatch(/truck|\bbill|\bowed?\b|overdue/i)
    for (const m of EDITABLE_MESSAGES) expect(m.locked).not.toMatch(/truck|\bbill|\bowed?\b|overdue/i)
  })
})

describe("fillTemplate", () => {
  it("fills every placeholder", () => {
    expect(fillTemplate(defaultBody("day-before", "sms"), fill)).toBe("Ryan is coming tomorrow, Fri, Oct 14, 8 to 10 am, for your fall blowout.")
  })
  it("reads 'We're' for an empty who, leaves out the sentence that says who will be there, and drops an empty window", () => {
    expect(fillTemplate(defaultBody("day-before", "sms"), { ...fill, who: null })).toBe("We're coming tomorrow, Fri, Oct 14, 8 to 10 am, for your fall blowout.")
    expect(fillTemplate(defaultBody("date-set", "sms"), { ...fill, who: null, window: null })).toBe("your fall blowout is Fri, Oct 14.")
    expect(fillTemplate(defaultBody("day-before", "email"), { ...fill, who: null, day: "Friday, October 14" })).toBe("A reminder that we're coming tomorrow, Friday, October 14, for your fall blowout.")
  })
  it("leaves a placeholder it does not know as written", () => {
    expect(fillTemplate("Your {truck} day, {firstName}.", fill)).toBe("Your {truck} day, Andrea.")
  })
})

describe("templateProblem", () => {
  it("refuses an unknown placeholder, an em dash and an exclamation mark, in the screen's words", () => {
    expect(templateProblem("date-set", "sms", "your {visit} is {day}")).toBe("We don't know {visit}.")
    expect(templateProblem("date-set", "sms", "your {service} is {day} — see you")).toMatch(/em dash/)
    expect(templateProblem("date-set", "email", "Hi {firstName}, see you!")).toBe("Take out the exclamation mark.")
    expect(templateProblem("date-set", "sms", "  ")).toBe("Write something for the message.")
  })
  it("refuses curly quotes and accents in a text, and allows them in an email", () => {
    expect(templateProblem("date-set", "sms", "we’ll be there on {day}")).toMatch(/plain letters/)
    expect(templateProblem("date-set", "email", "Hi {firstName}, we’ll be there on {day}.")).toBeNull()
  })
  it("refuses a placeholder the message never fills, the locked opening and opt-out typed in, and a text that would run past two parts", () => {
    expect(templateProblem("date-set", "sms", "Hi {firstName}, your {service} is {day}.")).toBe("{firstName} is not filled in the day set, text.")
    expect(templateProblem("date-set", "sms", "pay {payLink}")).toMatch(/not filled/)
    expect(templateProblem("invoice-reminder", "sms", "{amount} for the {service} is due {due}. Pay here: {payLink} and {day}")).toMatch(/\{day\} is not filled/)
    expect(templateProblem("date-set", "sms", "Trailhead here. See you {day}.")).toMatch(/already starts with/)
    expect(templateProblem("date-set", "sms", "See you {day}. Reply STOP to stop.")).toMatch(/opt out/)
    expect(templateProblem("date-set", "sms", `${"x".repeat(301)}`)).toMatch(/under 300/)
    expect(templateProblem("date-set", "email", "Hi {firstName}, see you {day}. Reply STOP to stop.")).toBeNull()
  })
  it("makes the invoice reminder keep {amount} and {payLink}", () => {
    expect(templateProblem("invoice-reminder", "sms", "a reminder, pay here: {payLink}")).toBe("Keep {amount} in the invoice reminder, text.")
    expect(templateProblem("invoice-reminder", "sms", "a reminder that {amount} is unpaid")).toBe("Keep {payLink} in the invoice reminder, text.")
    expect(templateProblem("invoice-reminder", "sms", "{amount} unpaid, pay here: {payLink}")).toBeNull()
  })
  it("refuses a message the office does not edit", () => {
    expect(templateProblem("receipt", "email", "Thank you")).toMatch(/not one the office edits/)
    expect(templateProblem("invoice", "sms", "x")).toMatch(/not one the office edits/)
  })
})

describe("saved templates", () => {
  it("read an older saved template in today's placeholders: {visit} is {service}, {date} is {day}, {truck} and {nextVisit} go", () => {
    expect(migratePlaceholders("Hi {firstName}, your {visit} is booked for {date}.")).toBe("Hi {firstName}, your {service} is booked for {day}.")
    expect(migratePlaceholders("Your {truck} comes {date}.")).toBe("Your comes {day}.")
    expect(migratePlaceholders("See you soon {nextVisit}.")).toBe("See you soon.")
  })
  it("apply only where they pass the rules, so a bad save never breaks a send", () => {
    const overrides = overridesOf([
      { key: "day-before", channel: "sms", body: "{who} is on the way tomorrow, {day}." },
      { key: "date-set", channel: "sms", body: "bad {nope}" },
      { key: "receipt", channel: "email", body: "hijack" },
      { key: "date-moved", channel: "email", body: "Hi {firstName}, your {visit} moved to {date}." },
    ])
    expect(bodyOf(overrides, "day-before", "sms")).toBe("{who} is on the way tomorrow, {day}.")
    expect(bodyOf(overrides, "date-set", "sms")).toBe(defaultBody("date-set", "sms"))
    expect(bodyOf(overrides, "date-moved", "email")).toBe("Hi {firstName}, your {service} moved to {day}.")
    expect(Object.keys(overrides)).toHaveLength(2)
  })
  it("ignore the six drafts the first version of the screen seeded into the live organization, so the shipped words stay in use", () => {
    const old = [
      { key: "date-set", channel: "email" as const, body: "Hi {firstName}, your {visit} is booked for {date}. {who} will be there. If that day does not work, reply to this email and we will find another.", enabled: true },
      { key: "day-before", channel: "sms" as const, body: "Trailhead here. {who} will be there tomorrow, {date}, for your {visit}. Please leave the gate unlatched and the controller reachable. Reply STOP to stop texts.", enabled: true },
      { key: "on-the-way", channel: "sms" as const, body: "Trailhead is on the way for your {visit}. We will be there within the hour.", enabled: true },
    ]
    expect(overridesOf(old)).toEqual({})
    expect(messagesWith(old).find((m) => m.key === "date-set" && m.channel === "email")!.body).toBe(defaultBody("date-set", "email"))
  })
  it("fill the list the screen shows: every editable message, saved words on top, nothing else", () => {
    const rows = messagesWith([{ key: "day-before", channel: "sms", body: "{who} is coming {day}.", enabled: true }, { key: "purchase-confirmation", channel: "email", body: "old", enabled: true }])
    expect(rows).toHaveLength(10)
    expect(rows.find((r) => r.key === "day-before" && r.channel === "sms")!.body).toBe("{who} is coming {day}.")
    expect(rows.find((r) => r.key === "date-set" && r.channel === "sms")!.body).toBe(defaultBody("date-set", "sms"))
    expect(rows.some((r) => (r.key as string) === "purchase-confirmation")).toBe(false)
    expect(messagesWith(undefined)).toHaveLength(10)
  })
})

describe("textParts", () => {
  it("counts 160 characters as one part and 153 for each part of a longer text", () => {
    expect(textParts("x".repeat(160))).toBe(1)
    expect(textParts("x".repeat(161))).toBe(2)
    expect(textParts("x".repeat(306))).toBe(2)
    expect(textParts("x".repeat(307))).toBe(3)
  })
})
