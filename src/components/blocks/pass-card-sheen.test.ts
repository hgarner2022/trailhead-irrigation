import { describe, it, expect, vi, afterEach } from "vitest"
import {
  SHEEN_REST,
  applySheen,
  attachPointer,
  attachTilt,
  frameWriter,
  pointerSheen,
  reducedMotion,
  requestTilt,
  tiltSheen,
} from "./pass-card-sheen"

const box = { left: 100, top: 50, width: 640, height: 400 }
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const sheen = (el: HTMLElement) => [el.style.getPropertyValue("--sheen-x"), el.style.getPropertyValue("--sheen-y")]

/** A stand-in for iOS's gated DeviceOrientationEvent. */
function stubOrientation(answer?: "granted" | "denied" | Error) {
  const requestPermission = answer === undefined ? undefined : answer instanceof Error ? vi.fn().mockRejectedValue(answer) : vi.fn().mockResolvedValue(answer)
  class FakeOrientation extends Event {
    static requestPermission = requestPermission
    gamma: number | null = null
    beta: number | null = null
  }
  vi.stubGlobal("DeviceOrientationEvent", FakeOrientation)
  return { requestPermission, FakeOrientation }
}

afterEach(() => vi.unstubAllGlobals())

describe("pointerSheen", () => {
  it("maps the pointer to a fraction of the card", () => {
    expect(pointerSheen(100, 50, box)).toEqual({ x: 0, y: 0 })
    expect(pointerSheen(420, 250, box)).toEqual({ x: 0.5, y: 0.5 })
    expect(pointerSheen(740, 450, box)).toEqual({ x: 1, y: 1 })
  })

  it("clamps a pointer outside the card", () => {
    expect(pointerSheen(0, 0, box)).toEqual({ x: 0, y: 0 })
    expect(pointerSheen(2000, 2000, box)).toEqual({ x: 1, y: 1 })
  })

  it("rests when the card has no size yet", () => {
    expect(pointerSheen(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual(SHEEN_REST)
  })
})

describe("tiltSheen", () => {
  it("reads a phone held upright and level as the centre", () => {
    expect(tiltSheen(0, 60)).toEqual({ x: 0.5, y: 0.5 })
  })

  it("clamps side tilt to thirty degrees either way", () => {
    expect(tiltSheen(-30, 60)?.x).toBe(0)
    expect(tiltSheen(-80, 60)?.x).toBe(0)
    expect(tiltSheen(30, 60)?.x).toBe(1)
    expect(tiltSheen(15, 60)?.x).toBe(0.75)
  })

  it("clamps front to back tilt between thirty and ninety degrees", () => {
    expect(tiltSheen(0, 0)?.y).toBe(0)
    expect(tiltSheen(0, 30)?.y).toBe(0)
    expect(tiltSheen(0, 90)?.y).toBe(1)
    expect(tiltSheen(0, 120)?.y).toBe(1)
  })

  it("gives nothing when the sensor has no reading", () => {
    expect(tiltSheen(null, null)).toBeNull()
    expect(tiltSheen(undefined, 60)).toBeNull()
  })
})

describe("applySheen and frameWriter", () => {
  it("writes the two custom properties on the element", () => {
    const el = document.createElement("div")
    applySheen(el, { x: 0.25, y: 1 })
    expect(sheen(el)).toEqual(["0.250", "1.000"])
  })

  it("writes once per frame with the last point queued", async () => {
    const el = document.createElement("div")
    const raf = vi.spyOn(window, "requestAnimationFrame")
    const writer = frameWriter(el)
    writer.write({ x: 0.1, y: 0.1 })
    writer.write({ x: 0.2, y: 0.2 })
    writer.write({ x: 0.9, y: 0.3 })
    expect(raf).toHaveBeenCalledTimes(1)
    expect(sheen(el)).toEqual(["", ""])
    await frame()
    expect(sheen(el)).toEqual(["0.900", "0.300"])
  })

  it("drops a queued point when cancelled", async () => {
    const el = document.createElement("div")
    const writer = frameWriter(el)
    writer.write({ x: 0.9, y: 0.9 })
    writer.cancel()
    await frame()
    expect(sheen(el)).toEqual(["", ""])
  })
})

describe("attachPointer", () => {
  const card = () => {
    const el = document.createElement("div")
    el.getBoundingClientRect = vi.fn(() => ({ ...box, right: 740, bottom: 450, x: 100, y: 50, toJSON: () => ({}) }))
    return el
  }

  it("tracks the pointer, rests on leave and cleans up", async () => {
    const el = card()
    const stop = attachPointer(el)
    el.dispatchEvent(new MouseEvent("pointerenter"))
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 740, clientY: 50 }))
    expect(el.hasAttribute("data-sheen-tracking")).toBe(true)
    await frame()
    expect(sheen(el)).toEqual(["1.000", "0.000"])
    el.dispatchEvent(new MouseEvent("pointerleave"))
    expect(el.hasAttribute("data-sheen-tracking")).toBe(false)
    await frame()
    expect(sheen(el)).toEqual(["0.500", "0.500"])
    stop()
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 100, clientY: 50 }))
    await frame()
    expect(sheen(el)).toEqual(["0.500", "0.500"])
    expect(el.hasAttribute("data-sheen-tracking")).toBe(false)
  })

  it("measures the card on enter and resize, not on every move", () => {
    const el = card()
    const stop = attachPointer(el)
    el.dispatchEvent(new MouseEvent("pointerenter"))
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 420, clientY: 250 }))
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 430, clientY: 260 }))
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 440, clientY: 270 }))
    expect(el.getBoundingClientRect).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event("resize"))
    expect(el.getBoundingClientRect).toHaveBeenCalledTimes(2)
    stop()
    window.dispatchEvent(new Event("resize"))
    expect(el.getBoundingClientRect).toHaveBeenCalledTimes(2)
  })

  it("measures on the first move when the pointer was already over the card", () => {
    const el = card()
    attachPointer(el)
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 420, clientY: 250 }))
    expect(el.getBoundingClientRect).toHaveBeenCalledTimes(1)
  })
})

describe("attachTilt and requestTilt", () => {
  it("does nothing without the sensor", () => {
    vi.stubGlobal("DeviceOrientationEvent", undefined)
    const add = vi.spyOn(window, "addEventListener")
    attachTilt(document.createElement("div"))()
    expect(add.mock.calls.map((c) => c[0])).not.toContain("deviceorientation")
  })

  it("maps orientation readings onto the sheen and cleans up", async () => {
    const { FakeOrientation } = stubOrientation()
    const el = document.createElement("div")
    const stop = attachTilt(el)
    window.dispatchEvent(Object.assign(new FakeOrientation("deviceorientation"), { gamma: 15, beta: 60 }))
    await frame()
    expect(sheen(el)).toEqual(["0.750", "0.500"])
    window.dispatchEvent(Object.assign(new FakeOrientation("deviceorientation"), { gamma: null, beta: null }))
    await frame()
    expect(sheen(el)).toEqual(["0.750", "0.500"])
    stop()
    window.dispatchEvent(Object.assign(new FakeOrientation("deviceorientation"), { gamma: -30, beta: 90 }))
    await frame()
    expect(sheen(el)).toEqual(["0.750", "0.500"])
  })

  it("answers false when there is nothing to ask", async () => {
    expect(await requestTilt()).toBe(false)
    stubOrientation()
    expect(await requestTilt()).toBe(false)
  })

  it("reports the answer and treats a thrown prompt as denied", async () => {
    expect(await requestTilt()).toBe(false)
    const granted = stubOrientation("granted")
    expect(await requestTilt()).toBe(true)
    expect(granted.requestPermission).toHaveBeenCalledTimes(1)
    stubOrientation("denied")
    expect(await requestTilt()).toBe(false)
    stubOrientation(new Error("no gesture"))
    expect(await requestTilt()).toBe(false)
  })

  it("treats a browser without matchMedia as not reduced", () => {
    expect(reducedMotion()).toBe(false)
  })
})
