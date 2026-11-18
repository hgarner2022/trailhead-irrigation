// @vitest-environment node
import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"
import { PropertyOut } from "@/api/v1/customers/schemas"
import { YardOut } from "@/api/v1/visits/schemas"
import type { Yard } from "./types"
import { yardShape, type YardWire } from "./yard"

describe("the one yard shape", () => {
  it("has the same keys on the screens' Yard, the API's YardOut and the shared field list (a type test and a runtime one)", () => {
    expectTypeOf<keyof Yard>().toEqualTypeOf<keyof z.infer<typeof YardOut>>()
    expectTypeOf<keyof Yard>().toEqualTypeOf<keyof YardWire>()
    expectTypeOf<keyof Yard>().toEqualTypeOf<keyof typeof yardShape>()
    const keys = Object.keys(yardShape).sort()
    expect(Object.keys(YardOut.shape).sort()).toEqual(keys)
    expect(keys).toEqual(["accessNote", "backflowLocation", "contactName", "contactPhone", "controller", "gateCode", "mustBeHome", "notes", "zones"])
  })
  it("is what a property carries too", () => {
    for (const key of Object.keys(yardShape)) expect(Object.keys(PropertyOut.shape)).toContain(key)
  })
})
