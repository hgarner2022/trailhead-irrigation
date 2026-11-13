import "server-only"
import { createDocument } from "zod-openapi"
import { z } from "zod"
import type { AnyHandler } from "./core/handler"
import { RATE_LIMIT_PER_MINUTE } from "./core/call"
import { handlers as registry } from "./v1"

type Methods = "get" | "post" | "patch" | "delete"

export const ErrorBody = z
  .object({ error: z.object({ code: z.string().describe("invalid, unauthorized, forbidden, not_found, conflict, unprocessable, rate_limited, not_implemented"), message: z.string(), issues: z.array(z.object({ path: z.string(), message: z.string() })).optional() }) })
  .meta({ id: "Error", description: "Every error has this shape." })

const ERRORS: [string, string][] = [
  ["400", "The input did not match the schema; `error.issues` lists the fields."],
  ["401", "No valid API key or session."],
  ["403", "The key's scopes do not allow this call."],
  ["404", "Not found."],
  ["409", "Conflict, including an Idempotency-Key reused for a different request."],
  ["422", "The input is valid but a rule refuses it."],
  ["429", `More than ${RATE_LIMIT_PER_MINUTE} requests a minute.`],
]

const pathParams = (path: string) => [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!)

/** The resource a handler belongs to: the first part of its name ("passes.list" is "passes"). */
export const resourceOf = (h: { name: string }) => h.name.split(".")[0]!

/** OpenAPI 3.1, generated from every registered handler's Zod schemas. */
export function openapiDocument(handlers: readonly AnyHandler[] = registry) {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const h of handlers) {
    const names = pathParams(h.path)
    const mask = Object.fromEntries(names.map((n) => [n, true])) as Record<string, true>
    const rest = h.input.omit(mask)
    const hasRest = Object.keys(rest.shape).length > 0
    const writes = h.method !== "GET"
    const operation = {
      operationId: h.name,
      summary: h.summary,
      tags: [resourceOf(h)],
      security: [{ bearerAuth: [h.scope] }],
      "x-scope": h.scope,
      "x-customer-self": h.customerSelf ?? false,
      requestParams: {
        ...(names.length ? { path: h.input.pick(mask) } : {}),
        ...(h.method === "GET" && hasRest ? { query: rest } : {}),
        ...(writes ? { header: z.object({ "Idempotency-Key": z.string().optional().describe("Repeating a write with the same key returns the first response; a different request on the same key is a 409.") }) } : {}),
      },
      ...(h.method === "POST" || h.method === "PATCH" ? { requestBody: hasRest ? { content: { "application/json": { schema: rest } } } : undefined } : {}),
      responses: {
        [String(h.status ?? 200)]: { description: "Success.", content: { "application/json": { schema: h.output } } },
        ...Object.fromEntries(ERRORS.map(([code, description]) => [code, { description, content: { "application/json": { schema: ErrorBody } } }])),
      },
    }
    ;(paths[h.path] ??= {})[h.method.toLowerCase() as Methods] = operation
  }
  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "Trailhead API",
      version: "1.0.0",
      description: [
        "Everything the Trailhead admin does goes through this API, and so can your agent.",
        "v1 is stable; breaking changes get v2.",
        "Send `Authorization: Bearer th_live_...` with an API key made in Settings. Scopes: `read`, `write`, `admin`.",
        `Rate limit: ${RATE_LIMIT_PER_MINUTE} requests a minute per key. Lists return \`{ data, next_cursor }\`; pass \`next_cursor\` back as \`cursor\`.`,
        "Writes accept an `Idempotency-Key` header. Errors are `{ error: { code, message, issues? } }`.",
        "The same operations are exposed as MCP tools at /api/mcp.",
      ].join(" "),
    },
    servers: [{ url: "/api/v1" }],
    tags: [...new Set(handlers.map(resourceOf))].map((name) => ({ name })),
    paths: paths as never,
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "An API key, th_live_..." } } },
  })
}
