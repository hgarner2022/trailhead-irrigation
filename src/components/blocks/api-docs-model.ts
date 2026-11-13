// The model behind ApiDocs: the OpenAPI document (a plain JSON object) reduced to
// what the page shows. Pure, no imports from the API itself, so the block and its
// stories never touch a server library.

export interface DocField {
  name: string
  type: string
  required: boolean
  description?: string
}

export interface DocOperation {
  id: string
  method: "GET" | "POST" | "PATCH" | "DELETE"
  path: string
  scope: string
  customerSelf: boolean
  summary: string
  /** path parameters, query parameters and body fields, in that order */
  input: DocField[]
  /** the top-level fields of the success body, one level into arrays and objects */
  output: DocField[]
  status: string
  curl: string
}

export interface DocResource {
  name: string
  operations: DocOperation[]
}

export interface ApiDocsModel {
  title: string
  description: string
  baseUrl: string
  mcpUrl: string
  resources: DocResource[]
}

type Schema = { type?: string | string[]; enum?: unknown[]; items?: Schema; properties?: Record<string, Schema>; required?: string[]; description?: string; anyOf?: Schema[]; oneOf?: Schema[]; format?: string; $ref?: string }
type Param = { name: string; in: string; required?: boolean; schema?: Schema; description?: string }
type Op = { operationId: string; summary: string; tags?: string[]; "x-scope"?: string; "x-customer-self"?: boolean; parameters?: Param[]; requestBody?: { content: { "application/json": { schema: Schema } } }; responses: Record<string, { content?: { "application/json": { schema: Schema } } }> }
export interface OpenApiLike {
  info: { title: string; description?: string }
  servers?: { url: string }[]
  paths: Record<string, Record<string, Op>>
  components?: { schemas?: Record<string, Schema> }
}

const METHODS = ["get", "post", "patch", "delete"] as const

/** A short readable type: `string`, `integer`, `Erie | Longmont`, `array of string`, `string or null`. */
export function typeOf(schema: Schema | undefined, components: Record<string, Schema> = {}): string {
  if (!schema) return "any"
  if (schema.$ref) return typeOf(components[schema.$ref.split("/").pop() ?? ""], components)
  const variants = schema.anyOf ?? schema.oneOf
  if (variants) {
    const nonNull = variants.filter((v) => v.type !== "null")
    const base = nonNull.map((v) => typeOf(v, components)).join(" or ")
    return nonNull.length < variants.length ? `${base} or null` : base
  }
  if (schema.enum) return schema.enum.map(String).join(" | ")
  if (Array.isArray(schema.type)) return schema.type.filter((t) => t !== "null").join(" or ") + (schema.type.includes("null") ? " or null" : "")
  if (schema.type === "array") return `array of ${typeOf(schema.items, components)}`
  if (schema.format === "email") return "email"
  return schema.type ?? "any"
}

function resolve(schema: Schema | undefined, components: Record<string, Schema>): Schema | undefined {
  return schema?.$ref ? components[schema.$ref.split("/").pop() ?? ""] : schema
}

/** The fields of an object schema; arrays of objects and nested objects are opened one level, as `data[].id` and `consent.source`. */
export function fieldsOf(schema: Schema | undefined, components: Record<string, Schema> = {}, prefix = "", depth = 0): DocField[] {
  const object = resolve(schema, components)
  if (!object?.properties) return []
  const required = new Set(object.required ?? [])
  return Object.entries(object.properties).flatMap(([name, raw]) => {
    const prop = resolve(raw, components)
    const field: DocField = { name: prefix + name, type: typeOf(raw, components), required: required.has(name), description: prop?.description ?? raw.description }
    const inner = resolve(prop?.type === "array" ? prop.items : nonNullVariant(prop, components) ?? prop, components)
    const opens = depth === 0 && inner?.properties
    return opens ? [field, ...fieldsOf(inner, components, `${prefix}${name}${prop?.type === "array" ? "[]" : ""}.`, depth + 1)] : [field]
  })
}

function nonNullVariant(schema: Schema | undefined, components: Record<string, Schema>): Schema | undefined {
  const variants = schema?.anyOf ?? schema?.oneOf
  return resolve(variants?.find((v) => v.type !== "null"), components)
}

function sample(schema: Schema | undefined, components: Record<string, Schema>): unknown {
  const s = resolve(schema, components) ?? {}
  if (s.enum) return s.enum[0]
  const v = s.anyOf ?? s.oneOf
  if (v) return sample(v.find((x) => x.type !== "null"), components)
  switch (Array.isArray(s.type) ? s.type[0] : s.type) {
    case "integer":
    case "number":
      return 1
    case "boolean":
      return true
    case "array":
      return [sample(s.items, components)]
    case "object":
      return Object.fromEntries(Object.entries(s.properties ?? {}).filter(([k]) => s.required?.includes(k)).map(([k, p]) => [k, sample(p, components)]))
    default:
      return s.format === "email" ? "name@example.com" : "..."
  }
}

/** A curl line for one operation with placeholders for ids and a body of its required fields. */
export function curlFor(method: string, baseUrl: string, path: string, body: Schema | undefined, components: Record<string, Schema> = {}): string {
  const url = baseUrl + path.replace(/\{(\w+)\}/g, (_, n: string) => `<${n}>`)
  const lines = [`curl ${method === "GET" ? "" : `-X ${method} `}"${url}" \\`, `  -H "Authorization: Bearer $TRAILHEAD_API_KEY"`]
  if (method !== "GET") lines[lines.length - 1] += " \\\n  -H \"Idempotency-Key: $(uuidgen)\""
  if (body?.properties) {
    lines[lines.length - 1] += " \\"
    lines.push(`  -H "Content-Type: application/json" \\`, `  -d '${JSON.stringify(sample(body, components))}'`)
  }
  return lines.join("\n")
}

export function toDocsModel(doc: OpenApiLike, mcpUrl = "/api/mcp"): ApiDocsModel {
  const components = doc.components?.schemas ?? {}
  const baseUrl = doc.servers?.[0]?.url ?? "/api/v1"
  const byResource = new Map<string, DocOperation[]>()
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const key of METHODS) {
      const op = item[key]
      if (!op) continue
      const params = (op.parameters ?? []).filter((p) => p.in !== "header")
      const body = op.requestBody?.content["application/json"].schema
      const status = Object.keys(op.responses).find((c) => c.startsWith("2")) ?? "200"
      const out = op.responses[status]?.content?.["application/json"].schema
      const input: DocField[] = [
        ...params.map((p) => ({ name: p.name, type: typeOf(p.schema, components), required: Boolean(p.required) || p.in === "path", description: p.description ?? p.schema?.description })),
        ...fieldsOf(body, components),
      ]
      const operation: DocOperation = {
        id: op.operationId,
        method: key.toUpperCase() as DocOperation["method"],
        path,
        scope: op["x-scope"] ?? "read",
        customerSelf: op["x-customer-self"] ?? false,
        summary: op.summary,
        input,
        output: fieldsOf(out, components),
        status,
        curl: curlFor(key.toUpperCase(), baseUrl, path, body, components),
      }
      const name = op.tags?.[0] ?? op.operationId.split(".")[0]!
      byResource.set(name, [...(byResource.get(name) ?? []), operation])
    }
  }
  return { title: doc.info.title, description: doc.info.description ?? "", baseUrl, mcpUrl, resources: [...byResource].map(([name, operations]) => ({ name, operations })) }
}
