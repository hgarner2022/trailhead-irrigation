import "server-only"
import { del, get, head } from "@vercel/blob"
import { readOptionalEnv } from "@/lib/env"

// The one place the private Vercel Blob store is touched (docs/DATA_MODEL.md, photo). Tests mock `@vercel/blob`; nothing else imports it.
// The store is private: a file is read with the token, so the app serves it through `/api/photos/<id>` after checking who is asking.

/** Whether the store is connected here. Without its token the Photos section says so and uploads are refused. */
export const photosConfigured = (): boolean => Boolean(readOptionalEnv("BLOB_READ_WRITE_TOKEN"))

export interface StoredFile { size: number; contentType: string }

/** What the store holds under a key, or null when it holds nothing (the upload never arrived). */
export async function storedFile(key: string): Promise<StoredFile | null> {
  try {
    const found = await head(key)
    return { size: found.size, contentType: found.contentType }
  } catch {
    return null
  }
}

/** Removes a file. A file already gone is not an error. */
export async function removeStoredFile(key: string): Promise<void> {
  try {
    await del(key)
  } catch (error) {
    console.error("photo file not removed", key, error)
  }
}

/** The file as a stream with its type, or null when the store has none under the key. */
export async function readStoredFile(key: string, ifNoneMatch?: string | null) {
  const result = await get(key, { access: "private", ...(ifNoneMatch ? { ifNoneMatch } : {}) })
  return result ?? null
}
