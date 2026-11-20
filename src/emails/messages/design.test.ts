import { describe, expect, it } from "vitest"
import { BUSINESS } from "../format"
import { COLOURS, contrast } from "./design-rules"
import { MESSAGES } from "./catalog"
import { voiceProblems } from "./voice"

// The proposed layout and every message on it: the structure each email must have, that no fact of the live email was lost, and the voice rules on every proposed
// email and every text (including the prototypes).

const PASS = new Set(["purchase-confirmation", "renewal", "cancelled", "not-closed-crew", "admin-alert"])
const withEmail = MESSAGES.filter((m) => m.proposed)
/** the numbers, days and times a message states: none may vanish in the redesign */
const FACTS = /\$\d+(?:,\d{3})*|(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, \w+ \d+|\d{1,2}:\d\d [ap]m|INV-[\d-]+|R-[0-9A-Z]+|TH-[\d-]+|\(970\) 692-7270/g
const tokens = (text: string) => new Set(text.match(FACTS) ?? [])

describe.each(withEmail)("proposed $name", (m) => {
  const email = m.proposed!()
  const body = email.html.replace(/<style>[\s\S]*?<\/style>/, "")

  it("has the structure: one h1, one primary button or none, lang, both colour schemes, the footer and a plain-text twin", () => {
    expect((email.html.match(/<h1/g) ?? []).length).toBe(1)
    expect((email.html.match(/class="cta"/g) ?? []).length).toBeLessThanOrEqual(1)
    expect(email.html).toContain('<html lang="en">')
    expect(email.html).toContain('<meta name="color-scheme" content="light dark">')
    expect(email.html).toContain("prefers-color-scheme:dark")
    expect(email.html).toContain(BUSINESS.address)
    expect(email.html).toContain(BUSINESS.phone)
    expect(email.html).toMatch(/<img src="[^"]+logo-horizontal-trim\.png" alt="Trailhead Lawn &amp; Irrigation"/)
    expect(email.text).toContain(BUSINESS.address)
    expect(email.text.split("\n").length).toBeGreaterThan(8)
  })

  it("uses only the five sizes", () => {
    const sizes = new Set([...body.matchAll(/font-size:(\d+)px/g)].map((x) => Number(x[1])).filter((n) => n > 1))
    for (const n of sizes) expect([32, 28, 18, 16, 14]).toContain(n)
  })

  it("keeps money in tabular figures when it shows any", () => {
    if (body.includes('class="sum"') && /\$\d/.test(body)) expect(body).toContain("tabular-nums")
  })

  it("follows the voice rules", () => {
    expect(voiceProblems({ channel: "email", words: `${email.subject}\n${email.text}`, mayNamePass: PASS.has(m.kind) })).toEqual([])
  })

  it("loses no number, day, time, number or phone the live email states", () => {
    const live = m.current?.()
    if (!live) return
    const proposed = tokens(`${email.subject}\n${email.text}`)
    const lost = [...tokens(`${live.subject}\n${live.text}`)].filter((t) => !proposed.has(t))
    expect(lost).toEqual([])
  })
})

describe.each(MESSAGES.filter((m) => m.text))("the text of $name", (m) => {
  it("follows the voice rules, and ends with the STOP line only when it is the first text", () => {
    const first = m.text!(true)
    const later = m.text!(false)
    expect(voiceProblems({ channel: "text", words: later })).toEqual([])
    expect(voiceProblems({ channel: "text", words: first })).toEqual([])
    expect(later.includes("Reply STOP to opt out.")).toBe(false)
    if (m.klass !== "to the crew") expect(first.endsWith("Reply STOP to opt out.")).toBe(true)
    else expect(first.includes("Reply STOP")).toBe(false)
  })
})

describe("the colours of the layout", () => {
  it("pass the contrast each pair needs (4.5:1 for text)", () => {
    for (const c of COLOURS) if (c.on && c.need) expect(contrast(c.value, c.on.value), `${c.role}`).toBeGreaterThanOrEqual(c.need)
  })
})
