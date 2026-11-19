// The one email frame (docs/plans/2026-11-18-email-template-design.md): table-based HTML that survives Outlook and Gmail.
// An email supplies its words and picks parts; it never writes a size, a colour or a margin. Four type sizes only (28 heading,
// 18 lead, 16 everything you read, 14 labels and footer), one web-safe font stack, one filled button, text links for the rest.
// Email cannot read CSS variables, so the brand hex values live in ONE block below; the design gate allows hex there and
// nowhere else under src/emails.
import { BUSINESS } from "./format"

// email-colors:start
export const EMAIL_COLORS = {
  navy: "#2B3544",
  charcoal: "#1E293B",
  primary: "#B45309",
  accent: "#D97706",
  primaryLight: "#F59E0B",
  cream: "#FAFAF8",
  stone: "#F5F5F4",
  border: "#E7E5E4",
  muted: "#78716C",
  quiet: "#57534E",
  white: "#FFFFFF",
  text: "#1E293B",
}
// email-colors:end

const C = EMAIL_COLORS

/** The one font stack, in every email: no client here loads a web font, so a named one would only make the look differ by client. */
export const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif"
/** The four sizes an email may use. */
export const SIZES = { heading: 28, lead: 18, body: 16, small: 14 } as const

export const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Outlook for Windows drops margin on a table, so the space after one is a row of its own. */
const spacer = (px: number, cols = 1) => `<tr><td${cols > 1 ? ` colspan="${cols}"` : ""} height="${px}" style="height:${px}px;font-size:1px;line-height:1px">&nbsp;</td></tr>`

const type = (size: number, line: number, color: string, extra = "") => `font-family:${FONT};font-size:${size}px;line-height:${line}px;color:${color};${extra}`

// ---- the greeting -------------------------------------------------------------------------------------------------------

/**
 * The name a greeting uses. The first word of what was stored (a full name is trimmed to its first name); a name typed all in
 * lower case or all in capitals gets its first letter capitalised and the rest lower ("andrea", "ANDREA" read "Andrea"), while
 * "McKay" and "O'Brien" stay as typed. A blank value, or one that is not made of letters (an email address, a digit, "N/A"), is not a name: null. Initials of three letters or fewer ("AJ") stay as typed.
 */
export function greetingName(firstName: string | null | undefined): string | null {
  const word = (firstName?.trim().split(/\s+/)[0] ?? "").replace(/[,.;:]+$/, "")
  if (!/^\p{L}[\p{L}'’-]*$/u.test(word)) return null
  // initials ("AJ", "DJ") stay as typed; a longer name typed all in lower case or all in capitals is capitalised
  const shouted = word === word.toUpperCase() && word.length > 3
  return shouted || word === word.toLowerCase() ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}` : word
}

/** "Hi Andrea,"; "Hi there," when no usable name is stored. The one greeting every customer email carries, on its own line under the heading. */
export const greetingLine = (firstName: string | null | undefined) => `Hi ${greetingName(firstName) ?? "there"},`

/** What a message says where a name goes in a sentence: the first name, or "there". */
export const nameOrThere = (firstName: string | null | undefined) => greetingName(firstName) ?? "there"

// ---- parts --------------------------------------------------------------------------------------------------------------

export const heading = (text: string) => `<h1 style="margin:0 0 16px;${type(SIZES.heading, 34, C.navy, "font-weight:700")}">${esc(text)}</h1>`

/** "Hi Andrea," on its own line. */
export const greeting = (firstName: string | null | undefined) => `<p style="margin:0 0 12px;${type(SIZES.body, 24, C.text)}">${esc(greetingLine(firstName))}</p>`

/** The one sentence that says what happened, to which service, at which address. */
export const lead = (text: string) => `<p style="margin:0 0 24px;${type(SIZES.lead, 28, C.text)}">${esc(text)}</p>`

/** A 16px paragraph: a note before the button, never after it. */
export const paragraph = (text: string) => `<p style="margin:0 0 16px;${type(SIZES.body, 24, C.text)}">${esc(text)}</p>`

/** A paragraph that carries markup the caller already escaped (a phone link inside a sentence). */
export const paragraphHtml = (inner: string) => `<p style="margin:0 0 16px;${type(SIZES.body, 24, C.text)}">${inner}</p>`

/** 14px quiet text, only where a fact needs it ("The link is good for 24 hours."). */
export const smallPrint = (text: string) => `<p style="margin:0 0 24px;${type(SIZES.small, 21, C.quiet, "overflow-wrap:anywhere;word-break:break-word")}">${esc(text)}</p>`

/**
 * The one button of an email: a one-cell table so Outlook paints it, 52px tall (16px of padding round a 20px line), a filled
 * orange-dark cell with white 16px bold text at 5.0:1. Left-aligned; full width on a phone where the media query runs.
 */
export function button(href: string, label: string): string {
  return `<table role="presentation" class="cta" cellpadding="0" cellspacing="0">${spacer(8)}<tr><td style="border-radius:8px;background:${C.primary};mso-padding-alt:16px 32px"><a href="${esc(href)}" style="display:inline-block;min-width:112px;padding:16px 32px;${type(SIZES.body, 20, C.white, "font-weight:700;text-decoration:none;text-align:center")}">${esc(label)}</a></td></tr>${spacer(16)}</table>`
}

/** Secondary actions under the button: text links, one per line. */
export function links(items: { href: string; label: string }[]): string {
  if (!items.length) return ""
  return `<p style="margin:0 0 24px;${type(SIZES.body, 28, C.text)}">${items.map((i) => `<a href="${esc(i.href)}" style="color:${C.primary};font-weight:700;text-decoration:underline">${esc(i.label)}</a>`).join("<br>")}</p>`
}

/** A list of facts: a 14px label (112px wide) and a 16px value, the same label column in every table of every email. */
export function facts(rows: [string, string][]): string {
  const cells = rows
    .map(([k, v]) => `<tr><td class="k" width="112" style="width:112px;padding:10px 12px 10px 0;border-top:1px solid ${C.border};${type(SIZES.small, 24, C.quiet, "vertical-align:top")}">${esc(k)}</td><td class="v" style="padding:10px 0;border-top:1px solid ${C.border};${type(SIZES.body, 24, C.text, "vertical-align:top")}">${esc(v)}</td></tr>`)
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}${spacer(24, 2)}</table>`
}

/** One row of the money table: a name (with an optional 14px detail under it) and an amount on the right. `quiet` for Subtotal and Sales tax. */
export interface MoneyRow {
  label: string
  value: string
  detail?: string
  quiet?: boolean
}

/** The money table: rows, then a bold Total under a 2px navy rule. */
export function moneyTable(rows: MoneyRow[], total: [string, string]): string {
  const cell = (quiet: boolean | undefined, extra: string) => `${type(SIZES.body, 24, quiet ? C.quiet : C.text, extra)}`
  const body = rows
    .map((r) => `<tr><td style="padding:12px 12px 12px 0;border-top:1px solid ${C.border};${cell(r.quiet, "vertical-align:top")}">${esc(r.label)}${r.detail ? `<br><span style="${type(SIZES.small, 21, C.quiet)}">${esc(r.detail)}</span>` : ""}</td><td align="right" style="padding:12px 0;border-top:1px solid ${C.border};${cell(r.quiet, "vertical-align:top;white-space:nowrap")}">${esc(r.value)}</td></tr>`)
    .join("")
  const strong = `border-top:2px solid ${C.navy};${type(SIZES.body, 24, C.text, "font-weight:700")}`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}<tr><td style="padding:12px 12px 12px 0;${strong}">${esc(total[0])}</td><td align="right" style="padding:12px 0;${strong}">${esc(total[1])}</td></tr>${spacer(24, 2)}</table>`
}

/** A block under a thin rule (one visit on the purchase confirmation): its parts are the ordinary ones above. */
export const ruled = (inner: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${C.border};padding:16px 0 0">${inner}</td></tr></table>`

/** A linked picture the width of the card's text column (the Season Pass card), with its alt text. */
export const picture = (src: string, alt: string, href: string) => `<p style="margin:0 0 24px"><a href="${esc(href)}"><img src="${esc(src)}" width="536" alt="${esc(alt)}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px"></a></p>`

/** A heading for a block inside the body (a visit on the purchase confirmation): body size, bold, navy. Never a second h1. */
export const blockTitle = (text: string) => `<p style="margin:0 0 4px;${type(SIZES.body, 24, C.navy, "font-weight:700")}">${esc(text)}</p>`

// ---- the frame ----------------------------------------------------------------------------------------------------------

export interface LayoutInput {
  origin: string
  /** the grey line an inbox shows beside the subject: 20 to 100 characters that add to the subject and the heading, never the lead; the frame pads it */
  preheader: string
  /** the h1: the fact in a few words */
  title: string
  /** the customer's stored first name, for the greeting line; leave out on a staff email and on the sign-in link, which carry no greeting */
  greet?: { firstName: string | null | undefined }
  /** the one sentence under the greeting */
  lead?: string
  /** the HTML after the lead, built from the parts above: facts, money table, a note, the one button, text links, small print */
  body: string
  /** one sentence saying why this arrived ("You are getting this because ..."), always */
  why: string
  /** the line above the footer: "The Trailhead crew" on every customer email, none on the office's own */
  signOff?: string
}

const PAD = "&zwnj;&nbsp;".repeat(40)

/** The phone rules: a progressive enhancement. A client that drops `<style>` still gets a readable two-column layout. */
const PHONE_CSS = `@media (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}.cta{width:100%!important}.cta a{display:block!important}.k,.v{display:block!important;width:auto!important}.k{padding-bottom:0!important}.v{border-top:0!important;padding-top:0!important}}`

export function emailLayout({ origin, preheader, title, greet, lead: leadText, body, why, signOff }: LayoutInput): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(BUSINESS.name)}</title><style>${PHONE_CSS}</style></head>
<body style="margin:0;padding:0;background:${C.stone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.stone}">${esc(preheader)}${PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.stone}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.white};border-radius:8px;overflow:hidden">
<tr><td class="px" style="background:${C.white};padding:12px 24px;border-bottom:4px solid ${C.accent}"><a href="${esc(origin)}" style="text-decoration:none"><img src="${esc(origin)}/images/logo-email.png" alt="${esc(BUSINESS.name)}" width="145" height="56" style="display:block;width:145px;height:56px;border:0"></a></td></tr>
<tr><td class="px" style="padding:32px 32px 8px">${heading(title)}${greet ? greeting(greet.firstName) : ""}${leadText ? lead(leadText) : ""}${body}</td></tr>
${signOff ? `<tr><td class="px" style="padding:0 32px 32px"><p style="margin:0;${type(SIZES.body, 24, C.text)}">${esc(signOff)}</p></td></tr>` : `<tr><td style="padding:0 0 8px"></td></tr>`}
<tr><td class="px" style="background:${C.cream};padding:24px 32px;border-top:1px solid ${C.border}">
<p style="margin:0 0 4px;${type(SIZES.small, 21, C.navy, "font-weight:700")}">${esc(BUSINESS.name)}</p>
<p style="margin:0;${type(SIZES.small, 21, C.quiet)}">${esc(BUSINESS.address)}<br><a href="${BUSINESS.phoneTel}" style="color:${C.quiet};text-decoration:underline">${esc(BUSINESS.phone)}</a><br>${esc(why)}</p>
</td></tr></table></td></tr></table></body></html>`
}

/** The plain-text twin of an email: the same lines, the sign-off when there is one, then the business footer. */
export const plainText = (lines: string[], signOff?: string, why?: string) => [...lines, ...(signOff ? ["", signOff] : []), "", BUSINESS.name, BUSINESS.address, BUSINESS.phone, ...(why ? [why] : [])].join("\n")

/** The greeting as plain-text lines: "Hi Andrea," and a blank line. */
export const greetingText = (firstName: string | null | undefined) => [greetingLine(firstName), ""]
