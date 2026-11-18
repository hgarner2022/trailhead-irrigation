import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { defaultBody } from "@/emails/editable"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import { SAMPLE_KEYS, type SettingsState } from "./settings-model"
import { channelWord, editableRows, lockedWords, messageName, messageProblems, previewMessage, setMessage } from "./settings-messages"

const data = snapshot as AdminData
const state: SettingsState = { settings: data.settings, changes: [], keys: SAMPLE_KEYS, services: SERVICE_LIST as ServiceItem[] }
const actor = { who: "Hannah", at: "2026-11-18T19:56:30Z" }
const last = (s: SettingsState) => s.changes[s.changes.length - 1]
const row = (key: string, channel: "sms" | "email") => editableRows(state.settings.messages).find((m) => m.key === key && m.channel === channel)!

describe("the rows", () => {
  it("are the ten messages the office edits, each named and with its locked words", () => {
    const rows = editableRows(state.settings.messages)
    expect(rows.map(messageName)).toEqual(["Day set, text", "Day set, email", "Day moved, text", "Day moved, email", "Two weeks out, text", "Two weeks out, email", "Day before, text", "Day before, email", "On the way, text", "Invoice reminder, text"])
    expect(channelWord("sms")).toBe("Text")
    expect(channelWord("email")).toBe("Email")
    expect(lockedWords(row("day-before", "sms"))).toContain('Starts with "Trailhead:"')
    expect(lockedWords(row("day-before", "sms"))).toContain("Trailhead account")
    expect(lockedWords(row("day-before", "email"))).toContain("sign-off")
  })
  it("fill from the shipped words when nothing is saved", () => {
    expect(editableRows([])).toHaveLength(10)
    expect(editableRows([])[6]!.body).toBe(defaultBody("day-before", "sms"))
  })
})

describe("setMessage", () => {
  it("saves new words and logs the change by the row's name", () => {
    const next = setMessage(state, "day-before", "sms", "  {who} is coming tomorrow, {day}.  ", actor)
    expect(row("day-before", "sms").body).toBe(defaultBody("day-before", "sms"))
    expect(editableRows(next.settings.messages).find((m) => m.key === "day-before" && m.channel === "sms")!.body).toBe("{who} is coming tomorrow, {day}.")
    expect(last(next)).toMatchObject({ field: "Day before, text", to: "{who} is coming tomorrow, {day}." })
    expect(next.changes).toHaveLength(1)
  })
  it("changes nothing for words that break a rule, an unknown message or the same words", () => {
    expect(setMessage(state, "day-before", "sms", "see you {nope}", actor)).toBe(state)
    expect(setMessage(state, "day-before", "sms", "See you tomorrow!", actor)).toBe(state)
    expect(setMessage(state, "invoice-reminder", "sms", "a reminder", actor)).toBe(state)
    expect(setMessage(state, "receipt", "email", "Thanks", actor)).toBe(state)
    expect(setMessage(state, "day-before", "sms", defaultBody("day-before", "sms"), actor)).toBe(state)
  })
})

describe("messageProblems", () => {
  it("names each saved message that would not save, in the screen's words", () => {
    expect(messageProblems(state.settings)).toEqual([])
    const bad = { messages: [{ key: "day-before", channel: "sms" as const, body: "Come {when}", enabled: true }, { key: "date-set", channel: "email" as const, body: "Hi {firstName}.", enabled: true }] }
    expect(messageProblems(bad)).toEqual(["Day before, text: We don't know {when}."])
  })
})

describe("previewMessage", () => {
  it("shows a text exactly as sent, with its length and parts", () => {
    const p = previewMessage(row("day-before", "sms"), data)
    expect(p.text.startsWith("Trailhead: ")).toBe(true)
    expect(p.text.endsWith("Reply STOP to opt out.")).toBe(true)
    expect(p.text).toContain("is coming tomorrow")
    expect(p.text).toContain("Your Trailhead account: https://www.trailheadirrigation.com/account")
    expect(p.length).toBe(p.text.length)
    expect(p.parts).toBe(p.length <= 160 ? 1 : 2)
    expect(p.subject).toBeNull()
  })
  it("runs the invoice reminder text through the real renderer with a sample invoice", () => {
    const p = previewMessage(row("invoice-reminder", "sms"), data)
    expect(p.text).toBe("Trailhead: a reminder that $145 for the repair is still unpaid, due May 21. Pay here: https://www.trailheadirrigation.com/pay/sample?token=sample Reply STOP to opt out.")
  })
  it("shows an email's subject and plain text, built from the words in the row", () => {
    const edited = { ...row("date-set", "email"), body: "Hi {firstName}, you are on the list for {day}." }
    const p = previewMessage(edited, data)
    expect(p.subject).toMatch(/^Your .+ is .+/)
    expect(p.text).toContain("you are on the list for")
    expect(p.text).toContain("The Trailhead crew")
    expect(p.parts).toBeNull()
  })
  it("shows an edited text as the customer would get it", () => {
    const p = previewMessage({ ...row("on-the-way", "sms"), body: "{who} is five minutes out, {firstName}." }, data)
    expect(p.text).toMatch(/^Trailhead: Ryan is five minutes out, .+\. Your Trailhead account/)
  })
})
