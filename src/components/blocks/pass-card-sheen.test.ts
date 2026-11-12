import { describe, it, expect } from "vitest"
import { SHEEN_REST, applySheen, attachPointer, pointerSheen, reducedMotion, tiltSheen } from "./pass-card-sheen"

const box = { left: 100, top: 50, width: 640, height: 400 }

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

describe("applySheen and attachPointer", () => {
  it("writes the two custom properties on the element", () => {
    const el = document.createElement("div")
    applySheen(el, { x: 0.25, y: 1 })
    expect(el.style.getPropertyValue("--sheen-x")).toBe("0.250")
    expect(el.style.getPropertyValue("--sheen-y")).toBe("1.000")
  })

  it("tracks the pointer, rests on leave and cleans up", () => {
    const el = document.createElement("div")
    el.getBoundingClientRect = () => ({ ...box, right: 740, bottom: 450, x: 100, y: 50, toJSON: () => ({}) })
    const stop = attachPointer(el)
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 740, clientY: 50 }))
    expect(el.hasAttribute("data-sheen-tracking")).toBe(true)
    expect(el.style.getPropertyValue("--sheen-x")).toBe("1.000")
    expect(el.style.getPropertyValue("--sheen-y")).toBe("0.000")
    el.dispatchEvent(new MouseEvent("pointerleave"))
    expect(el.hasAttribute("data-sheen-tracking")).toBe(false)
    expect(el.style.getPropertyValue("--sheen-x")).toBe("0.500")
    stop()
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 100, clientY: 50 }))
    expect(el.style.getPropertyValue("--sheen-x")).toBe("0.500")
    expect(el.hasAttribute("data-sheen-tracking")).toBe(false)
  })

  it("treats a browser without matchMedia as not reduced", () => {
    expect(reducedMotion()).toBe(false)
  })
})
