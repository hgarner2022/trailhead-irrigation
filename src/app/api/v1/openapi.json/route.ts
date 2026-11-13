import { openapiDocument } from "@/api/openapi"

// Public: the contract is documentation. Built once per server start.
export const dynamic = "force-static"

export function GET() {
  return Response.json(openapiDocument(), { headers: { "cache-control": "public, max-age=300" } })
}
