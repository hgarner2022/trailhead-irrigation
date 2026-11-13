import { afterEach, describe, expect, it, vi } from "vitest"
import { bookingEnabled, checkoutEnabled } from "./flags"

afterEach(() => vi.unstubAllEnvs())

describe("checkoutEnabled", () => {
  it("is off when the variable is unset", () => {
    vi.stubEnv("SEASON_PASS_CHECKOUT", "")
    expect(checkoutEnabled()).toBe(false)
  })
  it('is off for "true"', () => {
    vi.stubEnv("SEASON_PASS_CHECKOUT", "true")
    expect(checkoutEnabled()).toBe(false)
  })
  it('is on only for "on", read at call time', () => {
    vi.stubEnv("SEASON_PASS_CHECKOUT", "off")
    expect(checkoutEnabled()).toBe(false)
    vi.stubEnv("SEASON_PASS_CHECKOUT", "on")
    expect(checkoutEnabled()).toBe(true)
  })
})

describe("bookingEnabled", () => {
  it("is off when unset or \"true\"", () => {
    vi.stubEnv("APP_BOOKING", "")
    expect(bookingEnabled()).toBe(false)
    vi.stubEnv("APP_BOOKING", "true")
    expect(bookingEnabled()).toBe(false)
  })
  it('is on only for "on"', () => {
    vi.stubEnv("APP_BOOKING", "on")
    expect(bookingEnabled()).toBe(true)
  })
})
