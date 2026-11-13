import "server-only"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import type { Database } from "@/db/types"
import { principalFromRequest } from "@/lib/auth/principal"
import { callApi } from "./core/call"
import { makeCtx, type Ctx } from "./core/context"
import { ApiError } from "./core/errors"
import { handlers } from "./v1"

/** One MCP tool per handler, named by its operation id, running through `callApi` so every tool call is scoped, validated and logged like any other call. */
export function createMcpServer(ctx: Ctx, list = handlers) {
  const server = new McpServer({ name: "trailhead", version: "1.0.0" }, { instructions: "Trailhead Lawn & Irrigation: customers, Season Passes, visits, the schedule, settings. Every tool is one API operation; scopes follow the API key." })
  for (const h of list) {
    server.registerTool(
      h.name,
      {
        description: `${h.summary} (needs the ${h.scope} scope)`,
        inputSchema: h.input.shape,
        annotations: { readOnlyHint: h.method === "GET", destructiveHint: h.method === "DELETE", idempotentHint: h.method === "GET" },
      },
      async (args: unknown) => {
        try {
          const out = await callApi(ctx, h, args)
          return { content: [{ type: "text" as const, text: JSON.stringify(out) }] }
        } catch (error) {
          if (!(error instanceof ApiError)) {
            console.error("mcp tool error", ctx.requestId, h.name, error)
            return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: { code: "internal", message: "Something went wrong" } }) }] }
          }
          return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: { code: error.code, message: error.message, ...(error.issues ? { issues: error.issues } : {}) } }) }] }
        }
      },
    )
  }
  return server
}

export interface McpDeps {
  database?: () => Database
}

const unauthorized = () =>
  new Response(JSON.stringify({ error: { code: "unauthorized", message: "Send a valid API key as `Authorization: Bearer th_live_...`" } }), { status: 401, headers: { "content-type": "application/json", "www-authenticate": 'Bearer realm="trailhead"' } })

/** The streamable-HTTP MCP endpoint, stateless: the bearer key is the only way in, and it is checked on every request. */
export async function handleMcp(request: Request, deps: McpDeps = {}): Promise<Response> {
  const db = deps.database ? deps.database() : (await import("@/db")).db()
  const principal = await principalFromRequest(db, request, async () => null)
  if (!principal) return unauthorized()
  const server = createMcpServer(makeCtx(db, principal))
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  try {
    return await transport.handleRequest(request)
  } finally {
    void server.close()
  }
}
