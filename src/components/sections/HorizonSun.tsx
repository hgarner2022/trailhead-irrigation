// The badge's sun rising from the top edge of the closing strip: a half
// dome on the horizon and five long, thick rays (two flat, two diagonal,
// one straight up). The horizon is the strip's own straight top edge; the
// sun stands in the previous section's bottom padding, so it never covers
// copy. No mountains (Hannah, Nov 4 2026).
//
// Place it as the first child of a `relative` section.

const RAYS = [
  { x1: 48, y1: 92, x2: 24, y2: 92 },
  { x1: 152, y1: 92, x2: 176, y2: 92 },
  { x1: 63.2, y1: 63.2, x2: 46.3, y2: 46.3 },
  { x1: 136.8, y1: 63.2, x2: 153.7, y2: 46.3 },
  { x1: 100, y1: 48, x2: 100, y2: 24 },
]

export function HorizonSun() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 100"
      className="pointer-events-none absolute bottom-full right-[8%] h-12 md:h-20 w-auto text-primary"
      fill="none"
    >
      <path d="M60,100A40,40 0 0 1 140,100Z" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="round">
        {RAYS.map((r) => (
          <line key={r.x1} {...r} />
        ))}
      </g>
    </svg>
  )
}
