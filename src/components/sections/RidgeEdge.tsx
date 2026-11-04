import { cn } from "@/lib/utils"

// Mountains along the top of the closing strip, with the sun setting into a
// notch between two peaks. Plain triangular peaks, one navy silhouette.
//
// The mountains are a repeating tile used as a CSS mask over a block the
// colour of the section below (`to`). The tile scales with the block height
// (`mask-size: auto 100%`) and is centred, so its geometry is predictable:
// a point X tile-units right of the tile's centre lands at
// `50% + (X / TILE_H) * blockHeight` in the viewport. The sun is positioned
// with that rule so it always sits in the same notch, at any screen width,
// and the mask (painted after it) hides whatever part of it is below the
// slopes. Block heights are 4rem / 6rem (h-16 / md:h-24).
//
// The block pulls itself up over the previous section's bottom padding, so
// place it as a sibling between the two sections, never as the first child
// of the section below (inside, the negative margin collapses through the
// section's top and the section's background paints over the mountains).

const TILE_W = 1200
const TILE_H = 120

// Peaks and valleys, left to right. First and last share a height so the
// tile repeats without a seam. The notch at x=830 holds the sun.
const PEAKS: [number, number][] = [
  [0, 78], [90, 44], [170, 70], [250, 30], [330, 66], [400, 52], [470, 74], [560, 36], [640, 62],
  [744, 18], [830, 64], [900, 48], [960, 70], [1050, 22], [1130, 60], [1200, 78],
]

const SVG =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${TILE_W} ${TILE_H}'>` +
  `<path d='M${PEAKS.map(([x, y]) => `${x},${y}`).join("L")}L${TILE_W},${TILE_H}L0,${TILE_H}Z'/>` +
  `</svg>`

const MASK = `url("data:image/svg+xml,${encodeURIComponent(SVG)}")`

// Sun centre: the notch at tile (830, 64), nudged up so the slopes cut its
// lower half. 230 units right of the tile centre = 1.92 block heights;
// the SVG is translated so its centre lands on SUN_BOTTOM.
const SUN_LEFT = "left-[calc(50%+7.7rem)] md:left-[calc(50%+11.5rem)]"
const SUN_BOTTOM = "bottom-[52%]"

const SUN_R = 38
const RAYS = [-165, -140, -115, -90, -65, -40, -15].map((deg) => {
  const a = (deg * Math.PI) / 180
  return {
    x1: (60 + (SUN_R + 7) * Math.cos(a)).toFixed(1),
    y1: (60 + (SUN_R + 7) * Math.sin(a)).toFixed(1),
    x2: (60 + (SUN_R + 19) * Math.cos(a)).toFixed(1),
    y2: (60 + (SUN_R + 19) * Math.sin(a)).toFixed(1),
  }
})

const FILLS = {
  navy: "bg-navy",
  charcoal: "bg-charcoal",
  cream: "bg-cream",
  background: "bg-background",
} as const

export function RidgeEdge({ to, className }: { to: keyof typeof FILLS; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative z-10 w-full h-16 md:h-24 -mt-16 md:-mt-24 pointer-events-none select-none", className)}
    >
      <div className="absolute inset-0 overflow-hidden">
        <svg
          viewBox="0 0 120 120"
          className={cn("absolute h-full w-auto -translate-x-1/2 translate-y-1/2 text-primary", SUN_LEFT, SUN_BOTTOM)}
          fill="none"
        >
          <circle cx="60" cy="60" r={SUN_R} fill="currentColor" />
          <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
            {RAYS.map((r) => (
              <line key={r.x1} {...r} />
            ))}
          </g>
        </svg>
      </div>
      <div
        className={cn("absolute inset-0", FILLS[to])}
        style={{
          maskImage: MASK,
          WebkitMaskImage: MASK,
          maskSize: "auto 100%",
          WebkitMaskSize: "auto 100%",
          maskRepeat: "repeat-x",
          WebkitMaskRepeat: "repeat-x",
          maskPosition: "center bottom",
          WebkitMaskPosition: "center bottom",
        }}
      />
    </div>
  )
}
