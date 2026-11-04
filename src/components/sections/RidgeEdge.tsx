import { cn } from "@/lib/utils"

// A low, jagged mountain ridge between two sections, with a small sun behind
// it on the right. Like the torn edges on sunlightsprinkler.com: one thin
// line, kept quiet. Used once, at the top of the closing strip.
//
// A block the colour of the section BELOW (`to`) is masked with a repeating
// ridge tile, so the peaks rise into whatever sits above. The block pulls
// itself up over the previous section's bottom padding, so place it as a
// sibling between the two sections, never as the first child of the section
// below (inside, the negative margin collapses through the section's top and
// the section's background paints over the ridge).

const TILE_W = 480
const TILE_H = 48

// Peak heights, left to right. First and last share a height so the tile
// repeats without a seam.
const RIDGE: [number, number][] = [
  [0, 30], [14, 20], [24, 28], [36, 16], [48, 26], [58, 22], [70, 32], [84, 12],
  [96, 24], [108, 18], [120, 30], [134, 22], [146, 8], [158, 20], [170, 26],
  [184, 14], [196, 24], [206, 20], [218, 32], [232, 18], [244, 26], [256, 10],
  [270, 22], [282, 28], [294, 16], [306, 24], [318, 20], [330, 30], [344, 14],
  [356, 22], [368, 6], [382, 18], [394, 26], [406, 20], [418, 30], [432, 16],
  [444, 24], [456, 20], [468, 28], [480, 30],
]

const TILE_SVG =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${TILE_W} ${TILE_H}'>` +
  `<path d='M${RIDGE.map(([x, y]) => `${x},${y}`).join("L")}L${TILE_W},${TILE_H}L0,${TILE_H}Z'/>` +
  `</svg>`

const MASK = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

const FILLS = {
  navy: "bg-navy",
  charcoal: "bg-charcoal",
  cream: "bg-cream",
  background: "bg-background",
} as const

const RAYS = [-150, -120, -90, -60, -30].map((deg) => {
  const a = (deg * Math.PI) / 180
  return {
    x1: (50 + 36 * Math.cos(a)).toFixed(1),
    y1: (62 + 36 * Math.sin(a)).toFixed(1),
    x2: (50 + 46 * Math.cos(a)).toFixed(1),
    y2: (62 + 46 * Math.sin(a)).toFixed(1),
  }
})

export function RidgeEdge({ to, sun = true, className }: { to: keyof typeof FILLS; sun?: boolean; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative z-10 w-full h-7 md:h-10 -mt-7 md:-mt-10 pointer-events-none select-none", className)}
    >
      {sun && (
        <svg viewBox="0 0 100 100" className="absolute bottom-0 right-[8%] h-[200%] w-auto text-primary" fill="none">
          <circle cx="50" cy="62" r="28" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
            {RAYS.map((r) => (
              <line key={r.x1} {...r} />
            ))}
          </g>
        </svg>
      )}
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
