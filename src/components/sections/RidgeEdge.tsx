import { cn } from "@/lib/utils"

// Mountains along the top of the closing strip, with the sun setting into a
// short flat horizon. One navy silhouette, four broad peaks across a laptop
// screen, long slopes, a dominant summit off centre, snow on the two main
// summits, and the badge's sun. Kept calm on purpose: a
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
// short, nearly flat horizon around x=1300 holds the sun.
const RIDGE: [number, number][] = [
  [0, 84], [200, 62], [320, 70], [480, 40], [560, 50], [640, 46], [820, 78],
  [1000, 34], [1060, 42], [1120, 38], [1230, 72], [1370, 74], [1420, 60], [1520, 66], [1600, 84],
]

// Snow on the two main summits: the summit, the two slope points a little
// way down, and a jagged lower edge inside the mountain.
const SNOW: [number, number][][] = [
  [[416, 52], [480, 40], [560, 50], [540, 56], [520, 50], [500, 58], [480, 52], [460, 60], [440, 54]],
  [[951, 46], [1000, 34], [1060, 42], [1040, 50], [1020, 44], [1000, 52], [980, 46], [960, 54]],
]

function mask(paths: string[]) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${TILE_W} ${TILE_H}'>` +
    paths.map((d) => `<path d='${d}'/>`).join("") +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
const poly = (points: [number, number][]) => "M" + points.map(([x, y]) => `${x},${y}`).join("L") + "Z"

const RIDGE_MASK = mask([poly([...RIDGE, [TILE_W, TILE_H], [0, TILE_H]])])
const SNOW_MASK = mask(SNOW.map(poly))

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

// The sun from the badge: a half dome on the horizon and five long, thick
// rays (two flat, two diagonal, one straight up). Drawn in a 200x100 box
// with the dome's flat base on the bottom edge. Centred on tile x=1300,
// 500 units right of the tile centre, i.e. 500/120 block heights, with the
// base tucked just under the horizon so only the dome and rays show.
const SUN_LEFT = `calc(var(--ridge-x) + ${500 / TILE_H} * var(--ridge-h))`
const RAYS = [
  { x1: 48, y1: 92, x2: 24, y2: 92 },
  { x1: 152, y1: 92, x2: 176, y2: 92 },
  { x1: 63.2, y1: 63.2, x2: 46.3, y2: 46.3 },
  { x1: 136.8, y1: 63.2, x2: 153.7, y2: 46.3 },
  { x1: 100, y1: 48, x2: 100, y2: 24 },
]

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
          viewBox="0 0 200 100"
          className="absolute bottom-[34%] h-[90%] w-auto -translate-x-1/2 text-primary"
          style={{ left: SUN_LEFT }}
          fill="none"
        >
          <path d="M60,100A40,40 0 0 1 140,100Z" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="9" strokeLinecap="round">
            {RAYS.map((r) => (
              <line key={r.x1} {...r} />
            ))}
          </g>
        </svg>
      </div>
      <div className={cn("absolute inset-0", FILLS[to])} style={maskStyle(RIDGE_MASK)} />
      <div className="absolute inset-0 bg-white/85" style={maskStyle(SNOW_MASK)} />
    </div>
  )
}
