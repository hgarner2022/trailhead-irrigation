import type { Attention } from "./types"

// Home's rows about texts that did not arrive. One row per text was twenty rows for one cause (the sending number is not registered
// for business texting, Twilio 30034 or 30032). A cause that belongs to the number is ONE row, however many texts; a cause that belongs
// to a customer (a STOP, a bad or landline number, a carrier filter) is one row per customer, not per text; and while texts are paused
// the number's row folds into the paused row, so Home never has two rows about the number. Pure. The age of a row is the text's sent
// time, not the alert's creation time (the Check delivery button creates every alert at once).

/** The Twilio error codes that mean the sending number itself is blocked, for every customer. */
export const NUMBER_CODES = ["30034", "30032"]
/** The one key of the summary row; Home's button opens Settings. */
export const NUMBER_ROW_KEY = "number-not-registered"
export const isNumberCode = (code: string | null | undefined): boolean => NUMBER_CODES.includes((code ?? "").trim())

/** The time a row reads from, and who and what it is about, for a `text-undelivered` alert worked out in shape.ts. */
export interface UndeliveredAttention extends Attention {
  undelivered: { messageId: string; customerId: string; code: string | null; sentAt: string }
}

export const isUndeliveredRow = (r: Attention): r is UndeliveredAttention => r.kind === "text-undelivered" && Boolean((r as Partial<UndeliveredAttention>).undelivered)

const strip = ({ undelivered: _u, ...row }: UndeliveredAttention): Attention => row

const newest = (rows: UndeliveredAttention[]) => rows.reduce((a, b) => (a.undelivered.sentAt >= b.undelivered.sentAt ? a : b))
const oldest = (rows: UndeliveredAttention[]) => rows.reduce((a, b) => (a.undelivered.sentAt <= b.undelivered.sentAt ? a : b))

/** "Nov 18", the day in Mountain time. */
export const dayWords = (iso: string): string => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The summary row's words: "20 texts not delivered since Nov 18: the number is not registered for business texting yet". */
export const numberRowMessage = (rows: UndeliveredAttention[]) => `${plural(rows.length, "text", "texts")} not delivered since ${dayWords(oldest(rows).undelivered.sentAt)}: the number is not registered for business texting yet`

/** The paused row with the number's texts folded in: it says how many earlier texts did not arrive. */
export const pausedRowMessage = (base: string, rows: UndeliveredAttention[]) => `${base} ${plural(rows.length, "text", "texts")} sent before the pause ${rows.length === 1 ? "was" : "were"} not delivered.`

/** Merges the rows as described above. `rows` are already past the dismissals. Rows of every other kind pass through in place. */
export function groupUndelivered(rows: Attention[]): Attention[] {
  const undelivered = rows.filter(isUndeliveredRow)
  if (undelivered.length === 0) return rows
  const number = undelivered.filter((r) => isNumberCode(r.undelivered.code))
  const perCustomer = new Map<string, UndeliveredAttention[]>()
  for (const r of undelivered) if (!isNumberCode(r.undelivered.code)) perCustomer.set(r.undelivered.customerId, [...(perCustomer.get(r.undelivered.customerId) ?? []), r])
  const paused = rows.find((r) => r.kind === "texts-paused")

  const out: Attention[] = []
  const done = new Set<string>()
  let numberPlaced = false
  for (const r of rows) {
    if (r.kind === "texts-paused" && number.length > 0) {
      out.push({ ...r, message: pausedRowMessage(r.message, number), since: newest(number).undelivered.sentAt > r.since ? newest(number).undelivered.sentAt : r.since, members: [stripMember(r), ...number.map(strip)] })
      continue
    }
    if (!isUndeliveredRow(r)) {
      out.push(r)
      continue
    }
    if (isNumberCode(r.undelivered.code)) {
      // Folded into the paused row when there is one; otherwise one summary at the place of the first of them.
      if (paused || numberPlaced) continue
      numberPlaced = true
      out.push({ kind: "text-undelivered", key: NUMBER_ROW_KEY, message: numberRowMessage(number), since: newest(number).undelivered.sentAt, members: number.map(strip) })
      continue
    }
    const mine = perCustomer.get(r.undelivered.customerId)!
    if (mine.length === 1) {
      out.push({ ...strip(r), since: r.undelivered.sentAt })
      continue
    }
    if (done.has(r.undelivered.customerId)) continue
    done.add(r.undelivered.customerId)
    const latest = newest(mine)
    out.push({ ...strip(latest), key: `customer:${latest.undelivered.customerId}`, message: `${strip(latest).message} ${mine.length} texts in all.`, since: latest.undelivered.sentAt, members: mine.map(strip) })
  }
  return out
}

const stripMember = (r: Attention): Attention => {
  const { members: _m, ...rest } = r
  return rest
}

/**
 * Whether the newest texts that have a final delivery report say the sending number is blocked: the latest report (by sent time) is an
 * undelivered or failed text with a number code. The office's "Send a text" says so even with the pause switch off, so nobody types a
 * message that will not arrive. A later delivered text clears it.
 */
export function numberBlocked(messages: { channel: string; sentAt: string | null; deliveryStatus?: string | null; deliveryError?: string | null }[]): boolean {
  const final = messages.filter((m) => m.channel === "sms" && m.sentAt && (m.deliveryStatus === "delivered" || m.deliveryStatus === "undelivered" || m.deliveryStatus === "failed"))
  if (final.length === 0) return false
  const latest = final.reduce((a, b) => (a.sentAt! >= b.sentAt! ? a : b))
  return latest.deliveryStatus !== "delivered" && isNumberCode(latest.deliveryError)
}
