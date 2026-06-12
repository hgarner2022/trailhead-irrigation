import { NextResponse } from "next/server"
import { exchangeCodeForTokens } from "@/lib/jobber"

// GET /api/jobber/callback?code=...&state=...
//
// Jobber redirects here after Hannah clicks "Authorize" in the OAuth consent
// screen. We exchange the auth code for a refresh token and display the
// token in plain text so she can copy it into Vercel as JOBBER_REFRESH_TOKEN.
//
// This route is reachable by anyone who has a valid Jobber auth code for
// this app, which only Hannah can produce by going through the consent flow
// she initiated from /api/jobber/auth. Still, we display the token only
// once and tell her to revoke and redo if it's ever leaked.

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    return new NextResponse(
      htmlPage({
        title: "Jobber Authorization Failed",
        body: `<p>Jobber returned an error: <code>${escape(error)}</code></p>
               <p>Close this tab and try again, or check the developer app config.</p>`,
      }),
      { status: 400, headers: { "Content-Type": "text/html" } }
    )
  }

  if (!code) {
    return new NextResponse(
      htmlPage({
        title: "Missing Authorization Code",
        body: `<p>No <code>code</code> parameter in the callback URL. Restart the flow at <code>/api/jobber/auth</code>.</p>`,
      }),
      { status: 400, headers: { "Content-Type": "text/html" } }
    )
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    return new NextResponse(
      htmlPage({
        title: "Jobber Connected!",
        body: `
          <p><strong>Copy this refresh token and paste it into Vercel as <code>JOBBER_REFRESH_TOKEN</code>:</strong></p>
          <pre style="background:#f5f5f4;padding:16px;border-radius:8px;overflow-x:auto;word-break:break-all;white-space:pre-wrap">${escape(tokens.refresh_token)}</pre>
          <p style="color:#78716C;font-size:14px;margin-top:24px">
            Scopes granted: <code>${escape(tokens.scope ?? "(not returned)")}</code><br>
            Access token expires in: ${tokens.expires_in}s (we refresh automatically on every cron run, so this doesn't matter day-to-day).
          </p>
          <p style="color:#78716C;font-size:14px">
            Once saved in Vercel, the daily quote-followup cron will start working on the next scheduled run.
          </p>
        `,
      }),
      { status: 200, headers: { "Content-Type": "text/html" } }
    )
  } catch (err) {
    console.error("jobber/callback exchange error:", err)
    return new NextResponse(
      htmlPage({
        title: "Token Exchange Failed",
        body: `<p>Error exchanging the Jobber auth code for tokens.</p>
               <pre>${escape(err instanceof Error ? err.message : String(err))}</pre>
               <p>Verify <code>JOBBER_CLIENT_ID</code>, <code>JOBBER_CLIENT_SECRET</code>, and <code>JOBBER_REDIRECT_URI</code> in Vercel match the values in your Jobber developer app.</p>`,
      }),
      { status: 500, headers: { "Content-Type": "text/html" } }
    )
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function htmlPage({ title, body }: { title: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${escape(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 60px auto; padding: 0 24px; color: #1E293B; line-height: 1.6; }
  h1 { color: #2B3544; }
  code, pre { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 13px; }
</style>
</head><body>
<h1>${escape(title)}</h1>
${body}
</body></html>`
}
