// The sign-in email as a pure function: the link, the host and who it is for
// in, the subject, the text and the HTML out. Tested on its wording.

export interface SignInEmailInput {
  url: string
  /** the site's host, shown so people can see where the link goes */
  host: string
}

export interface SignInEmail {
  subject: string
  text: string
  html: string
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function signInEmail({ url, host }: SignInEmailInput): SignInEmail {
  const subject = "Your Trailhead sign-in link"
  const text = [
    "Hi,",
    "",
    `Use this link to sign in to Trailhead at ${host}:`,
    url,
    "",
    "It works once and for ten minutes.",
    "",
    "If you did not ask for it, you can ignore this email and nothing happens.",
    "",
    "Trailhead Lawn & Irrigation",
  ].join("\n")
  const safeUrl = escapeHtml(url)
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#faf9f5;font-family:Helvetica,Arial,sans-serif;color:#1e293b"><table role="presentation" width="100%" style="max-width:480px;margin:0 auto"><tr><td><p style="margin:0 0 16px;font-size:16px">Use this link to sign in to Trailhead at ${escapeHtml(host)}.</p><p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#b45309;color:#ffffff;text-decoration:none;font-weight:600">Sign in</a></p><p style="margin:0 0 16px;font-size:14px">It works once and for ten minutes.</p><p style="margin:0;font-size:13px;color:#78716c">If you did not ask for it, you can ignore this email and nothing happens.</p></td></tr></table></body></html>`
  return { subject, text, html }
}
