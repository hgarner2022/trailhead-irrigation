import type { Metadata } from "next"
import { openapiDocument } from "@/api/openapi"
import { ApiDocs } from "@/components/blocks/ApiDocs"
import { toDocsModel, type OpenApiLike } from "@/components/blocks/api-docs-model"

// The API reference: public and indexable, outside the admin shell and outside the
// proxy's matcher (which covers only /admin and /account). Rendered from the same
// OpenAPI document that /api/v1/openapi.json serves, once per build.
export const dynamic = "force-static"

export const metadata: Metadata = {
  title: { absolute: "Trailhead API reference" },
  description: "The Trailhead API: customers, Season Passes, visits, the schedule and settings, over HTTPS with an API key or as MCP tools.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/developers" },
}

export default function DevelopersPage() {
  const model = toDocsModel(openapiDocument() as unknown as OpenApiLike, "/api/mcp")
  return (
    <main>
      <ApiDocs model={model} />
    </main>
  )
}
