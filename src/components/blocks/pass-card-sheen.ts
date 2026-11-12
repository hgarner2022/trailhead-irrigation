/**
 * The listener maths behind PassCard's holographic sheen, kept out of the
 * component so the render stays readable. The sheen is driven by two custom
 * properties on the card, `--sheen-x` and `--sheen-y`, each 0 to 1, with 0.5
 * being the rest position. On a laptop the pointer sets them; on a phone the
 * orientation sensor does. Nothing here touches React.
 */

export interface SheenPoint {
  x: number
  y: number
}

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export const SHEEN_REST: SheenPoint = { x: 0.5, y: 0.5 }

/** Side tilt (gamma) is read across plus or minus this many degrees. */
export const TILT_SIDE = 30
/** Front to back tilt (beta) is read from flat-ish (30) to upright (90). */
export const TILT_BACK = 30
export const TILT_UP = 90

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Where the pointer sits inside the card as fractions, clamped to the card. */
export function pointerSheen(clientX: number, clientY: number, box: Box): SheenPoint {
  if (box.width <= 0 || box.height <= 0) return SHEEN_REST
  return {
    x: clamp((clientX - box.left) / box.width, 0, 1),
    y: clamp((clientY - box.top) / box.height, 0, 1),
  }
}

/** A phone's tilt as fractions; null when the sensor gives no reading. */
export function tiltSheen(gamma: number | null | undefined, beta: number | null | undefined): SheenPoint | null {
  if (typeof gamma !== "number" || typeof beta !== "number") return null
  return {
    x: (clamp(gamma, -TILT_SIDE, TILT_SIDE) + TILT_SIDE) / (2 * TILT_SIDE),
    y: (clamp(beta, TILT_BACK, TILT_UP) - TILT_BACK) / (TILT_UP - TILT_BACK),
  }
}

export function applySheen(el: HTMLElement, point: SheenPoint) {
  el.style.setProperty("--sheen-x", point.x.toFixed(3))
  el.style.setProperty("--sheen-y", point.y.toFixed(3))
}

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Follows the pointer while it is over the card and rests the sheen when it
 * leaves. While following, the card carries `data-sheen-tracking` so the layer
 * can drop its transition and sit under the pointer; the attribute goes before
 * the rest values are written, in the same task, so leaving eases back under
 * the layer's own transition. Returns the cleanup.
 */
export function attachPointer(el: HTMLElement): () => void {
  const move = (e: PointerEvent) => {
    el.setAttribute("data-sheen-tracking", "")
    applySheen(el, pointerSheen(e.clientX, e.clientY, el.getBoundingClientRect()))
  }
  const leave = () => {
    el.removeAttribute("data-sheen-tracking")
    applySheen(el, SHEEN_REST)
  }
  el.addEventListener("pointermove", move)
  el.addEventListener("pointerleave", leave)
  return () => {
    el.removeAttribute("data-sheen-tracking")
    el.removeEventListener("pointermove", move)
    el.removeEventListener("pointerleave", leave)
  }
}

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> }

const orientation = (): OrientationCtor | undefined =>
  typeof DeviceOrientationEvent === "undefined" ? undefined : (DeviceOrientationEvent as OrientationCtor)

/**
 * iOS gates the sensor behind a permission that must be asked from a tap.
 * Desktop Chromium exposes the same function with no sensor behind it, so a
 * touch screen is required as well before the card offers to ask.
 */
export const canRequestTilt = () =>
  typeof orientation()?.requestPermission === "function" && typeof navigator !== "undefined" && navigator.maxTouchPoints > 0

export async function requestTilt(): Promise<boolean> {
  const ask = orientation()?.requestPermission
  if (!ask) return false
  try {
    return (await ask()) === "granted"
  } catch {
    return false
  }
}

/** Maps the phone's tilt onto the sheen. Returns the cleanup. */
export function attachTilt(el: HTMLElement): () => void {
  if (!orientation()) return () => {}
  const handle = (e: DeviceOrientationEvent) => {
    const point = tiltSheen(e.gamma, e.beta)
    if (point) applySheen(el, point)
  }
  window.addEventListener("deviceorientation", handle)
  return () => window.removeEventListener("deviceorientation", handle)
}
