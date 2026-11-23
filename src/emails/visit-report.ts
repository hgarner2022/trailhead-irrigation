import { EMAIL_COLORS as C, FONT, SIZES, esc } from "./layout"

// "What we did": the visit report an invoice or a receipt can carry (Hannah, Nov 19 2026: sending the invoice also sends the checklist and photos unless the
// sender unchecks it; Nov 21 2026: the receipt carries it too). The visit's checked items as a list and the photos Ryan shared with the customer as a small grid.
// ONLY what is checked is ever shown: an unchecked item is not drawn, not even as "Not done" (Hannah, Nov 22 2026: "We should never send anything that's not checked").
// `checkedItems` is the one place that reads the checklist for a customer, so a renderer cannot show an open item by mistake; the crew's own checklist on the job page keeps showing them. Nothing else: no notes and no captions, because the data model has no caption on a photo and crew notes are not
// shared with the customer (an open question for Hannah). The checklist rows and photos already belong to the visit (the job's checklist template for the
// service, `photo.shown_to_customer` on a visit that is done); the invoice carries the flag `include_report`, and the sender builds this from the visit
// when it is on. HTML for the email, text for the plain part; the pay page and the receipt page draw the same data (`VisitReport` block).

export interface VisitReportData {
  items: { label: string; done: boolean }[]
  /** the photos shared with the customer, in the order they were taken */
  photos: { url: string }[]
}

const type = (size: number, line: number, color: string, extra = "") => `font-family:${FONT};font-size:${size}px;line-height:${line}px;color:${color};${extra}`

/** Where the photos can also be seen, for the plain-text twin ("3 photos are on your receipt page."). */
export type ReportPage = "invoice" | "receipt"

/** The labels of the items that were done, in order: the only items a customer ever sees. */
export const checkedItems = (r: VisitReportData): string[] => r.items.filter((i) => i.done).map((i) => i.label)

/** Whether there is anything to show a customer: a checked item or a shared photo. When not, no heading is drawn anywhere. */
export const hasReport = (r: VisitReportData | null | undefined): r is VisitReportData => Boolean(r) && (checkedItems(r!).length > 0 || r!.photos.length > 0)

/** The report as an email part, or null when there is nothing checked and no photo to show. */
export function visitReport(r: VisitReportData, on: ReportPage = "invoice"): { html: string; text: string[] } | null {
  if (!hasReport(r)) return null
  const done = checkedItems(r)
  const items = done
    .map(
      (label) =>
        `<tr><td width="28" style="width:28px;padding:8px 0;border-top:1px solid ${C.border};${type(SIZES.body, 24, C.primary, "vertical-align:top;font-weight:700")}">&#10003;</td><td style="padding:8px 0;border-top:1px solid ${C.border};${type(SIZES.body, 24, C.text, "vertical-align:top")}">${esc(label)}</td></tr>`,
    )
    .join("")
  const cell = (p: VisitReportData["photos"][number] | undefined) =>
    p
      ? `<td width="50%" valign="top" style="width:50%;padding:0 6px 12px 0"><img src="${esc(p.url)}" width="100%" alt="Photo from the visit" style="display:block;width:100%;height:auto;border-radius:8px;border:1px solid ${C.border}"></td>`
      : `<td width="50%" style="width:50%">&nbsp;</td>`
  const rows: string[] = []
  for (let i = 0; i < r.photos.length; i += 2) rows.push(`<tr>${cell(r.photos[i])}${cell(r.photos[i + 1])}</tr>`)
  const html =
    `<h2 style="margin:8px 0 8px;${type(SIZES.lead, 26, C.navy, "font-weight:700")}">What we did</h2>` +
    (items ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${items}</table>` : "") +
    (rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px">${rows.join("")}</table>` : "")
  const text = ["What we did", ...done.map((label) => `[x] ${label}`), ...(r.photos.length ? ["", `${r.photos.length} ${r.photos.length === 1 ? "photo is" : "photos are"} on your ${on} page.`] : []), ""]
  return { html, text }
}
