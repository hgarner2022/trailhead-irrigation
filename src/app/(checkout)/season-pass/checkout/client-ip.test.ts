import { describe, expect, it } from "vitest"
import { clientIpFrom } from "./client-ip"

describe("clientIpFrom", () => {
  it("takes the first forwarded address, then the real-ip header, else nothing", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1", "x-real-ip": "1.1.1.1" }))).toBe("203.0.113.9")
    expect(clientIpFrom(new Headers({ "x-real-ip": "1.1.1.1" }))).toBe("1.1.1.1")
    expect(clientIpFrom(new Headers())).toBeUndefined()
  })
})
