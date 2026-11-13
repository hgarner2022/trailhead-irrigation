// The registry from a message kind and its arguments to the email (subject, text, HTML). Part of the templates commit fills it in.

export interface RenderedEmail {
  subject: string
  text: string
  html: string
}

export function renderEmail(_kind: string, _data: Record<string, unknown> | null): RenderedEmail | null {
  return null
}
