import { cn } from "@/lib/utils"

// The Front Range skyline as seen from Erie, as one navy silhouette along
// the top of the closing strip. Left to right: foothills, the Flatirons'
// tilted slabs, the Indian Peaks, then Longs Peak with Mount Meeker beside
// it as the high point, and the range tapering north. A small sun sets
// behind the range on the right.
//
// A block the colour of the section BELOW (`to`) is masked with the skyline,
// so the peaks rise into whatever sits above. The skyline scales with the
// block height and is centred, so a phone shows the middle of the range
// (Longs Peak) and a desktop shows most of it. The ends sit at the same
// height, so on very wide screens it repeats without a seam.
//
// The block pulls itself up over the previous section's bottom padding, so
// place it as a sibling between the two sections, never as the first child
// of the section below (inside, the negative margin collapses through the
// section's top and the section's background paints over the ridge).

const W = 2560
const H = 120

const SKYLINE: [number, number][] = [
  [0, 100], [80, 94], [160, 96], [240, 88], [320, 92], [400, 80], [460, 86], [520, 76], [580, 82],
  // foothills into the Flatirons
  [640, 70], [700, 60], [730, 66], [760, 52], [780, 64], [810, 50], [830, 62], [860, 46], [880, 60], [910, 54], [950, 72],
  // Indian Peaks
  [1000, 64], [1040, 56], [1080, 62], [1120, 50], [1160, 58], [1200, 46], [1240, 54],
  // Longs Peak and Mount Meeker
  [1280, 44], [1310, 36], [1340, 28], [1365, 30], [1385, 40], [1400, 38], [1420, 50], [1450, 58], [1480, 52], [1510, 66],
  // north, tapering
  [1560, 60], [1600, 70], [1640, 64], [1680, 74], [1720, 68], [1760, 78], [1800, 72], [1840, 66], [1880, 72], [1920, 60],
  [1960, 66], [2000, 56], [2040, 64], [2080, 70], [2120, 78], [2160, 74], [2200, 84], [2240, 80], [2280, 88], [2320, 84],
  [2360, 92], [2400, 90], [2460, 96], [2520, 98], [2560, 100],
]

const SVG =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'>` +
  `<path d='M${SKYLINE.map(([x, y]) => `${x},${y}`).join("L")}L${W},${H}L0,${H}Z'/>` +
  `</svg>`

const MASK = `url("data:image/svg+xml,${encodeURIComponent(SVG)}")`

// Five short rays over the top half of the sun.
const RAYS = [-150, -120, -90, -60, -30].map((deg) => {
  const a = (deg * Math.PI) / 180
  return {
    x1: (50 + 36 * Math.cos(a)).toFixed(1),
    y1: (62 + 36 * Math.sin(a)).toFixed(1),
    x2: (50 + 46 * Math.cos(a)).toFixed(1),
    y2: (62 + 46 * Math.sin(a)).toFixed(1),
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
      className={cn("relative z-10 w-full h-14 md:h-24 -mt-14 md:-mt-24 pointer-events-none select-none", className)}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute right-[8%] bottom-[35%] md:bottom-[25%] h-10 md:h-14 w-auto text-primary"
        fill="none"
      >
        <circle cx="50" cy="62" r="28" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          {RAYS.map((r) => (
            <line key={r.x1} {...r} />
          ))}
        </g>
      </svg>
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
