/**
 * The one place a customer's contact details are cleaned before they are
 * stored or shown. The checkout, the booking form and the API all pass what
 * was typed through these, so "  hannah garner " is stored as "Hannah Garner",
 * "Hannahn.Garner@Gmail.com " as "hannahn.garner@gmail.com" and "3038196133",
 * "(303) 819-6133" or "+1 303 819 6133" all as "+13038196133", which prints as
 * "(303) 819-6133". Pure, no imports, safe in the browser and on the server.
 */

/** Small words that stay lower case inside a name, and prefixes whose next letter is capitalised. */
const LOWER = new Set(["van", "von", "de", "del", "della", "di", "da", "du", "la", "le", "der", "den", "bin", "al"])

function capitalise(word: string): string {
  if (!word) return word
  // O'Brien, D'Angelo
  if (/^[a-z]'[a-z]/i.test(word)) return word[0]!.toUpperCase() + "'" + word[2]!.toUpperCase() + word.slice(3).toLowerCase()
  // McDonald, MacLeod (only when more follows the prefix)
  const mc = /^(mc|mac)([a-z])(.+)$/i.exec(word)
  if (mc) return mc[1]![0]!.toUpperCase() + mc[1]!.slice(1).toLowerCase() + mc[2]!.toUpperCase() + mc[3]!.toLowerCase()
  return word[0]!.toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * A person's name as it should print: trimmed, one space between parts, each part capitalised, hyphenated parts
 * capitalised on both sides, lower-case particles kept lower after the first word. A name typed in capitals or in lower
 * case comes out the same. A name already cased deliberately (two capitals inside a word, like "DeShawn") is kept.
 */
export function cleanName(raw: string): string {
  const parts = raw.trim().replace(/\s+/g, " ").split(" ").filter(Boolean)
  return parts
    .map((part, i) => {
      if (/^[A-Z]?[a-z]+[A-Z]/.test(part)) return part // deliberate inner capital, as typed
      if (i > 0 && LOWER.has(part.toLowerCase())) return part.toLowerCase()
      return part.split("-").map(capitalise).join("-")
    })
    .join(" ")
}

/** An email as it is stored and compared: trimmed and lower case (the local part too, which every mail provider treats that way). */
export function cleanEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** The digits of a phone number with a US country code stripped, or null when it is not ten digits. */
function tenDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  return national.length === 10 ? national : null
}

/** A US phone as it is stored, in E.164 (`+13038196133`), or null when what was typed is not a ten-digit number. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const national = tenDigits(raw)
  return national ? `+1${national}` : null
}

/** A phone as it prints, `(303) 819-6133`; anything that is not a ten-digit US number prints as typed. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ""
  const national = tenDigits(raw)
  return national ? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}` : raw.trim()
}

/** A street address or note as it is stored: trimmed, inner runs of spaces collapsed, no stray line breaks. */
export function cleanText(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim()
}
