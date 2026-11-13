import { describe, expect, it } from "vitest"
import { curlFor, fieldsOf, toDocsModel, typeOf, type OpenApiLike } from "./api-docs-model"

const doc: OpenApiLike = {
  info: { title: "Trailhead API", description: "v1 is stable." },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/passes": {
      get: {
        operationId: "passes.list", summary: "List passes.", tags: ["passes"], "x-scope": "read",
        parameters: [
          { name: "town", in: "query", schema: { type: "string", enum: ["Erie", "Longmont"] } },
          { name: "limit", in: "query", schema: { type: "integer", description: "Rows per page." } },
          { name: "Idempotency-Key", in: "header", schema: { type: "string" } },
        ],
        responses: { "200": { content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { type: "array", items: { type: "object", required: ["id"], properties: { id: { type: "string" }, note: { anyOf: [{ type: "string" }, { type: "null" }] } } } }, next_cursor: { anyOf: [{ type: "string" }, { type: "null" }] } } } } } } },
      },
    },
    "/passes/{id}/cancel": {
      post: {
        operationId: "passes.cancel", summary: "Cancel a pass.", tags: ["passes"], "x-scope": "write", "x-customer-self": true,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["reason"], properties: { reason: { type: "string" } } } } } },
        responses: { "200": { content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } } },
      },
    },
  },
}

describe("typeOf", () => {
  it("reads enums, arrays and nullable unions", () => {
    expect(typeOf({ type: "string", enum: ["a", "b"] })).toBe("a | b")
    expect(typeOf({ type: "array", items: { type: "string" } })).toBe("array of string")
    expect(typeOf({ anyOf: [{ type: "string" }, { type: "null" }] })).toBe("string or null")
    expect(typeOf({ type: "string", format: "email" })).toBe("email")
  })
})

describe("fieldsOf", () => {
  it("opens an array of objects one level, as data[].id", () => {
    const schema = doc.paths["/passes"]!.get!.responses["200"]!.content!["application/json"].schema
    expect(fieldsOf(schema).map((f) => f.name)).toEqual(["data", "data[].id", "data[].note", "next_cursor"])
    expect(fieldsOf(schema).find((f) => f.name === "data[].note")!.type).toBe("string or null")
  })
})

describe("toDocsModel", () => {
  const model = toDocsModel(doc)
  it("groups operations by resource with method, path, scope and the success status", () => {
    expect(model.resources.map((r) => r.name)).toEqual(["passes"])
    expect(model.resources[0]!.operations.map((o) => [o.method, o.path, o.scope])).toEqual([["GET", "/passes", "read"], ["POST", "/passes/{id}/cancel", "write"]])
    expect(model.baseUrl).toBe("/api/v1")
  })
  it("lists path, query and body fields as input and leaves the header out", () => {
    const [list, cancel] = model.resources[0]!.operations
    expect(list!.input.map((f) => f.name)).toEqual(["town", "limit"])
    expect(list!.input[0]).toMatchObject({ type: "Erie | Longmont", required: false })
    expect(cancel!.input.map((f) => [f.name, f.required])).toEqual([["id", true], ["reason", true]])
    expect(cancel!.customerSelf).toBe(true)
  })
  it("writes a curl line with placeholders, the key header, an idempotency key and a body of the required fields", () => {
    const [list, cancel] = model.resources[0]!.operations
    expect(list!.curl).toBe('curl "/api/v1/passes" \\\n  -H "Authorization: Bearer $TRAILHEAD_API_KEY"')
    expect(cancel!.curl).toContain('-X POST "/api/v1/passes/<id>/cancel"')
    expect(cancel!.curl).toContain("Idempotency-Key")
    expect(cancel!.curl).toContain(`-d '{"reason":"..."}'`)
    expect(curlFor("DELETE", "/api/v1", "/trucks/{id}", undefined)).not.toContain("-d")
  })
})
