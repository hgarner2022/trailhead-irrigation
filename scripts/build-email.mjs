#!/usr/bin/env node
/**
 * Renders a campaign from email/campaigns.mjs into a sendable HTML file.
 *
 * All Trailhead branding lives here so every campaign looks the same:
 * logo, navy banner, orange CTA, cream price strip, green tip rail, footer.
 * Adding a campaign means adding copy to campaigns.mjs, not touching HTML.
 *
 * Email client constraints baked in:
 *   - table layout only (Outlook 2016-2021 uses Word's rendering engine)
 *   - all critical CSS inline (Outlook.com strips <style> blocks)
 *   - VML roundrect button fallback so the CTA is a button in Outlook
 *   - explicit dark mode, since ~1/3 of opens are in dark mode
 *   - hidden preheader, 600px, single column under 620px
 *   - stays far under Gmail's 102KB clipping threshold
 *
 * Usage:
 *   npm run email:build -- --campaign=blowout
 *   npm run email:build -- --all
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { CAMPAIGNS } from "../email/campaigns.mjs"

// Brand tokens, mirrored from CLAUDE.md / globals.css
const C = {
  primary: "#D97706",
  primaryDark: "#B45309",
  primaryLight: "#F59E0B",
  navy: "#2B3544",
  cream: "#FAFAF8",
  white: "#FFFFFF",
  border: "#E7E5E4",
  muted: "#78716C",
  faint: "#A8A29E",
  success: "#16A34A",
}

const SITE = "https://www.trailheadirrigation.com"
const LOGO = `${SITE}/images/logo-horizontal.png`
const FONT = "Arial,Helvetica,sans-serif"

const body = (t, extra = "") =>
  `font-family:${FONT};font-size:16px;line-height:26px;color:${C.navy};${extra}`

function section(inner) {
  return `        <tr><td class="px" style="padding:0 36px;">${inner}</td></tr>`
}

function render(slug, c) {
  const priceBlock = c.price
    ? `
          <tr>
            <td class="px" style="padding:8px 36px 4px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.cream};border:1px solid ${C.border};border-radius:8px;">
                <tr><td align="center" style="padding:18px 20px;">
                  <p style="margin:0;font-family:${FONT};font-size:28px;line-height:32px;color:${C.primary};font-weight:bold;">${c.price.amount}</p>
                  <p class="t-muted" style="margin:4px 0 0 0;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">${c.price.note}</p>
                </td></tr>
              </table>
            </td>
          </tr>`
    : ""

  const tipBlock = c.tip
    ? `
          <tr>
            <td class="px" style="padding:2px 36px 24px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.cream};border-left:3px solid ${C.success};border-radius:4px;">
                <tr><td style="padding:16px 20px;">
                  <p class="t-dark" style="margin:0 0 6px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${C.navy};font-weight:bold;">${c.tip.title}</p>
                  <p class="t-muted" style="margin:0;font-family:${FONT};font-size:15px;line-height:23px;color:${C.muted};">${c.tip.body}</p>
                </td></tr>
              </table>
            </td>
          </tr>`
    : ""

  const psBlock = c.ps
    ? `
          <tr>
            <td class="px" style="padding:0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="rule" style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:26px 36px 32px 36px;">
              <p style="margin:0 0 6px 0;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:${C.success};font-weight:bold;">${c.ps.eyebrow}</p>
              <p class="t-dark" style="margin:0 0 10px 0;font-family:${FONT};font-size:18px;line-height:24px;color:${C.navy};font-weight:bold;">${c.ps.title}</p>
              <p class="t-muted" style="margin:0;font-family:${FONT};font-size:15px;line-height:24px;color:${C.muted};">${c.ps.body}</p>
            </td>
          </tr>`
    : `<tr><td style="padding:0 0 12px 0;">&nbsp;</td></tr>`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${c.subject}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,div,p,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
  a{color:${C.primaryDark};}
  .btn a:hover{background-color:${C.primaryDark} !important;}
  @media screen and (max-width:620px){
    .wrap{width:100% !important;}
    .px{padding-left:24px !important;padding-right:24px !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
    .btn a{display:block !important;}
  }
  @media (prefers-color-scheme:dark){
    .bg{background-color:#1E293B !important;}
    .card{background-color:#22303F !important;}
    .t-dark{color:#F5F5F4 !important;}
    .t-muted{color:#C3C0BC !important;}
    .rule{border-color:#3D4F63 !important;}
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;width:100%;background-color:${C.cream};">

<div style="display:none;font-size:1px;color:${C.cream};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
  ${c.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background-color:${C.cream};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

    <tr>
      <td align="center" style="padding:8px 0 22px 0;">
        <img src="${LOGO}" width="200" alt="Trailhead Lawn &amp; Irrigation" style="width:200px;max-width:200px;height:auto;" />
      </td>
    </tr>

    <tr>
      <td class="card" style="background-color:${C.white};border:1px solid ${C.border};border-radius:10px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="px" align="left" style="background-color:${C.navy};border-radius:10px 10px 0 0;padding:30px 36px;">
              <p style="margin:0 0 8px 0;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:${C.primaryLight};font-weight:bold;">${c.eyebrow}</p>
              <h1 class="h1" style="margin:0;font-family:${FONT};font-size:30px;line-height:36px;color:${C.white};font-weight:bold;">${c.headline}</h1>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="px" style="padding:32px 36px 8px 36px;">
              <p class="t-dark" style="margin:0 0 16px 0;${body()}">Hi {{first_name}},</p>
${c.paragraphs.map((p) => `              <p class="t-dark" style="margin:0 0 16px 0;${body()}">${p}</p>`).join("\n")}
            </td>
          </tr>
${priceBlock}
          <tr>
            <td align="center" class="px" style="padding:26px 36px 10px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="btn">
                <tr><td align="center" bgcolor="${C.primary}" style="border-radius:6px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${c.cta.url}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="12%" stroke="f" fillcolor="${C.primary}">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">${c.cta.label}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <a href="${c.cta.url}" style="display:inline-block;padding:16px 40px;font-family:${FONT};font-size:17px;line-height:20px;font-weight:bold;color:${C.white};text-decoration:none;border-radius:6px;background-color:${C.primary};">${c.cta.label}</a>
                  <!--<![endif]-->
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:6px 36px 26px 36px;">
              <p class="t-muted" style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.muted};text-align:center;">${c.ctaNote}</p>
            </td>
          </tr>
${tipBlock}
          <tr>
            <td class="px" style="padding:0 36px 26px 36px;">
              <p class="t-dark" style="margin:0;${body()}">Thanks,<br /><strong style="font-weight:bold;">Ryan</strong><br /><span class="t-muted" style="color:${C.muted};font-size:14px;">Trailhead Lawn &amp; Irrigation</span></p>
            </td>
          </tr>
${psBlock}
        </table>

      </td>
    </tr>

    <tr>
      <td class="px" align="center" style="padding:24px 36px 8px 36px;">
        <p class="t-dark" style="margin:0 0 6px 0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.navy};font-weight:bold;">Trailhead Lawn &amp; Irrigation LLC</p>
        <p class="t-muted" style="margin:0 0 6px 0;font-family:${FONT};font-size:13px;line-height:21px;color:${C.muted};">137 Morgan Circle North, Erie, CO 80516</p>
        <p class="t-muted" style="margin:0;font-family:${FONT};font-size:13px;line-height:21px;color:${C.muted};">
          <a href="tel:+19706927270" style="color:${C.primaryDark};text-decoration:none;">(970) 692-7270</a>
          &nbsp;&middot;&nbsp;
          <a href="${SITE}" style="color:${C.primaryDark};text-decoration:none;">trailheadirrigation.com</a>
        </p>
      </td>
    </tr>
    <tr>
      <td class="px" align="center" style="padding:10px 36px 20px 36px;">
        <p class="t-muted" style="margin:0;font-family:${FONT};font-size:12px;line-height:20px;color:${C.faint};">
          You are getting this because we have worked on your system before.<br />
          Not interested in these? Just reply and I will take you off the list.
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>
`
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=")
    return [k, v ?? true]
  })
)

mkdirSync("email/out", { recursive: true })
const slugs = args.all ? Object.keys(CAMPAIGNS) : [args.campaign]
if (!slugs[0]) {
  console.error(`Usage: npm run email:build -- --campaign=<slug>\nAvailable: ${Object.keys(CAMPAIGNS).join(", ")}`)
  process.exit(1)
}
for (const slug of slugs) {
  const c = CAMPAIGNS[slug]
  if (!c) {
    console.error(`Unknown campaign "${slug}". Available: ${Object.keys(CAMPAIGNS).join(", ")}`)
    process.exit(1)
  }
  const html = render(slug, c)
  const out = `email/out/${slug}.html`
  writeFileSync(out, html)
  console.log(`  ${out.padEnd(38)} ${(html.length / 1024).toFixed(1)}KB   "${c.subject}"`)
}
