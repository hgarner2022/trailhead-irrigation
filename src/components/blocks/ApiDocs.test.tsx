import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { ApiDocs } from "./ApiDocs"
import type { ApiDocsModel } from "./api-docs-model"

const model: ApiDocsModel = {
  title: "Trailhead API",
  description: "v1 is stable.",
  baseUrl: "/api/v1",
  mcpUrl: "/api/mcp",
  resources: [
    {
      name: "passes",
      operations: [
        { id: "passes.list", method: "GET", path: "/passes", scope: "read", customerSelf: false, summary: "List passes.", status: "200", curl: 'curl "/api/v1/passes"', input: [{ name: "town", type: "Erie | Longmont", required: false }], output: [{ name: "data", type: "array of object", required: true }] },
        { id: "passes.cancel", method: "POST", path: "/passes/{id}/cancel", scope: "write", customerSelf: true, summary: "Cancel a pass.", status: "200", curl: "curl -X POST", input: [{ name: "id", type: "string", required: true, description: "The pass id." }], output: [] },
      ],
    },
    { name: "trucks", operations: [] },
  ],
}

describe("ApiDocs", () => {
  it("shows the base URL, the OpenAPI link and the MCP endpoint", () => {
    render(<ApiDocs model={model} />)
    expect(screen.getByRole("heading", { level: 1, name: "Trailhead API" })).toBeInTheDocument()
    expect(screen.getByText("/api/mcp")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "OpenAPI 3.1 JSON" })).toHaveAttribute("href", "/api/v1/openapi.json")
  })
  it("links every resource in the nav and groups operations under it", () => {
    render(<ApiDocs model={model} />)
    const nav = screen.getByRole("navigation", { name: "Resources" })
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#resource-passes", "#resource-trucks"])
    expect(screen.getByRole("heading", { level: 2, name: "passes" })).toBeInTheDocument()
  })
  it("renders each operation with method, path, scope, fields and curl", () => {
    render(<ApiDocs model={model} />)
    const ops = document.querySelectorAll('[data-slot="api-operation"]')
    expect(ops).toHaveLength(2)
    const cancel = within(ops[1] as HTMLElement)
    expect(cancel.getByText("POST")).toBeInTheDocument()
    expect(cancel.getByText("/passes/{id}/cancel")).toBeInTheDocument()
    expect(cancel.getByText("write scope")).toBeInTheDocument()
    expect(cancel.getByText("customers: own records")).toBeInTheDocument()
    expect(cancel.getByText("The pass id.")).toBeInTheDocument()
    expect(cancel.getByText("Nothing.")).toBeInTheDocument()
    expect(cancel.getByLabelText("curl example for passes.cancel")).toHaveTextContent("curl -X POST")
    const list = within(ops[0] as HTMLElement)
    expect(list.getByText("Erie | Longmont")).toBeInTheDocument()
    expect(list.queryByText("customers: own records")).not.toBeInTheDocument()
  })
})
