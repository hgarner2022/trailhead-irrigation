import "server-only"
import { callApi } from "@/api/core/call"
import { passesGet } from "@/api/v1/passes/handlers"
import { passFromApi } from "@/app/(account)/account/pass/pass-from-api"
import { db } from "@/db"
import { ctxForJob } from "@/lib/admin/api-ctx"
import { passImageModel, renderPassImage } from "@/lib/messaging/pass-image"
import { verifyToken } from "@/lib/messaging/tokens"
import { resolvePassJobAnywhere } from "@/lib/pass/server/resolve"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * The pass card as a PNG, for the purchase confirmation email. The `token` is signed with `API_KEY_PEPPER` for this pass, so
 * the address cannot be guessed; a wrong or missing token is a plain 404. The id in the address is the pass's job id, or the old
 * pass id of an email sent before the move: the signature is checked over the id exactly as it arrived, then the id is resolved.
 */
export async function GET(request: Request, { params }: { params: Promise<{ passId: string }> }) {
  const { passId } = await params
  if (!verifyToken("pass-image", passId, new URL(request.url).searchParams.get("token"))) return new Response("Not found", { status: 404 })
  const database = db()
  const job = await resolvePassJobAnywhere(database, passId)
  if (!job) return new Response("Not found", { status: 404 })
  const detail = await callApi(await ctxForJob(job.organizationId), passesGet, { id: job.id })
  const image = await renderPassImage(passImageModel(passFromApi(detail)))
  image.headers.set("cache-control", "private, max-age=600")
  return image
}
