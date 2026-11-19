import { findReadablePhoto } from "@/api/v1/photos/authorize"
import { readStoredFile } from "@/lib/photos/store"
import { photoContexts } from "../contexts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const notFound = () => new Response("Not found", { status: 404, headers: { "cache-control": "private, no-store" } })

/**
 * One photo's file, streamed from the private store after the photo rules say this caller may read it (`findReadablePhoto`: the organization's
 * staff, a tech for a visit they had, the visit's customer for their own photo or a staff photo marked shown once the visit is Done; a text's
 * link `?t=` opens only its own visit). Nothing is ever served from the store's own address, the store is not listed, and a refusal is the same
 * plain 404 as a photo that does not exist. Never cached by a shared cache: `private, no-cache` lets the browser keep it and ask again.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { db } = await import("@/db")
  const token = new URL(request.url).searchParams.get("t")
  const photo = await findReadablePhoto(db(), id, (visitId) => photoContexts(visitId, token))
  if (!photo) return notFound()
  const file = await readStoredFile(photo.blobKey, request.headers.get("if-none-match"))
  if (!file) return notFound()
  const headers = new Headers({ "x-content-type-options": "nosniff", "cache-control": "private, no-cache", "content-security-policy": "default-src 'none'; sandbox" })
  if (file.statusCode === 304) {
    headers.set("etag", file.blob.etag)
    return new Response(null, { status: 304, headers })
  }
  headers.set("content-type", photo.contentType)
  headers.set("etag", file.blob.etag)
  headers.set("content-disposition", "inline")
  return new Response(file.stream, { status: 200, headers })
}
