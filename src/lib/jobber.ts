// Jobber OAuth + GraphQL client.
//
// Used by the OAuth callback route to exchange auth codes for refresh tokens,
// and by the cron handler to query/mutate Jobber data. Refresh token lives in
// the JOBBER_REFRESH_TOKEN env var on Vercel; access tokens are short-lived
// (typically 1 hour) and fetched fresh on every cron run rather than cached.
// Cron runs once a day so the extra refresh call is acceptable for
// architectural simplicity.

const JOBBER_OAUTH_AUTHORIZE = "https://api.getjobber.com/api/oauth/authorize"
const JOBBER_OAUTH_TOKEN = "https://api.getjobber.com/api/oauth/token"
const JOBBER_GRAPHQL = "https://api.getjobber.com/api/graphql"

// Latest stable Jobber GraphQL API version. Update when Jobber announces a
// breaking change; older versions are supported on a deprecation timeline.
const JOBBER_API_VERSION = "2024-04-15"

export type JobberTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope?: string
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

/**
 * Build the authorization URL that sends the user to Jobber's consent screen.
 * Hannah visits this URL once during setup; after she clicks "Authorize" in
 * Jobber, Jobber redirects to JOBBER_REDIRECT_URI with an auth code.
 */
export function buildAuthorizeUrl(state: string): string {
  const clientId = requireEnv("JOBBER_CLIENT_ID")
  const redirectUri = requireEnv("JOBBER_REDIRECT_URI")
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  })
  return `${JOBBER_OAUTH_AUTHORIZE}?${params.toString()}`
}

/**
 * Exchange an authorization code (from the callback) for the initial refresh
 * token. Called once during setup. The returned refresh_token is what gets
 * pasted into Vercel as JOBBER_REFRESH_TOKEN.
 */
export async function exchangeCodeForTokens(code: string): Promise<JobberTokenResponse> {
  const clientId = requireEnv("JOBBER_CLIENT_ID")
  const clientSecret = requireEnv("JOBBER_CLIENT_SECRET")
  const redirectUri = requireEnv("JOBBER_REDIRECT_URI")

  const res = await fetch(JOBBER_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jobber token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

/**
 * Use the stored refresh token to get a fresh access token. Called on every
 * cron run. Jobber refresh tokens are long-lived; if Jobber rotates the
 * refresh token in the response, log a warning so we know to update Vercel.
 */
export async function getAccessToken(): Promise<string> {
  const clientId = requireEnv("JOBBER_CLIENT_ID")
  const clientSecret = requireEnv("JOBBER_CLIENT_SECRET")
  const refreshToken = requireEnv("JOBBER_REFRESH_TOKEN")

  const res = await fetch(JOBBER_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jobber refresh failed (${res.status}): ${text}`)
  }

  const data: JobberTokenResponse = await res.json()
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    console.warn(
      "Jobber rotated the refresh token. Update JOBBER_REFRESH_TOKEN in Vercel:",
      data.refresh_token
    )
  }
  return data.access_token
}

/**
 * Run a GraphQL query against Jobber. Pass `accessToken` to reuse a token
 * across multiple calls in the same handler (saves a refresh round trip).
 */
export async function graphql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const token = accessToken ?? (await getAccessToken())
  const res = await fetch(JOBBER_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": JOBBER_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()
  if (!res.ok || json.errors) {
    throw new Error(
      `Jobber GraphQL error (${res.status}): ${JSON.stringify(json.errors ?? json)}`
    )
  }
  return json.data as T
}

// ───────────────────────────────────────────────────────────────────────────
// Domain-specific helpers used by the quote-followup cron.
// ───────────────────────────────────────────────────────────────────────────

export type StaleQuote = {
  id: string
  quoteNumber: string
  sentAt: string
  client: {
    name: string
    firstName: string | null
    emails: { description: string | null; address: string }[]
  }
  hasFollowupNote: boolean
}

/**
 * Marker text we add to a quote's notes when we've sent a follow-up. Reading
 * for this string is how we avoid sending the same customer multiple
 * follow-ups for the same quote.
 */
export const FOLLOWUP_NOTE_MARKER = "TRAILHEAD_FOLLOWUP_SENT"

/**
 * Query Jobber for quotes in AWAITING_RESPONSE status sent within a date
 * window (default: 3-7 days ago). Reads each quote's notes so the caller can
 * check for the follow-up marker without an extra round trip.
 */
export async function listStaleQuotes({
  daysMin,
  daysMax,
  pageSize = 25,
}: {
  daysMin: number
  daysMax: number
  pageSize?: number
}): Promise<StaleQuote[]> {
  const now = Date.now()
  const minSentAt = new Date(now - daysMax * 24 * 60 * 60 * 1000).toISOString()
  const maxSentAt = new Date(now - daysMin * 24 * 60 * 60 * 1000).toISOString()

  const query = /* GraphQL */ `
    query StaleQuotes($first: Int!, $minSentAt: ISO8601DateTime!, $maxSentAt: ISO8601DateTime!) {
      quotes(
        first: $first
        filter: {
          status: AWAITING_RESPONSE
          sentAt: { gte: $minSentAt, lte: $maxSentAt }
        }
        sort: { key: SENT_AT, direction: ASCENDING }
      ) {
        nodes {
          id
          quoteNumber
          sentAt
          client {
            name
            firstName
            emails { description address }
          }
          notes(first: 50) {
            nodes { message }
          }
        }
      }
    }
  `

  type Resp = {
    quotes: {
      nodes: Array<{
        id: string
        quoteNumber: string
        sentAt: string
        client: {
          name: string
          firstName: string | null
          emails: Array<{ description: string | null; address: string }>
        }
        notes: { nodes: Array<{ message: string }> }
      }>
    }
  }

  const data = await graphql<Resp>(query, {
    first: pageSize,
    minSentAt,
    maxSentAt,
  })

  return data.quotes.nodes.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    sentAt: q.sentAt,
    client: q.client,
    hasFollowupNote: q.notes.nodes.some((n) => n.message.includes(FOLLOWUP_NOTE_MARKER)),
  }))
}

/**
 * Add a Trailhead follow-up marker note to a quote so we don't re-send.
 */
export async function addFollowupNote(quoteId: string): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const message = `${FOLLOWUP_NOTE_MARKER} ${stamp}`
  const mutation = /* GraphQL */ `
    mutation AddNote($input: NoteCreateInput!) {
      noteCreate(input: $input) {
        note { id }
        userErrors { message }
      }
    }
  `
  type Resp = {
    noteCreate: {
      note: { id: string } | null
      userErrors: { message: string }[]
    }
  }
  const data = await graphql<Resp>(mutation, {
    input: { noteableId: quoteId, message },
  })
  if (data.noteCreate.userErrors.length) {
    throw new Error(
      `noteCreate userErrors: ${data.noteCreate.userErrors.map((e) => e.message).join("; ")}`
    )
  }
}
