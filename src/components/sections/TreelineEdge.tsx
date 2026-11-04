import { cn } from "@/lib/utils"

// A section divider cut like a pine treeline, with the logo's sun rising
// behind it. The idea comes from the jagged "mountain ridge" edges on
// sunlightsprinkler.com; ours uses the pines and sun from the Trailhead badge
// instead of peaks, so it reads as the brand and not as a template.
//
// How it works: a block the colour of the section BELOW (`to`) is masked
// with a repeating treeline tile, so the trees rise into whatever sits
// above. By default the block pulls itself up over the previous section
// (`overlap`), which is right for photos and for sections whose bottom
// padding is clear of content. Pass `from` instead to stack the edge between
// two flat colours without overlapping anything.
//
// Place the edge as a SIBLING between the two sections, never as the first
// child of the section below: inside it, the negative margin collapses
// through the section's top and the section's background paints over the
// trees (that is exactly what happened on the first try).
//
// The tile is an SVG data URI used as a CSS mask (`mask-size: auto 100%`),
// so the trees scale with the block height and stay crisp at any width.

const TILE_W = 240
const TILE_H = 120
const GROUND_Y = 104

type Pine = { cx: number; h: number; w: number }

// Seven pines across one tile. The last one straddles the tile seam and is
// drawn again at the left edge so the pattern repeats without a notch.
const PINES: Pine[] = [
  { cx: 17, h: 64, w: 36 },
  { cx: 52, h: 98, w: 46 },
  { cx: 88, h: 74, w: 40 },
  { cx: 124, h: 114, w: 52 },
  { cx: 160, h: 70, w: 38 },
  { cx: 198, h: 92, w: 46 },
  { cx: 238, h: 72, w: 40 },
  { cx: 238 - TILE_W, h: 72, w: 40 },
]

// Three stepped tiers, widest at the base. Coordinates are rounded so the
// data URI stays short.
function pinePath({ cx, h, w }: Pine): string {
  const top = TILE_H - h
  const tiers = [
    { y: 0.42, w: 0.5, inset: 0.38 },
    { y: 0.72, w: 0.78, inset: 0.38 },
    { y: 1, w: 1, inset: 0 },
  ]
  const right: [number, number][] = []
  for (const t of tiers) {
    const y = top + h * t.y
    const half = (w * t.w) / 2
    right.push([cx + half, y])
    if (t.inset) right.push([cx + half * (1 - t.inset), y])
  }
  const left = right.map(([x, y]) => [2 * cx - x, y] as [number, number]).reverse()
  const pts = [[cx, top] as [number, number], ...right, ...left]
  return "M" + pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join("L") + "Z"
}

const TILE_SVG = [
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${TILE_W} ${TILE_H}'>`,
  `<rect x='0' y='${GROUND_Y}' width='${TILE_W}' height='${TILE_H - GROUND_Y}'/>`,
  `<path d='${PINES.map(pinePath).join("")}'/>`,
  `</svg>`,
].join("")

const MASK = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

const FILLS = {
  navy: "bg-navy",
  charcoal: "bg-charcoal",
  primary: "bg-primary",
  cream: "bg-cream",
  stone: "bg-stone",
  background: "bg-background",
  white: "bg-white",
} as const

export type TreelineFill = keyof typeof FILLS

// Height of the edge, and the matching negative margin for overlap mode.
// `md` is exactly `section-padding-y` (4rem / 6rem), so an overlapping edge
// stays inside the previous section's bottom padding and never touches its
// copy. `lg` is for photos, which have nothing to cover.
const SIZES = {
  sm: { box: "h-10 md:h-16", pull: "-mt-10 md:-mt-16" },
  md: { box: "h-16 md:h-24", pull: "-mt-16 md:-mt-24" },
  lg: { box: "h-20 md:h-36", pull: "-mt-20 md:-mt-36" },
} as const

export function TreelineEdge({
  to,
  from,
  sun = "none",
  size = "md",
  overlap = from === undefined,
  className,
}: {
  /** Colour of the section below: the trees are cut from this. */
  to: TreelineFill
  /** Colour painted behind the trees. Omit to show whatever is above (photo, band). */
  from?: TreelineFill
  /** Where the sun rises behind the trees, if at all. */
  sun?: "left" | "right" | "none"
  size?: keyof typeof SIZES
  /** Pull the edge up over the previous section. On by default when `from` is omitted. */
  overlap?: boolean
  className?: string
}) {
  const sunTone = to === "primary" ? "text-cream" : "text-primary"
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative w-full pointer-events-none select-none",
        SIZES[size].box,
        overlap && [SIZES[size].pull, "z-10"],
        from && FILLS[from],
        className,
      )}
    >
      {sun !== "none" && (
        <svg
          viewBox="0 0 100 100"
          className={cn(
            "absolute bottom-0 h-full w-auto",
            sunTone,
            sun === "right" ? "right-[7%]" : "left-[7%]",
          )}
          fill="none"
        >
          <circle cx="50" cy="60" r="33" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
            {[-150, -120, -90, -60, -30].map((deg) => {
              const a = (deg * Math.PI) / 180
              const r1 = 41
              const r2 = 51
              return (
                <line
                  key={deg}
                  x1={(50 + r1 * Math.cos(a)).toFixed(1)}
                  y1={(60 + r1 * Math.sin(a)).toFixed(1)}
                  x2={(50 + r2 * Math.cos(a)).toFixed(1)}
                  y2={(60 + r2 * Math.sin(a)).toFixed(1)}
                />
              )
            })}
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
