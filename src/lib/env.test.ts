import { afterEach, describe, expect, it, vi } from "vitest"
import { readEnv, readOptionalEnv } from "./env"

afterEach(() => vi.unstubAllEnvs())

describe("readEnv", () => {
  it("returns the named values", () => {
    vi.stubEnv("A_NAME", "one")
    vi.stubEnv("B_NAME", "two")
    expect(readEnv(["A_NAME", "B_NAME"])).toEqual({ A_NAME: "one", B_NAME: "two" })
  })
  it("throws 'X is not set' for a missing or empty name", () => {
    vi.stubEnv("EMPTY_NAME", "")
    expect(() => readEnv(["MISSING_NAME_XYZ"])).toThrow("MISSING_NAME_XYZ is not set")
    expect(() => readEnv(["EMPTY_NAME"])).toThrow("EMPTY_NAME is not set")
  })
  it("reads an optional name as undefined when unset", () => {
    expect(readOptionalEnv("OPTIONAL_NAME_XYZ")).toBeUndefined()
  })
})
