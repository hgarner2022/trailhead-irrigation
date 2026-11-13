// The one email layout: table-based HTML that survives Outlook and Gmail, with the site's navy and orange. Email cannot
// read CSS variables, so the brand hex values live in ONE block below; the design gate allows hex there and nowhere else
// under src/emails. Every template builds its body with these helpers and wraps it in `emailLayout`.
import { BUSINESS } from "./format"

// email-colors:start
export const EMAIL_COLORS = {
  navy: "#2B3544",
  charcoal: "#1E293B",
  primary: "#B45309",
  primaryLight: "#F59E0B",
  cream: "#FAFAF8",
  stone: "#F5F5F4",
  border: "#E7E5E4",
  muted: "#78716C",
  white: "#FFFFFF",
  text: "#1E293B",
}
// email-colors:end

const C = EMAIL_COLORS
const DISPLAY = "'Barlow Condensed','Arial Narrow',Arial,Helvetica,sans-serif"
const BODY = "'Source Sans 3',Helvetica,Arial,sans-serif"

export const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export const paragraph = (text: string) => `<p style="margin:0 0 16px;font-family:${BODY};font-size:17px;line-height:26px;color:${C.text}">${esc(text)}</p>`

export const smallPrint = (text: string) => `<p style="margin:16px 0 0;font-family:${BODY};font-size:14px;line-height:21px;color:${C.muted}">${esc(text)}</p>`

export const heading = (text: string) => `<h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:34px;line-height:38px;font-weight:700;color:${C.navy}">${esc(text)}</h1>`

/** A bulletproof button: a one-cell table, so the colour holds in Outlook. */
export function button(href: string, label: string, kind: "primary" | "quiet" = "primary"): string {
  const fill = kind === "primary" ? C.primary : C.white
  const ink = kind === "primary" ? C.white : C.navy
  const edge = kind === "primary" ? C.primary : C.navy
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block;margin:0 8px 12px 0"><tr><td style="border-radius:8px;background:${fill};border:2px solid ${edge}"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:${BODY};font-size:16px;font-weight:700;color:${ink};text-decoration:none">${esc(label)}</a></td></tr></table>`
}

/** A two-column list of facts: a label on the left and the value on the right. */
export function facts(rows: [string, string][]): string {
  const cells = rows
    .map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid ${C.border};font-family:${BODY};font-size:15px;color:${C.muted};vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:8px 0;border-top:1px solid ${C.border};font-family:${BODY};font-size:16px;color:${C.text}">${esc(v)}</td></tr>`)
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${cells}</table>`
}

/** The "what happens next" lines: the lead in the display face, a plain sentence beside it. */
export function nextList(lines: { lead: string; text: string }[]): string {
  const rows = lines
    .map((l) => `<tr><td style="padding:10px 14px 10px 0;border-top:1px solid ${C.border};width:34%;font-family:${DISPLAY};font-size:22px;line-height:24px;font-weight:600;color:${C.primary};vertical-align:top">${esc(l.lead)}</td><td style="padding:10px 0;border-top:1px solid ${C.border};font-family:${BODY};font-size:16px;line-height:24px;color:${C.text};vertical-align:top">${esc(l.text)}</td></tr>`)
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${rows}</table>`
}

export interface LayoutInput {
  origin: string
  /** the grey line an inbox shows beside the subject */
  preheader: string
  /** the HTML between the header band and the footer, built from the helpers above */
  body: string
  /** one line saying why this email arrived, under the business details */
  reason?: string
}

export function emailLayout({ origin, preheader, body, reason }: LayoutInput): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(BUSINESS.name)}</title></head>
<body style="margin:0;padding:0;background:${C.stone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.stone}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.stone}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.white};border-radius:8px;overflow:hidden">
<tr><td style="background:${C.white};padding:18px 28px;border-bottom:4px solid ${C.primary}"><a href="${esc(origin)}" style="text-decoration:none"><img src="${esc(origin)}/images/logo-horizontal-trim.png" alt="${esc(BUSINESS.name)}" height="40" style="display:block;height:40px;width:auto;border:0"></a></td></tr>
<tr><td style="padding:28px 28px 12px">${body}</td></tr>
<tr><td style="background:${C.cream};padding:20px 28px;border-top:1px solid ${C.border}">
<p style="margin:0 0 6px;font-family:${BODY};font-size:14px;line-height:21px;color:${C.navy};font-weight:700">${esc(BUSINESS.name)}</p>
<p style="margin:0;font-family:${BODY};font-size:14px;line-height:21px;color:${C.muted}">${esc(BUSINESS.address)}<br><a href="${BUSINESS.phoneTel}" style="color:${C.muted}">${esc(BUSINESS.phone)}</a>${reason ? `<br>${esc(reason)}` : ""}</p>
</td></tr></table></td></tr></table></body></html>`
}

/** The plain-text twin of an email: the same lines, then the business footer. */
export const plainText = (lines: string[]) => [...lines, "", BUSINESS.name, BUSINESS.address, BUSINESS.phone].join("\n")
