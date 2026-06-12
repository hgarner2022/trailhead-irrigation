import { NextResponse } from "next/server"
import { Resend } from "resend"
import { listStaleQuotes, addFollowupNote, type StaleQuote } from "@/lib/jobber"

// GET /api/cron/quote-followup
//
// Vercel Cron handler. Runs daily (schedule lives in vercel.json). Queries
// Jobber for quotes in AWAITING_RESPONSE status sent 3-7 days ago, sends a
// follow-up email from Ryan via Resend, and adds a marker note to the quote
// so it doesn't get followed up again.
//
// Auth: Vercel Cron requests include the CRON_SECRET in the Authorization
// header. We also allow manual triggers if the same secret is provided so
// Hannah can run it on demand for testing.

const FROM_ADDRESS = "Ryan from Trailhead <ryan@trailheadirrigation.com>"
const REPLY_TO = "ryan@trailheadirrigation.com"

const DEFAULT_DAYS_MIN = 3
const DEFAULT_DAYS_MAX = 7
const MAX_PER_RUN = 10

function buildEmail(firstName: string) {
  const subject = `Just checking in, ${firstName}`
  const text = [
    `Hi ${firstName},`,
    ``,
    `Ryan from Trailhead. Just following up on the quote I sent over a few days back. Wanted to make sure it didn't get buried in your inbox, and to see if you've got any questions.`,
    ``,
    `If the timing isn't right, no worries at all. And if there's anything in the quote that didn't quite make sense, or you want to tweak the scope, just hit reply or give me a call. I'd rather adjust than have you sit on it.`,
    ``,
    `Either way, thanks again for thinking of Trailhead.`,
    ``,
    `Ryan`,
    `Trailhead Lawn & Irrigation`,
    `(970) 692-7270`,
  ].join("\n")

  const html = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>Ryan from Trailhead. Just following up on the quote I sent over a few days back. Wanted to make sure it didn't get buried in your inbox, and to see if you've got any questions.</p>
  <p>If the timing isn't right, no worries at all. And if there's anything in the quote that didn't quite make sense, or you want to tweak the scope, just hit reply or give me a call. I'd rather adjust than have you sit on it.</p>
  <p>Either way, thanks again for thinking of Trailhead.</p>
  <p>Ryan<br>
  <strong>Trailhead Lawn &amp; Irrigation</strong><br>
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

function pickEmail(quote: StaleQuote): string | null {
  // Prefer an email labeled MAIN/PRIMARY; otherwise the first one.
  const emails = quote.client.emails ?? []
  if (emails.length === 0) return null
  const primary = emails.find((e) => /main|primary/i.test(e.description ?? ""))
  return (primary ?? emails[0]).address || null
}

function pickFirstName(quote: StaleQuote): string {
  if (quote.client.firstName) return quote.client.firstName
  return quote.client.name.trim().split(/\s+/)[0] || "there"
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: "Server not configured: CRON_SECRET missing" },
      { status: 500 }
    )
  }
  const auth = request.headers.get("authorization") ?? ""
  const provided = auth.replace(/^Bearer\s+/i, "")
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const daysMin = Number(process.env.QUOTE_FOLLOWUP_DAYS_MIN) || DEFAULT_DAYS_MIN
  const daysMax = Number(process.env.QUOTE_FOLLOWUP_DAYS_MAX) || DEFAULT_DAYS_MAX

  const summary = {
    found: 0,
    skippedAlreadyFollowedUp: 0,
    skippedNoEmail: 0,
    sent: 0,
    errors: [] as Array<{ quoteId: string; error: string }>,
  }

  let quotes: StaleQuote[]
  try {
    quotes = await listStaleQuotes({ daysMin, daysMax, pageSize: MAX_PER_RUN * 3 })
  } catch (err) {
    console.error("Failed to list stale quotes:", err)
    return NextResponse.json(
      { error: "Failed to list quotes", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
  summary.found = quotes.length

  const resend = new Resend(process.env.RESEND_API_KEY)

  let sentCount = 0
  for (const quote of quotes) {
    if (sentCount >= MAX_PER_RUN) break

    if (quote.hasFollowupNote) {
      summary.skippedAlreadyFollowedUp++
      continue
    }
    const email = pickEmail(quote)
    if (!email) {
      summary.skippedNoEmail++
      continue
    }

    const firstName = pickFirstName(quote)
    const { subject, text, html } = buildEmail(firstName)

    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: email,
        replyTo: REPLY_TO,
        subject,
        text,
        html,
      })
      if (sendError) {
        throw new Error(`Resend error: ${JSON.stringify(sendError)}`)
      }

      // Best-effort note write. If this fails we'll send a duplicate next
      // run, which is annoying but not catastrophic. Log it loudly.
      try {
        await addFollowupNote(quote.id)
      } catch (noteErr) {
        console.error(
          `Sent follow-up email for ${quote.id} but failed to mark in Jobber:`,
          noteErr
        )
      }

      summary.sent++
      sentCount++
    } catch (err) {
      summary.errors.push({
        quoteId: quote.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json(summary)
}
