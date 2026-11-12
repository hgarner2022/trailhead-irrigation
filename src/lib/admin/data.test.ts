import { it, expect, vi, afterEach } from "vitest"
import { getAdminData } from "./data"

afterEach(() => vi.unstubAllEnvs())

it("fixtures resolves to the anonymised snapshot", async () => {
  const d = await getAdminData("fixtures")
  expect(d.organizationId).toBe("org_trailhead")
  expect(d.passes).toHaveLength(12)
})

it("live rejects until the wiring plan lands", async () => {
  await expect(getAdminData("live")).rejects.toThrow(
    "live admin data is not wired yet; set ADMIN_DATA_SOURCE=fixtures",
  )
})

it("defaults to fixtures when ADMIN_DATA_SOURCE is unset", async () => {
  vi.stubEnv("ADMIN_DATA_SOURCE", undefined)
  const d = await getAdminData()
  expect(d.organizationId).toBe("org_trailhead")
})

it("reads ADMIN_DATA_SOURCE when no argument is given", async () => {
  vi.stubEnv("ADMIN_DATA_SOURCE", "live")
  await expect(getAdminData()).rejects.toThrow(/not wired yet/)
})

it("rejects an ADMIN_DATA_SOURCE it does not know", async () => {
  vi.stubEnv("ADMIN_DATA_SOURCE", "jobber")
  await expect(getAdminData()).rejects.toThrow('unknown ADMIN_DATA_SOURCE "jobber"')
})
