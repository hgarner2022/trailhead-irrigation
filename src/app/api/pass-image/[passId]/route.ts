import "server-only"
import { eq } from "drizzle-orm"
import { callApi } from "@/api/core/call"
import { passesGet } from "@/api/v1/passes/handlers"
import { passFromApi } from "@/app/(account)/account/pass/pass-from-api"
import { db } from "@/db"
import * as s from "@/db/schema"
import { ctxForJob } from "@/lib/admin/api-ctx"
import { passImageModel, renderPassImage } from "@/lib/messaging/pass-image"
import { verifyToken } from "@/lib/messaging/tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * The pass card as a PNG, for the purchase confirmation email. The `token` is signed with `API_KEY_PEPPER` for this pass, so
 * the address cannot be guessed; a wrong or missing token is a plain 404.
 */
export async function GET(request: Request, { params }: { params: Promise<{ passId: string }> }) {
  const { passId } = await params
  if (!verifyToken("pass-image", passId, new URL(request.url).searchParams.get("token"))) return new Response("Not found", { status: 404 })
  const database = db()
  const [row] = await database.select({ organizationId: s.seasonPass.organizationId }).from(s.seasonPass).where(eq(s.seasonPass.id, passId))
  if (!row) return new Response("Not found", { status: 404 })
  const detail = await callApi(await ctxForJob(row.organizationId), passesGet, { id: passId })
  const image = await renderPassImage(passImageModel(passFromApi(detail)))
  image.headers.set("cache-control", "private, max-age=600")
  return image
}
