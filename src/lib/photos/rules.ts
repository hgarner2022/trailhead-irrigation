// The file rules and the words for photos on a visit (docs/DATA_MODEL.md, photo). Pure: the browser checks a file with these before it uploads,
// the server checks again with what the store reports, and the screens say the same sentences.

/** 10 MB each, as the design settled. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
/** What we keep: JPEG, PNG, HEIC (and its HEIF twin) and WebP. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"] as const
/** More than this on one visit is almost certainly a mistake. */
export const MAX_PHOTOS_PER_VISIT = 30

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,image/webp"

export const PHOTO_WORDS = {
  tooBig: "That photo is over 10 MB.",
  wrongType: "That file is not a photo we can keep. Use a JPEG, PNG, HEIC or WebP.",
  uploadFailed: "Upload failed. Try again.",
  notSetUp: "Photos are not set up yet.",
  tooMany: `A visit holds up to ${MAX_PHOTOS_PER_VISIT} photos.`,
  empty: "No photos yet.",
} as const

const BY_EXTENSION: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", heif: "image/heif", webp: "image/webp" }

/** The type a file is, as its browser says it or, when the browser gives none (HEIC often has none), as its extension says. Empty when neither is a photo. */
export function photoTypeOf(file: { type: string; name: string }): string {
  const type = file.type.toLowerCase()
  if ((PHOTO_TYPES as readonly string[]).includes(type)) return type
  if (type && type !== "application/octet-stream") return type
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return BY_EXTENSION[ext] ?? type
}

export const isPhotoType = (type: string) => (PHOTO_TYPES as readonly string[]).includes(type.toLowerCase())

/** The sentence a file earns before it is sent, or null when it may go. */
export function photoProblem(file: { type: string; name: string; size: number }): string | null {
  if (!isPhotoType(photoTypeOf(file))) return PHOTO_WORDS.wrongType
  if (file.size > MAX_PHOTO_BYTES) return PHOTO_WORDS.tooBig
  return null
}

/** "1 photo", "2 photos". */
export const photoCount = (n: number) => `${n} photo${n === 1 ? "" : "s"}`

/** The folder one visit's files live in, in the private store. A key outside it is never accepted for that visit. */
export const photoFolder = (visitId: string) => `photos/${visitId}/`

/** A file name safe to put in a store path: letters, digits, dot, dash and underscore only, at most 60 characters. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+/, "").slice(-60)
  return cleaned || "photo"
}
