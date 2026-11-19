import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { ApiError } from "@/api/core/errors"
import { authorizeUpload } from "@/api/v1/photos/authorize"
import { MAX_PHOTO_BYTES, PHOTO_TYPES, photoFolder, PHOTO_WORDS } from "@/lib/photos/rules"
import { photosConfigured } from "@/lib/photos/store"
import { photoContexts } from "../contexts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * The token for a browser's direct upload to the private store. A photo can be 10 MB and a function takes 4.5 MB, so the file never passes through
 * here: the browser asks for a token, sends the file to the store, then tells `photos.add`, which asks the store what it holds and writes the row.
 * The token is for one file path inside `photos/<visit id>/` and only after the photo rules (`assertCanAdd`) admit the caller for that visit;
 * it allows only the photo types, at most 10 MB, with a random suffix. There is no completion callback: nothing here writes a row.
 */
export async function POST(request: Request) {
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: "Send the upload request as JSON" }, { status: 400 })
  }
  try {
    const answer = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!photosConfigured()) throw new ApiError("unprocessable", PHOTO_WORDS.notSetUp)
        let visitId = ""
        let link: string | null = null
        try {
          const parsed = JSON.parse(clientPayload ?? "{}") as { visitId?: unknown; link?: unknown }
          visitId = typeof parsed.visitId === "string" ? parsed.visitId : ""
          link = typeof parsed.link === "string" && parsed.link ? parsed.link : null
        } catch {
          // falls through to the refusal below
        }
        if (!visitId || !pathname.startsWith(photoFolder(visitId)) || pathname.includes("..")) throw new ApiError("invalid", "That file is not in the visit's folder")
        await authorizeUpload(await photoContexts(visitId, link), visitId)
        return { allowedContentTypes: [...PHOTO_TYPES], maximumSizeInBytes: MAX_PHOTO_BYTES, addRandomSuffix: true, tokenPayload: JSON.stringify({ visitId }) }
      },
    })
    return NextResponse.json(answer)
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("photo upload token", error)
    return NextResponse.json({ error: PHOTO_WORDS.uploadFailed }, { status: 400 })
  }
}
