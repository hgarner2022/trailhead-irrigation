"use client"

import { upload } from "@vercel/blob/client"
import { photoFolder, photoProblem, photoTypeOf, PHOTO_WORDS, safeFileName } from "./rules"
import type { PhotoItem } from "./types"

// The browser's half of adding a photo: check the file, ask `/api/photos/upload` for a token for this visit's folder, send the file straight to the
// private store (a photo can be 10 MB, more than a function takes), then tell the server which file arrived (`confirm` is the `photos.add` call
// the screen supplies) so it writes the row after asking the store what it really holds. No identity is sent: the route knows who is signed in,
// or reads the text link's token it was handed.

export type AddPhotoResult = { ok: true; photo: PhotoItem } | { ok: false; message: string }

export interface AddPhotoOptions {
  visitId: string
  /** a text's link token, for a customer who opened the visit page by the link (no sign-in) */
  link?: string
  /** `photos.add` for this visit and the key the store answered; resolves with the new photo or the API's words */
  confirm: (visitId: string, blobKey: string) => Promise<AddPhotoResult>
  /** the upload itself; swapped in tests and stories */
  send?: (file: File, visitId: string, link?: string) => Promise<string>
}

const KNOWN = new Set<string>(Object.values(PHOTO_WORDS))

/** The sentence an upload error earns: the server's own when it is one of ours, else "Upload failed. Try again." */
export const uploadWords = (error: unknown): string => (error instanceof Error && KNOWN.has(error.message) ? error.message : PHOTO_WORDS.uploadFailed)

async function sendToStore(file: File, visitId: string, link?: string): Promise<string> {
  const blob = await upload(`${photoFolder(visitId)}${safeFileName(file.name)}`, file, {
    access: "private",
    handleUploadUrl: "/api/photos/upload",
    clientPayload: JSON.stringify({ visitId, ...(link ? { link } : {}) }),
    contentType: photoTypeOf(file),
  })
  return blob.pathname
}

/** Adds one file to a visit end to end. Never throws: a refused or failed file answers the words to show. */
export async function addPhotoFlow(file: File, { visitId, link, confirm, send = sendToStore }: AddPhotoOptions): Promise<AddPhotoResult> {
  const problem = photoProblem(file)
  if (problem) return { ok: false, message: problem }
  let key: string
  try {
    key = await send(file, visitId, link)
  } catch (error) {
    return { ok: false, message: uploadWords(error) }
  }
  try {
    return await confirm(visitId, key)
  } catch {
    return { ok: false, message: PHOTO_WORDS.uploadFailed }
  }
}
