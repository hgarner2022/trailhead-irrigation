import { describe, expect, it } from "vitest"
import { stripSecretParams } from "./analytics-url"

describe("stripSecretParams", () => {
  it("takes the token out of a pay link and keeps the rest", () => {
    expect(stripSecretParams("https://www.trailheadirrigation.com/pay/inv_1?token=abc.def")).toBe("https://www.trailheadirrigation.com/pay/inv_1")
    expect(stripSecretParams("https://www.trailheadirrigation.com/pay/inv_1?utm_source=text&token=abc.def&utm_medium=sms#top")).toBe("https://www.trailheadirrigation.com/pay/inv_1?utm_source=text&utm_medium=sms#top")
    expect(stripSecretParams("https://www.trailheadirrigation.com/season-pass/checkout?renew=p1&token=zzz")).toBe("https://www.trailheadirrigation.com/season-pass/checkout?renew=p1")
  })

  it("leaves an address with no token alone", () => {
    expect(stripSecretParams("https://www.trailheadirrigation.com/pricing?utm_source=google")).toBe("https://www.trailheadirrigation.com/pricing?utm_source=google")
    expect(stripSecretParams("https://www.trailheadirrigation.com/")).toBe("https://www.trailheadirrigation.com/")
  })

  it("keeps only what comes before the question mark when the address does not parse", () => {
    expect(stripSecretParams("not a url?token=abc")).toBe("not a url")
  })

  it("runs the same from its own source, the way the page's inline script runs it", () => {
    const inline = new Function(`return (${stripSecretParams.toString()})("https://x.test/pay/1?token=t&a=1")`)
    expect(inline()).toBe("https://x.test/pay/1?a=1")
  })
})
