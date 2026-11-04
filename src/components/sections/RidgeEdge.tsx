import { cn } from "@/lib/utils"

// Mountains along the top of the closing strip, with the sun setting into a
// saddle. One navy silhouette, four broad peaks across a laptop screen,
// long slopes, a dominant summit off centre. Kept calm on purpose: a
// busier ridge made Hannah dizzy (Nov 4 2026).
//
// The ridge is a repeating tile used as a CSS mask over a block of the
// section's colour. The tile scales with the block height
// (`mask-size: auto 100%`) and is anchored at `--ridge-x`, so geometry is
// predictable: a point X tile-units right of the tile centre lands at
// `--ridge-x + (X / TILE_H) * --ridge-h`. The sun is placed with that rule
// so it always sits in the same saddle. On phones the tile slides left so
// the saddle lands near the right edge of the screen.
//
// The block pulls itself up over the previous section's bottom padding, so
// place it as a sibling between the two sections, never as the first child
// of the section below (inside, the negative margin collapses through the
// section's top and the section's background paints over the mountains).

const TILE_W = 1600
const TILE_H = 120

// First and last share a height so the tile repeats seamlessly. The
// shallow saddle at x=1300 holds the sun.
const RIDGE: [number, number][] = [
  [0, 84], [200, 62], [320, 70], [480, 40], [560, 50], [640, 46], [820, 78],
  [1000, 34], [1060, 42], [1120, 38], [1300, 74], [1420, 60], [1520, 66], [1600, 84],
]

function mask(points: [number, number][]) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${TILE_W} ${TILE_H}'>` +
    `<path d='M${points.map(([x, y]) => `${x},${y}`).join("L")}L${TILE_W},${TILE_H}L0,${TILE_H}Z'/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const RIDGE_MASK = mask(RIDGE)

function maskStyle(image: string): React.CSSProperties {
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: "auto 100%",
    WebkitMaskSize: "auto 100%",
    maskRepeat: "repeat-x",
    WebkitMaskRepeat: "repeat-x",
    maskPosition: "var(--ridge-x) bottom",
    WebkitMaskPosition: "var(--ridge-x) bottom",
  }
}

// The sun: centre at tile x=1300, which is 500 units right of the tile
// centre, i.e. 500/120 block heights. Its centre sits 48% up the block, so
// the saddle's slopes hide the lower part.
const SUN_LEFT = `calc(var(--ridge-x) + ${500 / TILE_H} * var(--ridge-h))`
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
} as const

export function RidgeEdge({ to, className }: { to: keyof typeof FILLS; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative z-10 w-full pointer-events-none select-none",
        "[--ridge-h:4rem] md:[--ridge-h:6rem] h-[var(--ridge-h)] -mt-[var(--ridge-h)]",
        "[--ridge-x:calc(50%-10rem)] md:[--ridge-x:50%]",
        className,
      )}
    >
      <div className="absolute inset-0 overflow-hidden">
        <svg
          viewBox="0 0 120 120"
          className="absolute bottom-[48%] h-full w-auto -translate-x-1/2 translate-y-1/2 text-primary"
          style={{ left: SUN_LEFT }}
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
      <div className={cn("absolute inset-0", FILLS[to])} style={maskStyle(RIDGE_MASK)} />
    </div>
  )
}
