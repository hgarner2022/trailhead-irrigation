import { Resend } from "resend"
import { NextResponse } from "next/server"

// POST /api/send-review-request
//
// Sends a warm "could you leave us a Google review?" email from Ryan to a
// customer after a completed job. Designed to be triggered manually (curl /
// internal dashboard) or via automation tools (Zapier, Make, or a future
// Jobber webhook integration).
//
// Auth: requires a shared secret in the `Authorization: Bearer <token>`
// header so random people can't spam this endpoint. Secret is stored in the
// SEND_REVIEW_SECRET env var.
//
// Body (JSON):
//   {
//     "name": "Sarah Smith",          // full name (used as greeting)
//     "firstName": "Sarah",            // optional, defaults to first token of `name`
//     "email": "sarah@example.com",    // required, where the email goes
//     "service": "spring turn-on"      // optional, included in the body if present
//   }

const FROM_ADDRESS = "Ryan from Trailhead <ryan@trailheadirrigation.com>"
const REPLY_TO = "ryan@trailheadirrigation.com"

// Public Google review link for Trailhead's Google Business Profile.
// This is the canonical "write a review" deep link.
const GOOGLE_REVIEW_URL =
  process.env.GOOGLE_REVIEW_URL ??
  "https://search.google.com/local/writereview?placeid=ChIJ_____Trailhead_Place_ID_Here"

function buildEmail({
  firstName,
  service,
}: {
  firstName: string
  service?: string
}) {
  const subject = `Quick favor, ${firstName}?`

  const serviceLine = service
    ? `Thanks again for letting me handle your ${service} this week. Hope everything's running like it should.`
    : `Thanks again for the work this week. Hope everything's running like it should.`

  const text = [
    `Hi ${firstName},`,
    ``,
    serviceLine,
    ``,
    `If you've got a minute, would you mind leaving a quick Google review? It's the single biggest thing that helps a small local business like Trailhead. Doesn't have to be long — even a sentence or two means a lot.`,
    ``,
    `Here's the direct link:`,
    GOOGLE_REVIEW_URL,
    ``,
    `And if anything about the job wasn't right, please just text or call me first (970-692-7270) and I'll make it right before you write anything. I want to know about it.`,
    ``,
    `Thanks again,`,
    `Ryan`,
    `Trailhead Lawn & Irrigation`,
    `(970) 692-7270`,
  ].join("\n")

  const html = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>${escapeHtml(serviceLine)}</p>
  <p>If you've got a minute, would you mind leaving a quick Google review? It's the single biggest thing that helps a small local business like Trailhead. Doesn't have to be long &mdash; even a sentence or two means a lot.</p>
  <p style="margin: 28px 0;">
    <a href="${GOOGLE_REVIEW_URL}" style="display: inline-block; padding: 12px 22px; background-color: #D97706; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Leave a Google Review</a>
  </p>
  <p>And if anything about the job wasn't right, please just text or call me first (<a href="tel:9706927270" style="color: #D97706;">(970) 692-7270</a>) and I'll make it right before you write anything. I want to know about it.</p>
  <p>Thanks again,<br>
  <strong>Ryan</strong><br>
  Trailhead Lawn &amp; Irrigation<br>
  (970) 692-7270</p>
</body></html>`

  return { subject, text, html }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function POST(request: Request) {
  // Shared-secret auth so random people on the internet can't trigger
  // emails to arbitrary addresses.
  const authHeader = request.headers.get("authorization") ?? ""
  const expected = process.env.SEND_REVIEW_SECRET
  if (!expected) {
    console.error("SEND_REVIEW_SECRET env var is not set")
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    )
  }
  const provided = authHeader.replace(/^Bearer\s+/i, "")
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    name?: string
    firstName?: string
    email?: string
    service?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { name, email, service } = body
  if (!name || !email) {
    return NextResponse.json(
      { error: "Missing required fields: name, email" },
      { status: 400 }
    )
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const firstName = body.firstName?.trim() || name.trim().split(/\s+/)[0]

  const { subject, text, html } = buildEmail({ firstName, service })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      replyTo: REPLY_TO,
      subject,
      text,
      html,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error("send-review-request error:", err)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}
