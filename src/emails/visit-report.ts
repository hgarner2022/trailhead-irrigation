import { EMAIL_COLORS as C, FONT, SIZES, esc } from "./layout"

// The visit report an invoice can carry (Hannah, Nov 19 2026: sending the invoice also sends the checklist and photos unless the sender
// unchecks it): a "What we did" section under the lines with the checklist items, each ticked or open, the crew's notes and the photos
// as a two-column grid with captions. Data it needs: the checklist rows and photos already belong to the visit; the invoice carries the
// flag `include_report`, and the sender builds this from the visit when it is on. HTML for the email, text for the plain part; the pay
// page draws the same data (`PayScreen`).

export interface VisitReportData {
  items: { label: string; done: boolean; note?: string }[]
  /** the crew's notes on the visit, newest last */
  notes: string[]
  photos: { url: string; caption: string }[]
}

const type = (size: number, line: number, color: string, extra = "") => `font-family:${FONT};font-size:${size}px;line-height:${line}px;color:${color};${extra}`

export function visitReport(r: VisitReportData): { html: string; text: string[] } {
  const items = r.items
    .map((i) => `<tr><td width="28" style="width:28px;padding:8px 0;border-top:1px solid ${C.border};${type(SIZES.body, 24, i.done ? C.primary : C.muted, "vertical-align:top;font-weight:700")}">${i.done ? "&#10003;" : "&#9675;"}</td><td style="padding:8px 0;border-top:1px solid ${C.border};${type(SIZES.body, 24, C.text, "vertical-align:top")}">${esc(i.label)}${i.note ? `<br><span style="${type(SIZES.small, 22, C.quiet)}">${esc(i.note)}</span>` : ""}</td></tr>`)
    .join("")
  const notes = r.notes.map((n) => `<p style="margin:0 0 8px;${type(SIZES.body, 24, C.text)}">${esc(n)}</p>`).join("")
  const cell = (p: VisitReportData["photos"][number] | undefined) =>
    p
      ? `<td width="50%" valign="top" style="width:50%;padding:0 6px 12px 0"><img src="${esc(p.url)}" width="100%" alt="${esc(p.caption)}" style="display:block;width:100%;height:auto;border-radius:8px;border:1px solid ${C.border}"><span style="display:block;padding-top:6px;${type(SIZES.small, 20, C.quiet)}">${esc(p.caption)}</span></td>`
      : `<td width="50%" style="width:50%">&nbsp;</td>`
  const rows: string[] = []
  for (let i = 0; i < r.photos.length; i += 2) rows.push(`<tr>${cell(r.photos[i])}${cell(r.photos[i + 1])}</tr>`)
  const html =
    `<h2 style="margin:8px 0 8px;${type(SIZES.lead, 26, C.navy, "font-weight:700")}">What we did</h2>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${items}</table>` +
    (notes ? `<p style="margin:0 0 4px;${type(SIZES.small, 20, C.quiet)}">Notes from the crew</p>${notes}` : "") +
    (rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px">${rows.join("")}</table>` : "")
  const text = ["What we did", ...r.items.map((i) => `${i.done ? "[x]" : "[ ]"} ${i.label}${i.note ? ` (${i.note})` : ""}`), ...(r.notes.length ? ["", "Notes from the crew", ...r.notes] : []), ...(r.photos.length ? ["", `${r.photos.length} photos are on your invoice page.`] : []), ""]
  return { html, text }
}
