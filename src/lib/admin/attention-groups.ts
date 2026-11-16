import type { Attention } from "./types"

/**
 * One Needs action row per kind and cause (owner, 16 Nov: six identical "message task is retrying" rows). The queue
 * failures that share a task kind and a cause become one row that says how many and why; Retry retries all of them
 * and Dismiss dismisses all of them (the row carries its `members`). A single failure keeps its own row. Pure.
 */

const TWILIO_AUTH = /twilio.*(authentication|credentials|invalid username|20003|401|403)|authentication error/i

/** The cause of a failure in words a person can act on, and a stable id to group by. */
export function causeOf(lastError: string | null): { id: string; words: string } {
  const error = (lastError ?? "").trim()
  if (!error) return { id: "none", words: "no error was recorded." }
  if (TWILIO_AUTH.test(error)) return { id: "twilio-auth", words: "Twilio rejected the account credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Vercel." }
  const short = error.length > 140 ? `${error.slice(0, 137)}...` : error
  return { id: error, words: /[.!?]$/.test(short) ? short : `${short}.` }
}

const NOUNS: Record<string, string> = {
  message: "messages could not be sent",
  "stripe-webhook": "Stripe events could not be processed",
  "jobber-webhook": "Jobber updates could not be processed",
  "pass-onboard": "new passes could not be set up",
}

/** "6 texts could not be sent: Twilio rejected ..." The Twilio cause names texts, since it only ever rejects those. */
export function groupMessage(queueKind: string, count: number, cause: { id: string; words: string }): string {
  const noun = cause.id === "twilio-auth" ? "texts could not be sent" : (NOUNS[queueKind] ?? `${queueKind} tasks could not finish`)
  return `${count} ${noun}: ${cause.words}`
}

/** A queue row before grouping: the attention row plus what it was worked out from. */
export interface QueueAttention extends Attention {
  queueKind: string
  cause: { id: string; words: string }
}

const isQueue = (r: Attention): r is QueueAttention => r.kind === "jobs-failed" && Boolean((r as Partial<QueueAttention>).queueKind) && Boolean((r as Partial<QueueAttention>).cause)

/** Merges queue rows that share a kind and cause (two or more) into one; leaves every other row as it was, in place. */
export function groupAttention(rows: Attention[]): Attention[] {
  const groups = new Map<string, QueueAttention[]>()
  for (const r of rows) {
    if (!isQueue(r)) continue
    const id = `${r.queueKind}:${r.cause.id}`
    groups.set(id, [...(groups.get(id) ?? []), r])
  }
  const out: Attention[] = []
  const done = new Set<string>()
  for (const r of rows) {
    if (!isQueue(r)) {
      out.push(r)
      continue
    }
    const id = `${r.queueKind}:${r.cause.id}`
    const members = groups.get(id)!
    if (members.length < 2) {
      out.push(r)
      continue
    }
    if (done.has(id)) continue
    done.add(id)
    const newest = members.reduce((a, b) => (a.since >= b.since ? a : b))
    out.push({
      kind: "jobs-failed",
      key: `group:${id}`,
      message: groupMessage(r.queueKind, members.length, r.cause),
      since: newest.since,
      queueKind: r.queueKind,
      queueIds: members.flatMap((m) => m.queueIds ?? []),
      members: members.map(({ cause: _cause, ...member }) => member),
    })
  }
  return out
}
