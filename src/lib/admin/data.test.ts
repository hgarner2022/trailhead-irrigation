import { it, expect, vi, afterEach } from "vitest"
import { getAdminData } from "./data"
import { loadLiveAdminData } from "./live"

vi.mock("./live", () => ({ loadLiveAdminData: vi.fn(async () => ({ organizationId: "org_live" })) }))

afterEach(() => vi.unstubAllEnvs())

it("fixtures resolves to the anonymised snapshot", async () => {
  const d = await getAdminData("fixtures")
  expect(d.organizationId).toBe("org_trailhead")
  expect(d.passes).toHaveLength(13)
})

it("live reads the database through the live loader", async () => {
  expect((await getAdminData("live")).organizationId).toBe("org_live")
  expect(loadLiveAdminData).toHaveBeenCalled()
})

it("defaults to fixtures when ADMIN_DATA_SOURCE is unset", async () => {
  vi.stubEnv("ADMIN_DATA_SOURCE", undefined)
  const d = await getAdminData()
  expect(d.organizationId).toBe("org_trailhead")
})

it("treats an empty ADMIN_DATA_SOURCE as unset", async () => {
  vi.stubEnv("ADMIN_DATA_SOURCE", "")
  const d = await getAdminData()
  expect(d.organizationId).toBe("org_trailhead")
})

it("reads ADMIN_DATA_SOURCE when no argument is given", async () => {
  vi.stubEnv("ADMIN_DATA_SOURCE", "live")
  expect((await getAdminData()).organizationId).toBe("org_live")
})

it("rejects an ADMIN_DATA_SOURCE it does not know", async () => {
  vi.stubEnv("ADMIN_DATA_SOURCE", "jobber")
  await expect(getAdminData()).rejects.toThrow('unknown ADMIN_DATA_SOURCE "jobber"')
})

it("is server-only, as is the live loader", async () => {
  const { readFileSync } = await import("node:fs")
  for (const file of ["data.ts", "live.ts"]) {
    expect(readFileSync(new URL(file, import.meta.url), "utf8")).toMatch(/^import "server-only"/)
  }
})
