import { it, expect } from "vitest"
import snapshot from "./snapshot.json"
import type { AdminData } from "../types"

/**
 * A tsc-level guard: the JSON's inferred type must assign to AdminData.
 * TypeScript widens JSON string literals (town "Erie" becomes string), so the
 * assignment below only compiles with the cast; the runtime test in
 * snapshot.test.ts is the real guard for the literal unions.
 */
function shape(): AdminData {
  const d: AdminData = snapshot as AdminData
  return d
}

it("the snapshot assigns to AdminData", () => {
  expect(shape().organizationId).toBe("org_trailhead")
})
