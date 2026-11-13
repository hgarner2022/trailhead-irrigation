import { beforeEach, describe, expect, it, vi } from "vitest"

const { toPng } = vi.hoisted(() => ({ toPng: vi.fn(async () => "data:image/png;base64,AAAA") }))
vi.mock("html-to-image", () => ({ toPng }))

import { passImageFilename, savePassImage } from "./pass-card-image"

beforeEach(() => {
  toPng.mockClear()
  document.body.innerHTML = ""
})

describe("savePassImage", () => {
  it("names the file after the pass number", () => expect(passImageFilename({ number: "TH-2027-0007" })).toBe("TH-2027-0007.png"))
  it("renders the card at twice the size and downloads it under that name", async () => {
    document.body.innerHTML = '<div data-slot="pass-card">card</div>'
    const clicks: { href: string; download: string }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({ href: this.href, download: this.download })
    })
    await expect(savePassImage({ number: "TH-2027-0007" })).resolves.toBe(true)
    expect(toPng).toHaveBeenCalledWith(document.querySelector('[data-slot="pass-card"]'), { pixelRatio: 2, cacheBust: true })
    expect(clicks).toEqual([{ href: "data:image/png;base64,AAAA", download: "TH-2027-0007.png" }])
  })
  it("does nothing when no card is on screen", async () => {
    await expect(savePassImage({ number: "TH-2027-0007" })).resolves.toBe(false)
    expect(toPng).not.toHaveBeenCalled()
  })
})
