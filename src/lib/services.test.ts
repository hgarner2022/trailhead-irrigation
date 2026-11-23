import { describe, expect, it } from "vitest"
import { SERVICES, SERVICE_LIST, serviceCost, serviceFor } from "./services"
import { MAX_ZONES, MIN_ZONES, SEASON_PASS_VISITS, visitPrice } from "./season-pass"
import { RACHIO_PRICING } from "./rachio-data"

describe("SERVICES", () => {
  it("prices the blowout from the site's pass prices", () => {
    expect(SERVICES.blowout.price).toBe(visitPrice(SEASON_PASS_VISITS[2], 6))
  })

  it("costs every zone count exactly as the site does", () => {
    for (let zones = MIN_ZONES; zones <= MAX_ZONES; zones++) {
      expect(serviceCost(serviceFor("turn-on", zones)!, zones)).toBe(visitPrice(SEASON_PASS_VISITS[0], zones))
      expect(serviceCost(serviceFor("inspection", zones)!, zones)).toBe(visitPrice(SEASON_PASS_VISITS[1], zones))
      expect(serviceCost(SERVICES.blowout, zones)).toBe(visitPrice(SEASON_PASS_VISITS[2], zones))
    }
  })

  it("picks the slot length by band", () => {
    expect(serviceFor("turn-on", 8)!.slotMinutes).toBe(60)
    expect(serviceFor("turn-on", 12)!.slotMinutes).toBe(90)
    expect(serviceFor("turn-on", 13)!.slotMinutes).toBe(120)
    expect(SERVICES.blowout.slotMinutes).toBe(30)
    expect(SERVICES.repair.slotMinutes).toBe(120)
    expect(SERVICES.consult.slotMinutes).toBe(30)
  })

  it("takes the Rachio and repair prices from the site", () => {
    expect(SERVICES["rachio-install-8"].price).toBe(RACHIO_PRICING.controller8Zone)
    expect(SERVICES["rachio-install-16"].price).toBe(RACHIO_PRICING.controller16Zone)
    expect(SERVICES.repair.price).toBe(145)
  })

  it("has eleven bookable services, installs are quote-only, the consultation is off online and water efficiency and drip is $145", () => {
    expect(SERVICE_LIST.filter((s) => s.bookable)).toHaveLength(11)
    expect(SERVICES.install.quoteOnly).toBe(true)
    expect(SERVICES.install.bookable).toBe(false)
    expect(serviceCost(SERVICES.install, 8)).toBeUndefined()
    expect(SERVICES.consult.bookable).toBe(false)
    expect(SERVICES["water-efficiency"]!.price).toBe(145)
    expect(SERVICES["water-efficiency"]!.bookable).toBe(true)
  })

  it("has unique keys", () => {
    expect(new Set(SERVICE_LIST.map((s) => s.key)).size).toBe(SERVICE_LIST.length)
  })
})
