// @vitest-environment node
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { openapiDocument } from "./openapi"
import { handlers } from "./v1"

const doc = openapiDocument() as unknown as {
  openapi: string
  paths: Record<string, Record<string, { operationId: string; summary: string; security: unknown[]; parameters?: { name: string; in: string }[]; requestBody?: unknown; responses: Record<string, unknown> }>>
  components: { schemas?: Record<string, unknown>; securitySchemes: Record<string, unknown> }
}

describe("the handler registry", () => {
  it("has unique names and unique method and path pairs", () => {
    expect(new Set(handlers.map((h) => h.name)).size).toBe(handlers.length)
    expect(new Set(handlers.map((h) => `${h.method} ${h.path}`)).size).toBe(handlers.length)
  })
  it("has a route file for every path", () => {
    for (const h of handlers) {
      const file = fileURLToPath(new URL(`../app/api/v1${h.path.replace(/\{(\w+)\}/g, "[$1]")}/route.ts`, import.meta.url))
      expect(existsSync(file), h.name).toBe(true)
    }
  })
})

describe("openapiDocument", () => {
  it("is OpenAPI 3.1 with an operation for every handler, each with an id, a summary and a security requirement", () => {
    expect(doc.openapi).toBe("3.1.0")
    for (const h of handlers) {
      const op = doc.paths[h.path]?.[h.method.toLowerCase()]
      expect(op, h.name).toBeDefined()
      expect(op!.operationId).toBe(h.name)
      expect(op!.summary.length, h.name).toBeGreaterThan(10)
      expect(op!.security).toEqual([{ bearerAuth: [h.scope] }])
      expect(Object.keys(op!.responses), h.name).toContain(String(h.status ?? 200))
      expect(Object.keys(op!.responses), h.name).toEqual(expect.arrayContaining(["400", "401", "403", "429"]))
    }
  })
  it("declares every path parameter and the idempotency header on writes", () => {
    for (const h of handlers) {
      const op = doc.paths[h.path]![h.method.toLowerCase()]!
      for (const name of [...h.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1])) expect(op.parameters?.some((p) => p.in === "path" && p.name === name), `${h.name} ${name}`).toBe(true)
      if (h.method !== "GET") expect(op.parameters?.some((p) => p.in === "header" && p.name === "Idempotency-Key"), h.name).toBe(true)
    }
  })
  it("puts GET inputs in the query and write inputs in the body", () => {
    const list = doc.paths["/passes"]!.get!
    expect(list.parameters?.filter((p) => p.in === "query").map((p) => p.name)).toEqual(expect.arrayContaining(["season", "status", "town", "limit", "cursor"]))
    expect(doc.paths["/passes"]!.post!.requestBody).toBeDefined()
    expect(doc.paths["/passes/{id}/cancel"]!.post!.requestBody).toBeDefined()
  })
  it("resolves every $ref and survives a JSON round trip", () => {
    const text = JSON.stringify(doc)
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(doc)))
    for (const ref of text.matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)) expect(doc.components.schemas?.[ref[1]!], ref[1]).toBeDefined()
    expect(doc.components.securitySchemes.bearerAuth).toBeDefined()
  })
  it("names no secret field in any output", () => {
    const text = JSON.stringify(doc)
    for (const field of ["stripePaymentMethodId", "stripe_payment_method_id", "stripeCustomerId", "hash"]) expect(text).not.toContain(`"${field}"`)
  })
})
