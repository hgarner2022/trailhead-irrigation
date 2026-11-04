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
  // plains and low foothills
  [0, 96], [100, 90], [200, 94], [300, 84], [380, 90], [440, 78], [520, 70], [580, 62],
  // the Flatirons: five slabs leaning north, a long slope up and a sharp drop
  [600, 66], [640, 44], [650, 70],
  [660, 66], [700, 36], [712, 68],
  [722, 64], [765, 28], [778, 66],
  [790, 62], [840, 20], [855, 64],
  [868, 60], [905, 34], [918, 68],
  // Bear Peak behind them
  [960, 56], [1000, 48], [1040, 58], [1090, 66],
  // Indian Peaks
  [1140, 54], [1180, 60], [1220, 44], [1260, 52], [1300, 38], [1340, 48], [1380, 56],
  // Longs Peak, flat summit, then the notch and Mount Meeker's point
  [1430, 46], [1470, 34], [1500, 22], [1520, 12], [1550, 10], [1575, 14], [1595, 30], [1615, 22], [1640, 36], [1680, 50], [1720, 58],
  // north, tapering
  [1780, 64], [1820, 56], [1860, 66], [1920, 60], [1960, 70], [2020, 62], [2080, 74], [2140, 68], [2200, 80], [2260, 76],
  [2320, 86], [2380, 82], [2440, 90], [2500, 94], [2560, 96],
]

const SVG =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'>` +
  `<path d='M${SKYLINE.map(([x, y]) => `${x},${y}`).join("L")}L${W},${H}L0,${H}Z'/>` +
  `</svg>`

const MASK = `url("data:image/svg+xml,${encodeURIComponent(SVG)}")`

// The sun: a disc whose centre sits on the bottom edge of its own viewBox,
// so the SVG clips it to the top half and nothing can poke out below the
// ridge. Seven rays over the top.
const SUN_R = 30
const RAYS = [-165, -140, -115, -90, -65, -40, -15].map((deg) => {
  const a = (deg * Math.PI) / 180
  return {
    x1: (50 + (SUN_R + 8) * Math.cos(a)).toFixed(1),
    y1: (60 + (SUN_R + 8) * Math.sin(a)).toFixed(1),
    x2: (50 + (SUN_R + 20) * Math.cos(a)).toFixed(1),
    y2: (60 + (SUN_R + 20) * Math.sin(a)).toFixed(1),
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
        viewBox="0 0 100 60"
        className="absolute right-[8%] bottom-[64%] md:bottom-[43%] h-[75%] w-auto text-primary"
        fill="none"
      >
        <circle cx="50" cy="60" r={SUN_R} fill="currentColor" />
        <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
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
