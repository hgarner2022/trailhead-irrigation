// The magic link in the email no longer points straight at Auth.js's
// callback. Mail scanners (Gmail, Outlook Safe Links, corporate filters)
// open links before the person does, and a one-time token opened by a
// scanner is spent before the real click, which shows as "Verification"
// on the sign-in page. So the email links to /sign-in/confirm, a page with
// one button, and the button submits a plain GET form to the callback.
// Scanners fetch pages; they do not press buttons. Pure, used by the
// sender and the page.

export const CONFIRM_PATH = "/sign-in/confirm"
const CALLBACK_PREFIX = "/api/auth/callback/"

/** The link to put in the email for Auth.js's callback `url`. */
export function confirmLinkFor(callbackUrl: string): string {
  const u = new URL(callbackUrl)
  return `${u.origin}${CONFIRM_PATH}?to=${encodeURIComponent(u.pathname + u.search)}`
}

export interface ConfirmForm {
  /** the callback path the form submits to */
  action: string
  /** the callback's query, as hidden fields */
  fields: [string, string][]
}

/** The form behind the button, or null when `to` is not one of our callback paths (a forged or mangled link). */
export function confirmFormFor(to: string | undefined): ConfirmForm | null {
  if (!to || !to.startsWith(CALLBACK_PREFIX)) return null
  const u = new URL(to, "https://placeholder.invalid")
  if (!u.pathname.startsWith(CALLBACK_PREFIX) || u.pathname.includes("..")) return null
  return { action: u.pathname, fields: [...u.searchParams.entries()] }
}
