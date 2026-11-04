import { cn } from "@/lib/utils"

// Mountains along the top of the closing strip, with the sun setting into a
// saddle. What makes a silhouette read as mountains rather than a zigzag:
// a dominant peak off centre, slopes with shoulders and sub-peaks instead of
// clean triangles, and a second, lighter ridge behind for depth. That is
// all this is: two silhouettes and the sun.
//
// Both ridges are repeating tiles (same width and height, so they stay in
// register) used as CSS masks over blocks of colour. The tiles scale with
// the block height (`mask-size: auto 100%`) and are anchored at
// `--ridge-x`, so geometry is predictable: a point X tile-units right of the
// tile centre lands at `--ridge-x + (X / TILE_H) * --ridge-h`. The sun is
// placed with that rule so it always sits in the same saddle. On phones the
// tiles slide left so that saddle lands near the right edge of the screen.
//
// The block pulls itself up over the previous section's bottom padding, so
// place it as a sibling between the two sections, never as the first child
// of the section below (inside, the negative margin collapses through the
// section's top and the section's background paints over the mountains).

const TILE_W = 1200
const TILE_H = 120

// Front ridge. First and last share a height so it repeats seamlessly.
// Three groups: a modest peak left, a double summit, then the high one.
// The shallow saddle at x=980 holds the sun.
const FRONT: [number, number][] = [
  [0, 80], [40, 70], [90, 52], [120, 58], [160, 34], [185, 44], [210, 40], [250, 64], [300, 74],
  [340, 62], [380, 46], [410, 52], [440, 28], [470, 36], [500, 30], [530, 48], [560, 42], [600, 66], [640, 76],
  [690, 60], [730, 44], [760, 50], [800, 22], [830, 34], [850, 30], [880, 52], [900, 48], [940, 70], [980, 78],
  [1020, 64], [1060, 50], [1090, 56], [1120, 38], [1150, 48], [1180, 66], [1200, 80],
]

// Back ridge, lighter, showing through the front ridge's low points. Low
// around the sun so it never covers it.
const BACK: [number, number][] = [
  [0, 66], [50, 56], [100, 62], [150, 50], [200, 56], [250, 40], [290, 34], [330, 42], [370, 52], [420, 58],
  [480, 50], [540, 56], [580, 44], [620, 36], [660, 46], [700, 58], [760, 62], [820, 56], [870, 60], [920, 72],
  [980, 84], [1040, 74], [1090, 62], [1130, 54], [1170, 60], [1200, 66],
]

function mask(points: [number, number][]) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${TILE_W} ${TILE_H}'>` +
    `<path d='M${points.map(([x, y]) => `${x},${y}`).join("L")}L${TILE_W},${TILE_H}L0,${TILE_H}Z'/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const FRONT_MASK = mask(FRONT)
const BACK_MASK = mask(BACK)

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

// The sun: centre at tile x=980, which is 380 units right of the tile
// centre, i.e. 380/120 block heights. Its centre sits 48% up the block, so
// the saddle's slopes hide the lower part.
const SUN_LEFT = `calc(var(--ridge-x) + ${380 / TILE_H} * var(--ridge-h))`
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
  navy: { front: "bg-navy", back: "bg-navy-light" },
  charcoal: { front: "bg-charcoal", back: "bg-navy" },
} as const

export function RidgeEdge({ to, className }: { to: keyof typeof FILLS; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative z-10 w-full pointer-events-none select-none",
        "[--ridge-h:4rem] md:[--ridge-h:6rem] h-[var(--ridge-h)] -mt-[var(--ridge-h)]",
        "[--ridge-x:calc(50%-7rem)] md:[--ridge-x:50%]",
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
      <div className={cn("absolute inset-0", FILLS[to].back)} style={maskStyle(BACK_MASK)} />
      <div className={cn("absolute inset-0", FILLS[to].front)} style={maskStyle(FRONT_MASK)} />
    </div>
  )
}
