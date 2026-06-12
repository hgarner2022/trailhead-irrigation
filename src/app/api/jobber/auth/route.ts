import { NextResponse } from "next/server"
import { buildAuthorizeUrl } from "@/lib/jobber"

// GET /api/jobber/auth?secret=<SEND_REVIEW_SECRET>
//
// Starts the Jobber OAuth flow. Visit this URL once during setup (with the
// shared secret as a query param so randoms can't kick off auth flows). It
// redirects to Jobber's consent screen; after clicking Authorize, Jobber
// redirects back to /api/jobber/callback with an auth code we exchange for a
// refresh token.

export async function GET(request: Request) {
  const url = new URL(request.url)
  const providedSecret = url.searchParams.get("secret")
  const expected = process.env.SEND_REVIEW_SECRET

  if (!expected) {
    return NextResponse.json(
      { error: "Server not configured: SEND_REVIEW_SECRET missing" },
      { status: 500 }
    )
  }
  if (providedSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Random state for CSRF protection. Jobber sends it back in the callback.
    const state = crypto.randomUUID()
    const authorizeUrl = buildAuthorizeUrl(state)
    return NextResponse.redirect(authorizeUrl)
  } catch (err) {
    console.error("jobber/auth error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build auth URL" },
      { status: 500 }
    )
  }
}
