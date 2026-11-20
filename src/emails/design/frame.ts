// The PROPOSED email layout (docs/plans/2026-11-20-customer-messages-inventory.md section 6). Nothing live imports this: the live emails still go through
// src/emails/layout.ts until Hannah approves the design, then the swap plan in the inventory doc moves them here.
//
// One frame, string-built like the live one (tables, inline styles, one head <style> for the phone and dark-mode rules). A message supplies its words
// and picks parts; it never writes a size, a colour or a margin. Every part returns its HTML and its plain-text lines together, so the two never drift.
// Colours are the brand block in layout.ts (EMAIL_COLORS), dark mode included: no new hex.
import { ACCOUNT_NAME, BUSINESS } from "../format"
import { EMAIL_COLORS as C, esc } from "../layout"

/** Body face. No client here loads a web font, so Helvetica Neue / Helvetica / Arial is what is read; Source Sans 3 leads the stack for the clients that have it. */
export const BODY = "'Source Sans 3','Helvetica Neue',Helvetica,Arial,sans-serif"
/** Headline face: Barlow Condensed is the site's headline face but is not installed on a phone, so Arial Narrow stands in (the clients that have neither show Arial). */
export const HEAD = "'Barlow Condensed','Arial Narrow','Helvetica Neue Condensed',Arial,sans-serif"
/** The five sizes an email may use: the headline, the key figure of the summary, the lead sentence, everything read, labels and the footer. */
export const SIZES = { headline: 32, key: 28, lead: 18, body: 16, small: 14 } as const

/** A part of the body: its HTML and its plain-text lines. */
export interface Part {
  html: string
  text: string[]
}

const TNUM = "font-variant-numeric:tabular-nums;font-feature-settings:'tnum'"
const t = (size: number, line: number, color: string, extra = "") => `font-family:${BODY};font-size:${size}px;line-height:${line}px;color:${color};${extra}`
const spacer = (px: number) => `<tr><td height="${px}" style="height:${px}px;font-size:1px;line-height:1px">&nbsp;</td></tr>`
const dot = (text: string) => esc(text)

// ---- text parts -----------------------------------------------------------------------------------------------------------

export const headline = (text: string): Part => ({
  html: `<h1 class="hl" style="margin:0 0 12px;font-family:${HEAD};mso-font-alt:'Arial Narrow';font-size:${SIZES.headline}px;line-height:36px;font-weight:700;color:${C.navy}">${dot(text)}</h1>`,
  text: [text, ""],
})
export const greeting = (line: string): Part => ({ html: `<p class="ink" style="margin:0 0 12px;${t(SIZES.body, 24, C.text)}">${dot(line)}</p>`, text: [line, ""] })
/** The one sentence that says what happened, to which service, at which address. */
export const lead = (text: string): Part => ({ html: `<p class="ink" style="margin:0 0 24px;${t(SIZES.lead, 28, C.text)}">${dot(text)}</p>`, text: [text, ""] })
export const paragraph = (text: string): Part => ({ html: `<p class="ink" style="margin:0 0 16px;${t(SIZES.body, 24, C.text)}">${dot(text)}</p>`, text: [text, ""] })
/** A paragraph with a phone link inside (the caller escapes what it passes). */
export const paragraphHtml = (inner: string, plain: string): Part => ({ html: `<p class="ink" style="margin:0 0 16px;${t(SIZES.body, 24, C.text)}">${inner}</p>`, text: [plain, ""] })
export const small = (text: string): Part => ({ html: `<p class="q" style="margin:0 0 24px;${t(SIZES.small, 21, C.quiet, "overflow-wrap:anywhere;word-break:break-word")}">${dot(text)}</p>`, text: [text, ""] })

// ---- the summary ----------------------------------------------------------------------------------------------------------

export interface SummaryInput {
  /** the figure a person opened the email for: what is owed, what was paid, when someone comes */
  key?: { label: string; value: string; note?: string }
  /** label and value rows: Invoice, Where, Done */
  facts?: [string, string][]
  /** money rows, each with an optional 14px detail under its name ("2 x $10"), and what comes under them */
  lines?: { label: string; value: string; detail?: string }[]
  totals?: { label: string; value: string }[]
  total?: [string, string]
}

const WRAP = `border:1px solid ${C.border};border-radius:8px;background:${C.cream};border-collapse:separate`

/** The quiet bordered block: the key figure on top, then facts, then the money rows with a ruled bold total. Amounts are right-aligned in tabular figures. */
export function summary(s: SummaryInput): Part {
  const sections: string[] = []
  const text: string[] = []
  if (s.key) {
    sections.push(`<td class="sp" style="padding:20px 20px 16px"><p class="q" style="margin:0 0 4px;${t(SIZES.small, 21, C.quiet)}">${dot(s.key.label)}</p><p class="kf" style="margin:0;${t(SIZES.key, 34, C.navy, `font-weight:700;${TNUM}`)}">${dot(s.key.value)}</p>${s.key.note ? `<p class="ink" style="margin:4px 0 0;${t(SIZES.body, 24, C.text)}">${dot(s.key.note)}</p>` : ""}</td>`)
    text.push(`${s.key.label}: ${s.key.value}${s.key.note ? ` (${s.key.note})` : ""}`)
  }
  const rule = `border-top:1px solid ${C.border}`
  if (s.facts?.length) {
    const rows = s.facts
      .map(([k, v]) => `<tr><td class="k q" width="104" style="width:104px;padding:6px 12px 6px 0;${t(SIZES.small, 24, C.quiet, "vertical-align:top")}">${dot(k)}</td><td class="v ink" style="padding:6px 0;${t(SIZES.body, 24, C.text, `vertical-align:top;${TNUM}`)}">${dot(v)}</td></tr>`)
      .join("")
    sections.push(`<td class="sp rl" style="padding:10px 20px 10px;${s.key ? rule : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td>`)
    text.push(...s.facts.map(([k, v]) => `${k}: ${v}`))
  }
  if (s.lines?.length) {
    const money = (extra: string) => t(SIZES.body, 24, C.text, `${extra};${TNUM}`)
    const body = s.lines
      .map((l) => `<tr><td class="ink" style="padding:8px 12px 8px 0;${money("vertical-align:top")}">${dot(l.label)}${l.detail ? `<br><span class="q" style="${t(SIZES.small, 21, C.quiet)}">${dot(l.detail)}</span>` : ""}</td><td class="ink" align="right" style="padding:8px 0;${money("vertical-align:top;white-space:nowrap")}">${dot(l.value)}</td></tr>`)
      .join("")
    const totals = (s.totals ?? [])
      .map((r) => `<tr><td class="q" style="padding:4px 12px 4px 0;${t(SIZES.body, 24, C.quiet, TNUM)}">${dot(r.label)}</td><td class="q" align="right" style="padding:4px 0;${t(SIZES.body, 24, C.quiet, `white-space:nowrap;${TNUM}`)}">${dot(r.value)}</td></tr>`)
      .join("")
    const strong = s.total ? `<tr><td class="ink tr" style="padding:10px 12px 0 0;border-top:2px solid ${C.navy};${t(SIZES.body, 24, C.text, `font-weight:700;${TNUM}`)}">${dot(s.total[0])}</td><td class="ink tr" align="right" style="padding:10px 0 0;border-top:2px solid ${C.navy};${t(SIZES.body, 24, C.text, `font-weight:700;white-space:nowrap;${TNUM}`)}">${dot(s.total[1])}</td></tr>` : ""
    sections.push(`<td class="sp rl" style="padding:12px 20px 14px;${s.key || s.facts?.length ? rule : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}${totals}${strong}</table></td>`)
    const width = 44
    const pad = (a: string, b: string) => `${a}${" ".repeat(Math.max(2, width - a.length - b.length))}${b}`
    text.push("", ...s.lines.map((l) => pad(l.label + (l.detail ? ` (${l.detail})` : ""), l.value)), ...(s.totals ?? []).map((r) => pad(r.label, r.value)), ...(s.total ? [pad(s.total[0], s.total[1])] : []))
  }
  const html = `<table role="presentation" class="sum" width="100%" cellpadding="0" cellspacing="0" style="${WRAP}">${sections.map((cell) => `<tr>${cell}</tr>`).join("")}</table>${`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${spacer(24)}</table>`}`
  return { html, text: [...text, ""] }
}

// ---- actions --------------------------------------------------------------------------------------------------------------

/**
 * The one button: a one-cell table (Outlook paints the cell), 44px tall (12px of padding round a 20px line), filled brand orange with white 16px bold
 * text at 5.0:1, left-aligned, full width on a phone. The label says what happens.
 */
export function button(href: string, label: string): Part {
  return {
    html: `<table role="presentation" class="cta" cellpadding="0" cellspacing="0">${spacer(4)}<tr><td class="btn" style="border-radius:8px;background:${C.primary};mso-padding-alt:12px 28px"><a href="${esc(href)}" style="display:block;min-width:120px;padding:12px 28px;${t(SIZES.body, 20, C.white, "font-weight:700;text-decoration:none;text-align:center")}">${dot(label)}</a></td></tr>${spacer(20)}</table>`,
    text: [`${label}: ${href}`, ""],
  }
}

/** Secondary actions under the button: text links, one per line, never buttons. */
export function links(items: { href: string; label: string }[]): Part {
  if (!items.length) return { html: "", text: [] }
  return {
    html: `<p style="margin:0 0 24px;${t(SIZES.body, 28, C.text)}">${items.map((i) => `<a class="lnk" href="${esc(i.href)}" style="color:${C.primary};font-weight:700;text-decoration:underline">${dot(i.label)}</a>`).join("<br>")}</p>`,
    text: [...items.map((i) => `${i.label}: ${i.href}`), ""],
  }
}

/** What to do when the button does not work, for the one-time sign-in link: the address in its own small block, free to wrap. */
export const fallbackLink = (url: string): Part => ({
  html: `<p class="q" style="margin:0 0 24px;${t(SIZES.small, 21, C.quiet, "overflow-wrap:anywhere;word-break:break-word")}">If the button doesn't work, paste this link into your browser:<br><a class="lnk" href="${esc(url)}" style="color:${C.primary};text-decoration:underline">${dot(url)}</a></p>`,
  text: ["If the button doesn't work, paste this link into your browser:", url, ""],
})

// ---- the frame ------------------------------------------------------------------------------------------------------------

export interface Doc {
  origin: string
  /** the grey line an inbox shows beside the subject: adds to the subject and the headline, never the lead; the frame pads it */
  preheader: string
  title: string
  /** "Hi Andrea,": a greeting line; leave out on a staff email and on the sign-in link */
  greeting?: string
  lead?: string
  parts: Part[]
  /** one sentence saying why this arrived, always */
  why: string
  /** "The Trailhead crew" on every customer email, none on the office's own */
  signOff?: string
  /** the customer's account page for the footer link; left out on the office's own emails */
  accountUrl?: string
  /** marketing only: the opt-out link */
  unsubscribeUrl?: string
}

const PAD = "&zwnj;&nbsp;".repeat(40)

/** The phone rules and the dark palette. Both are progressive: a client that drops `<style>` still gets the readable light two-column layout from the inline styles. */
const STYLE = `@media (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}.cta{width:100%!important}.cta td{display:block!important}.k,.v{display:block!important;width:auto!important}.k{padding-bottom:0!important}.v{padding-top:0!important}.hl{font-size:30px!important}}@media (prefers-color-scheme:dark){body,.pg{background:${C.charcoal}!important}.card{background:${C.navy}!important}.hl,.kf,.tr{color:${C.white}!important}.ink{color:${C.cream}!important}.q{color:${C.border}!important}.sum{background:${C.charcoal}!important;border-color:${C.muted}!important}.rl{border-color:${C.muted}!important}.lnk{color:${C.primaryLight}!important}.ft{background:${C.charcoal}!important;border-color:${C.muted}!important}.ft a{color:${C.border}!important}}`

export function compose(d: Doc): { html: string; text: string } {
  const head = [headline(d.title), ...(d.greeting ? [greeting(d.greeting)] : []), ...(d.lead ? [lead(d.lead)] : []), ...d.parts]
  const footerLinks = [`<a href="${BUSINESS.phoneTel}" style="color:${C.quiet};text-decoration:underline">${esc(BUSINESS.phone)}</a>`, ...(d.accountUrl ? [`<a href="${esc(d.accountUrl)}" style="color:${C.quiet};text-decoration:underline">Your ${ACCOUNT_NAME}</a>`] : [])]
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(BUSINESS.name)}</title><style>${STYLE}</style></head>
<body class="pg" style="margin:0;padding:0;background:${C.stone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.stone}">${esc(d.preheader)}${PAD}</div>
<table role="presentation" class="pg" width="100%" cellpadding="0" cellspacing="0" style="background:${C.stone}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.white};border-radius:8px;overflow:hidden">
<tr><td class="px" style="background:${C.white};padding:20px 32px 16px"><a href="${esc(d.origin)}" style="text-decoration:none"><img src="${esc(d.origin)}/images/logo-horizontal-trim.png" alt="${esc(BUSINESS.name)}" width="190" height="59" style="display:block;width:190px;height:59px;border:0"></a></td></tr>
<tr><td style="padding:0;font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="64" height="4" style="width:64px;height:4px;background:${C.accent};font-size:0;line-height:0">&nbsp;</td><td height="4" style="height:4px;background:${C.navy};font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>
<tr><td class="px" style="padding:32px 32px 8px">${head.map((p) => p.html).join("")}</td></tr>
${d.signOff ? `<tr><td class="px ink" style="padding:0 32px 32px;${t(SIZES.body, 24, C.text)}">${esc(d.signOff)}</td></tr>` : `<tr><td style="padding:0 0 8px"></td></tr>`}
<tr><td class="px ft" style="background:${C.cream};padding:24px 32px;border-top:1px solid ${C.border}">
<p class="q" style="margin:0 0 4px;${t(SIZES.small, 21, C.navy, "font-weight:700")}">${esc(BUSINESS.name)}</p>
<p class="q" style="margin:0 0 12px;${t(SIZES.small, 21, C.quiet)}">${esc(BUSINESS.address)}<br>${footerLinks.join(" &nbsp;|&nbsp; ")}</p>
<p class="q" style="margin:0;${t(SIZES.small, 21, C.quiet)}">${esc(d.why)}${d.unsubscribeUrl ? ` <a href="${esc(d.unsubscribeUrl)}" style="color:${C.quiet};text-decoration:underline">Unsubscribe</a>` : ""}</p>
</td></tr></table></td></tr></table></body></html>`
  const text = [
    ...head.flatMap((p) => p.text),
    ...(d.signOff ? [d.signOff, ""] : []),
    BUSINESS.name, BUSINESS.address, BUSINESS.phone,
    ...(d.accountUrl ? [`Your ${ACCOUNT_NAME}: ${d.accountUrl}`] : []),
    d.why,
    ...(d.unsubscribeUrl ? [`Unsubscribe: ${d.unsubscribeUrl}`] : []),
  ].join("\n")
  return { html, text }
}
