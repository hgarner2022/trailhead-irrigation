// What a text's delivery report means in words. Pure (no server-only): the Messages block, Notes and history and the Home row all read it.
// Twilio's own Messaging log in the console is where the raw status and error code live.

/** The words for the common error codes, each reading as a sentence ending ("Filtered by the carrier."). */
const REASONS: Record<string, string> = {
  "30003": "The phone is off or unreachable",
  "30005": "Unknown number",
  "30006": "Landline or unreachable carrier",
  "30007": "Filtered by the carrier",
  "30034": "The sending number is not registered for business texting",
  "30032": "The sending number is not registered for business texting",
  "21610": "The customer replied STOP",
  "21614": "Not a mobile number",
}

export interface DeliveryWords {
  /** "Sent" until a report arrives, then "Delivered" or "Not delivered" */
  label: "Sent" | "Delivered" | "Not delivered"
  /** why, for "Not delivered" only: "Filtered by the carrier"; null otherwise */
  reason: string | null
  /** true for "Not delivered": the screen draws it as trouble */
  trouble: boolean
}

/** True when a report says the text did not arrive. */
export const isUndelivered = (status: string | null | undefined): boolean => status === "undelivered" || status === "failed"

/** The reason for an error code, in plain words; "Twilio code N" for one not listed, and a plain line when there is no code. */
export function reasonWords(errorCode: string | null | undefined): string {
  const code = errorCode?.trim()
  if (!code) return "Twilio did not say why"
  return REASONS[code] ?? `Twilio code ${code}`
}

/** The words for a text's delivery: "Sent" with no report (or a report that is only progress), "Delivered", or "Not delivered" with the reason. */
export function deliveryWords(status: string | null | undefined, errorCode?: string | null): DeliveryWords {
  if (status === "delivered") return { label: "Delivered", reason: null, trouble: false }
  if (isUndelivered(status)) return { label: "Not delivered", reason: reasonWords(errorCode), trouble: true }
  return { label: "Sent", reason: null, trouble: false }
}

/** One line: "Delivered", "Not delivered: Filtered by the carrier", "Sent". */
export function deliveryLine(status: string | null | undefined, errorCode?: string | null): string {
  const w = deliveryWords(status, errorCode)
  return w.reason ? `${w.label}: ${w.reason}` : w.label
}
