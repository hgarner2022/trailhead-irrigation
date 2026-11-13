import "server-only"

/**
 * The one place a secret or a deployment setting is read. Call it inside a
 * function, never at module scope, so importing a module never needs the
 * environment and a missing name fails where it is used.
 */
export function readEnv<const N extends string>(names: readonly N[]): Record<N, string> {
  const out = {} as Record<N, string>
  for (const name of names) {
    const value = process.env[name]
    if (value === undefined || value === "") throw new Error(`${name} is not set`)
    out[name] = value
  }
  return out
}

/** Like `readEnv` for one optional name: undefined when unset or empty. */
export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]
  return value === undefined || value === "" ? undefined : value
}

/** Auth.js: the secret that signs the session cookie. The site origin (`AUTH_URL`) is optional, see `readAuthEnv`. */
export function readAuthEnv(): { AUTH_SECRET: string; AUTH_URL: string | undefined } {
  const { AUTH_SECRET } = readEnv(["AUTH_SECRET"])
  return { AUTH_SECRET, AUTH_URL: readOptionalEnv("AUTH_URL") }
}

/** Vercel Cron sends this as `Authorization: Bearer <CRON_SECRET>`; every `/api/cron/*` route checks it. */
export function readCronSecret(): string {
  return readEnv(["CRON_SECRET"]).CRON_SECRET
}

/** The contact address named in the geocoder's `User-Agent` (Nominatim's usage policy asks for one). */
export function readGeocodeContact(): string {
  return readEnv(["GEOCODE_CONTACT"]).GEOCODE_CONTACT
}

/** Stripe's secret key (`sk_test_...` or `sk_live_...`); only `src/lib/stripe/client.ts` uses it. */
export function readStripeSecretKey(): string {
  return readEnv(["STRIPE_SECRET_KEY"]).STRIPE_SECRET_KEY
}

/** The publishable key for Stripe.js in the browser (Phase 8's embedded checkout). Safe to expose, so it is the one `NEXT_PUBLIC_` name. */
export function readStripePublishableKey(): string {
  return readEnv(["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]).NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
}

/** The signing secret (`whsec_...`) of the Stripe webhook endpoint; the webhook route verifies every request with it and answers 503 while it is unset. */
export function readStripeWebhookSecret(): string | undefined {
  return readOptionalEnv("STRIPE_WEBHOOK_SECRET")
}

/** The site's origin (https://www.trailheadirrigation.com in production), for links in messages and Stripe return pages. */
export function readAppUrl(): string {
  return readEnv(["APP_URL"]).APP_URL.replace(/\/+$/, "")
}
