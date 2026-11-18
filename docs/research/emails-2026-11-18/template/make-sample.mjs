// Prototype of the one template, with real wording from the rendered receipt and day-before emails. Static sample for the design doc.
import { writeFileSync, mkdirSync } from "node:fs"
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const K = { ink: "#1E293B", navy: "#2B3544", quiet: "#57534E", rule: "#E7E5E4", cream: "#FAFAF8", stone: "#F5F5F4", orange: "#D97706", button: "#B45309", white: "#FFFFFF" }
const F = "'Helvetica Neue',Helvetica,Arial,sans-serif"
const p = (t) => `<p style="margin:0 0 12px;font-family:${F};font-size:16px;line-height:24px;color:${K.ink}">${t}</p>`
const lead = (t) => `<p style="margin:0 0 24px;font-family:${F};font-size:18px;line-height:28px;color:${K.ink}">${t}</p>`
const h1 = (t) => `<h1 style="margin:0 0 16px;font-family:${F};font-size:28px;line-height:34px;font-weight:700;color:${K.navy}">${t}</h1>`
const facts = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${rows.map(([k, v]) => `<tr><td width="112" style="width:112px;padding:10px 12px 10px 0;border-top:1px solid ${K.rule};font-family:${F};font-size:14px;line-height:24px;color:${K.quiet};vertical-align:top">${k}</td><td style="padding:10px 0;border-top:1px solid ${K.rule};font-family:${F};font-size:16px;line-height:24px;color:${K.ink};vertical-align:top">${v}</td></tr>`).join("")}</table>`
const money = (rows, total) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${rows.map(([k, v, sub, quiet]) => `<tr><td style="padding:12px 12px 12px 0;border-top:1px solid ${K.rule};font-family:${F};font-size:16px;line-height:24px;color:${quiet ? K.quiet : K.ink};vertical-align:top">${k}${sub ? `<br><span style="font-size:14px;line-height:21px;color:${K.quiet}">${sub}</span>` : ""}</td><td align="right" style="padding:12px 0;border-top:1px solid ${K.rule};font-family:${F};font-size:16px;line-height:24px;color:${quiet ? K.quiet : K.ink};vertical-align:top;white-space:nowrap">${v}</td></tr>`).join("")}<tr><td style="padding:12px 12px 12px 0;border-top:2px solid ${K.navy};font-family:${F};font-size:16px;line-height:24px;font-weight:700;color:${K.ink}">${total[0]}</td><td align="right" style="padding:12px 0;border-top:2px solid ${K.navy};font-family:${F};font-size:16px;line-height:24px;font-weight:700;color:${K.ink}">${total[1]}</td></tr></table>`
const cta = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px"><tr><td style="border-radius:8px;background:${K.button};mso-padding-alt:16px 32px"><a href="${href}" style="display:inline-block;min-width:176px;padding:16px 32px;font-family:${F};font-size:16px;line-height:20px;font-weight:700;color:${K.white};text-decoration:none;text-align:center">${label}</a></td></tr></table>`
const link = (href, label) => `<a href="${href}" style="color:${K.button};font-weight:700;text-decoration:underline">${label}</a>`
const links = (items) => `<p style="margin:0 0 24px;font-family:${F};font-size:16px;line-height:28px;color:${K.ink}">${items.join("<br>")}</p>`
const frame = ({ pre, title, body, why }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${K.stone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${K.stone}">${pre}${"&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${K.stone}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${K.white};border-radius:8px;overflow:hidden">
<tr><td style="padding:20px 32px;border-bottom:4px solid ${K.orange}"><a href="https://www.trailheadirrigation.com"><img src="https://www.trailheadirrigation.com/images/logo-horizontal-trim.png" alt="Trailhead Lawn &amp; Irrigation" width="129" height="40" style="display:block;width:129px;height:40px;border:0"></a></td></tr>
<tr><td style="padding:32px 32px 8px">${body}</td></tr>
<tr><td style="padding:0 32px 32px"><p style="margin:0;font-family:${F};font-size:16px;line-height:24px;color:${K.ink}">The Trailhead crew</p></td></tr>
<tr><td style="background:${K.cream};padding:24px 32px;border-top:1px solid ${K.rule}">
<p style="margin:0 0 4px;font-family:${F};font-size:14px;line-height:21px;font-weight:700;color:${K.navy}">Trailhead Lawn &amp; Irrigation</p>
<p style="margin:0;font-family:${F};font-size:14px;line-height:21px;color:${K.quiet}">137 Morgan Circle North, Erie, CO 80516<br><a href="tel:9706927270" style="color:${K.quiet};text-decoration:underline">(970) 692-7270</a><br>${why}</p>
</td></tr></table></td></tr></table></body></html>`

writeFileSync(`${OUT}/receipt.html`, frame({
  title: "Receipt: $178 for your repair at 480 Briggs St",
  pre: "Paid with Visa ending 4242 on Wednesday, May 5. Your fall blowout is planned for early October.",
  why: "You are getting this because a visit of yours was completed.",
  body: h1("Paid, thank you") + p("Hi Andrea,") + lead("Thank you. Your repair at 480 Briggs St is paid.") +
    facts([["Where", "480 Briggs St"], ["Done", "Wednesday, May 5, with Ryan"], ["Receipt", "R-1A2B3C4D"]]) +
    money([["Repair", "$145"], ["Extra zones", "$20", "2 × $10"], ["Subtotal", "$165", "", true], ["Sales tax", "$13", "", true]], ["Total", "$178"]) +
    facts([["Paid", "$178, Visa ending 4242"], ["Paid on", "Wednesday, May 5"]]) +
    p("Your fall blowout is planned for early October.") +
    cta("#", "See this job in your Trailhead account") + links([link("#", "View the receipt")]),
}))
writeFileSync(`${OUT}/day-before.html`, frame({
  title: "Tomorrow: your spring turn-on",
  pre: "Ryan will be there between 8 and 10 am.",
  why: "You are getting this because Trailhead is coming to your property.",
  body: h1("We're coming tomorrow") + p("Hi Andrea,") + lead("A reminder that we're coming tomorrow, Wednesday, May 5, for your spring turn-on. Ryan will be there.") +
    facts([["Day", "Wednesday, May 5, between 8 and 10 am"], ["Who is coming", "Ryan"], ["Where", "480 Briggs St, Erie"]]) +
    cta("#", "Open your Trailhead account") + links([link("#", "Add to Google Calendar"), link("#", "Add to Apple or Outlook calendar")]) +
    p("Need a different day? Change it, or anything else, in your Trailhead account."),
}))
