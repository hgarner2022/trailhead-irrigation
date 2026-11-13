import { describe, expect, it } from "vitest"
import { toApiScopes, toScreenScopes } from "./key-scopes"

describe("key scopes", () => {
  it("folds the three write words into one write scope", () => {
    expect(toApiScopes(["read", "write-passes", "send-messages"])).toEqual(["read", "write"])
    expect(toApiScopes(["admin"])).toEqual(["admin"])
  })
  it("spells the API's scopes back in the screen's words", () => {
    expect(toScreenScopes(["read", "write"])).toEqual(["read", "write-passes", "write-schedule", "send-messages"])
    expect(toScreenScopes(["read"])).toEqual(["read"])
  })
})
