// @vitest-environment node
import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { PASS_IMAGE, passImageModel, renderPassImage } from "./pass-image"

const pass = (snapshot as AdminData).passes.find((p) => p.status === "active" && p.visits.length >= 2)!

describe("the pass image", () => {
  it("reads its words from the pass the way the PassCard does", () => {
    const model = passImageModel(pass)
    expect(model.firstName).toBe(pass.firstName)
    expect(model.number).toBe(pass.number)
    expect(model.cells.map((c) => c.label)).toEqual(pass.visits.map((v) => (v.kind === "turn-on" ? "Turn-on" : v.kind === "blowout" ? "Blowout" : "Inspection")))
    expect(model.cells.every((c) => c.value.length > 0)).toBe(true)
  })

  it("renders a 1280 by 800 PNG", async () => {
    const response = await renderPassImage(passImageModel(pass))
    expect(response.headers.get("content-type")).toBe("image/png")
    const png = Buffer.from(await response.arrayBuffer())
    expect(png.subarray(1, 4).toString()).toBe("PNG")
    expect(png.readUInt32BE(16)).toBe(PASS_IMAGE.width)
    expect(png.readUInt32BE(20)).toBe(PASS_IMAGE.height)
    expect(png.length).toBeGreaterThan(20_000)
    const { mkdirSync, writeFileSync } = await import("node:fs")
    mkdirSync(".local-data/wiring/messages", { recursive: true })
    writeFileSync(".local-data/wiring/messages/pass-image.png", png)
  }, 30_000)
})
