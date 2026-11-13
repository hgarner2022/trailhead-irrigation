// What the sign-in pages' server actions do, with Auth.js's `signIn` injected so
// the rule is testable: ask for a link, then say where the browser goes next.

export type SignInBase = "/admin" | "/account"
export type SignInFn = (provider: "resend", options: { email: string; redirect: false; redirectTo: string }) => Promise<unknown>

/** Only a path inside the area the person is signing in to; anything else is dropped. */
export function safeNext(base: SignInBase, next: string | null | undefined): string {
  if (next && (next === base || next.startsWith(`${base}/`)) && !next.includes("//") && !next.includes("\\")) return next
  return base
}

function query(params: Record<string, string>) {
  return new URLSearchParams(params).toString()
}

/**
 * Asks Auth.js to email a link and returns the path to redirect to: the sent
 * page when it went out, the form with `?error=AccessDenied` when the email is
 * not on the list, `?error=Failed` for anything else. The email is only ever
 * carried to the next page so the field can be prefilled.
 */
export async function requestSignIn(base: SignInBase, formData: FormData, signIn: SignInFn, next?: string | null): Promise<string> {
  const email = String(formData.get("email") ?? "").trim()
  if (!email) return `${base}/sign-in?${query({ error: "Missing" })}`
  let result: unknown
  try {
    result = await signIn("resend", { email, redirect: false, redirectTo: safeNext(base, next) })
  } catch {
    return `${base}/sign-in?${query({ error: "Failed", email })}`
  }
  const error = typeof result === "string" ? new URL(result, "http://localhost").searchParams.get("error") : null
  if (error === "AccessDenied") return `${base}/sign-in?${query({ error: "AccessDenied", email })}`
  if (error) return `${base}/sign-in?${query({ error: "Failed", email })}`
  return `${base}/sign-in/sent?${query({ email })}`
}
