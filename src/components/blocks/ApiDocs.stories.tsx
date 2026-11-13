import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ApiDocs } from "./ApiDocs"
import { toDocsModel, type OpenApiLike } from "./api-docs-model"

const string = { type: "string" }
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] })
const town = { type: "string", enum: ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"] }
const passProps = { id: string, number: { type: "string", description: "TH-<season>-NNNN." }, season: { type: "integer" }, firstName: string, town, status: { type: "string", enum: ["pending", "active", "cancelled", "lapsed"] } }
const err = (c: string) => ({ [c]: { content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: string, message: string } } } } } } } })

const doc: OpenApiLike = {
  info: {
    title: "Trailhead API",
    description: "Everything the Trailhead admin does goes through this API, and so can your agent. v1 is stable; breaking changes get v2. Send Authorization: Bearer th_live_... with an API key made in Settings. Rate limit: 120 requests a minute per key.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/passes": {
      get: {
        operationId: "passes.list", summary: "List passes, newest first. Filter by season, status, town or a timing preference.", tags: ["passes"], "x-scope": "read",
        parameters: [
          { name: "season", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: passProps.status },
          { name: "town", in: "query", schema: town },
          { name: "limit", in: "query", schema: { type: "integer", description: "Rows per page, 1 to 100." } },
          { name: "cursor", in: "query", schema: { type: "string", description: "The next_cursor of the previous page." } },
        ],
        responses: { "200": { content: { "application/json": { schema: { type: "object", required: ["data", "next_cursor"], properties: { data: { type: "array", items: { type: "object", required: Object.keys(passProps), properties: passProps } }, next_cursor: nullable(string) } } } } }, ...err("403") },
      },
      post: {
        operationId: "passes.create", summary: "Create the checkout's pending pass: the customer, the property, the consent and one visit for each visit still on sale this season.", tags: ["passes"], "x-scope": "write",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["customer", "property", "zones", "consent"], properties: { customer: { type: "object", required: ["firstName", "email"], properties: { firstName: string, email: { type: "string", format: "email" } } }, property: { type: "object", required: ["address", "town"], properties: { address: string, town } }, zones: { type: "integer" }, inspection: { type: "boolean" }, consent: { type: "object", required: ["termsAccepted"], properties: { termsAccepted: { type: "boolean" } } } } } } } },
        responses: { "201": { content: { "application/json": { schema: { type: "object", required: ["id"], properties: { id: string, number: string, price: { type: "integer", description: "Whole dollars." } } } } } } },
      },
    },
    "/passes/{id}/cancel": {
      post: {
        operationId: "passes.cancel", summary: "Cancel a pass and its visits that have not happened. Nothing further is charged. A customer cancels only their own.", tags: ["passes"], "x-scope": "write", "x-customer-self": true,
        parameters: [{ name: "id", in: "path", required: true, schema: string }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { reason: string } } } } },
        responses: { "200": { content: { "application/json": { schema: { type: "object", properties: { id: string, status: { type: "string", enum: ["cancelled"] }, cancelledVisits: { type: "integer" } } } } } } },
      },
    },
    "/visits/{id}/move": {
      post: {
        operationId: "visits.move", summary: "Put a visit on a truck and a day. Hard rules: the truck works that weekday, the day is inside the visit's window, the truck-day has capacity, and it stays in one area group.", tags: ["visits"], "x-scope": "write",
        parameters: [{ name: "id", in: "path", required: true, schema: string }],
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["truckId", "scheduledOn"], properties: { truckId: string, scheduledOn: { type: "string", description: "A Mountain-time calendar day, YYYY-MM-DD." }, startTime: string } } } } },
        responses: { "200": { content: { "application/json": { schema: { type: "object", properties: { id: string, status: string, scheduledOn: nullable(string) } } } } } },
      },
    },
    "/trucks/{id}": {
      delete: {
        operationId: "trucks.deactivate", summary: "Take a truck out of service. Its history stays; the scheduler stops using it.", tags: ["trucks"], "x-scope": "admin",
        parameters: [{ name: "id", in: "path", required: true, schema: string }],
        responses: { "200": { content: { "application/json": { schema: { type: "object", properties: { id: string, name: string, active: { type: "boolean" } } } } } } },
      },
    },
  },
}

const model = toDocsModel(doc)

const meta = {
  title: "Blocks/ApiDocs",
  component: ApiDocs,
  parameters: { layout: "fullscreen" },
  args: { model },
} satisfies Meta<typeof ApiDocs>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
