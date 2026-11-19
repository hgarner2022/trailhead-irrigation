import * as React from "react"
import { cn } from "@/lib/utils"

// The 12-column grid and the vertical stack the customer's screens are laid out on, adapted from the reference library's `ui/grid.tsx` (same names and props: `cols`, `gap`, `span`)
// in a server-safe, viewport-media-query form (no resize observer, so a server screen can use it). Spacing is the scale of docs/plans/2026-11-19-customer-side-polish-research.md:
// 8 inside a group (`sm`), 16 between facts and a button (`md`), 24 between cards (`lg`), 32 between sections (`xl`), 48 around a page (`2xl`). Class names are enumerated so Tailwind sees them.

type Count = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12
type Gap = "sm" | "md" | "lg" | "xl" | "2xl"
type Responsive<T> = { base: T; sm?: T; lg?: T }

const COLS: Record<Count, [string, string, string]> = {
  1: ["grid-cols-1", "sm:grid-cols-1", "lg:grid-cols-1"],
  2: ["grid-cols-2", "sm:grid-cols-2", "lg:grid-cols-2"],
  3: ["grid-cols-3", "sm:grid-cols-3", "lg:grid-cols-3"],
  4: ["grid-cols-4", "sm:grid-cols-4", "lg:grid-cols-4"],
  5: ["grid-cols-5", "sm:grid-cols-5", "lg:grid-cols-5"],
  6: ["grid-cols-6", "sm:grid-cols-6", "lg:grid-cols-6"],
  7: ["grid-cols-7", "sm:grid-cols-7", "lg:grid-cols-7"],
  8: ["grid-cols-8", "sm:grid-cols-8", "lg:grid-cols-8"],
  9: ["grid-cols-9", "sm:grid-cols-9", "lg:grid-cols-9"],
  12: ["grid-cols-12", "sm:grid-cols-12", "lg:grid-cols-12"],
}
const SPAN: Record<Count | "full", [string, string, string]> = {
  1: ["col-span-1", "sm:col-span-1", "lg:col-span-1"],
  2: ["col-span-2", "sm:col-span-2", "lg:col-span-2"],
  3: ["col-span-3", "sm:col-span-3", "lg:col-span-3"],
  4: ["col-span-4", "sm:col-span-4", "lg:col-span-4"],
  5: ["col-span-5", "sm:col-span-5", "lg:col-span-5"],
  6: ["col-span-6", "sm:col-span-6", "lg:col-span-6"],
  7: ["col-span-7", "sm:col-span-7", "lg:col-span-7"],
  8: ["col-span-8", "sm:col-span-8", "lg:col-span-8"],
  9: ["col-span-9", "sm:col-span-9", "lg:col-span-9"],
  12: ["col-span-12", "sm:col-span-12", "lg:col-span-12"],
  full: ["col-span-full", "sm:col-span-full", "lg:col-span-full"],
}
const GAP: Record<Gap, string> = { sm: "gap-2", md: "gap-4", lg: "gap-6", xl: "gap-8", "2xl": "gap-12" }
const STACK: Record<Gap, string> = { sm: "space-y-2", md: "space-y-4", lg: "space-y-6", xl: "space-y-8", "2xl": "space-y-12" }

const pick = <T extends string | number>(map: Record<T, [string, string, string]>, v: Responsive<T>) =>
  [map[v.base][0], v.sm && v.sm !== v.base ? map[v.sm][1] : "", v.lg && v.lg !== (v.sm ?? v.base) ? map[v.lg][2] : ""]

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** columns at each breakpoint; `base` is the phone */
  cols?: Responsive<Count>
  gap?: Gap
  /** `start` keeps a short column from stretching to its neighbour's height */
  align?: "start" | "stretch"
}

function Grid({ className, cols = { base: 1 }, gap = "lg", align = "start", ...props }: GridProps) {
  return <div data-slot="grid" className={cn("grid", pick(COLS, cols), GAP[gap], align === "start" ? "items-start" : "items-stretch", className)} {...props} />
}

export interface GridColProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: Responsive<Count | "full">
}

function GridCol({ className, span = { base: "full" }, ...props }: GridColProps) {
  return <div data-slot="grid-col" className={cn("min-w-0", pick(SPAN, span), className)} {...props} />
}

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap
}

/** Children one under another with one gap from the scale; the one place a screen sets vertical rhythm. */
function Stack({ className, gap = "lg", ...props }: StackProps) {
  return <div data-slot="stack" className={cn(STACK[gap], className)} {...props} />
}

export { Grid, GridCol, Stack }
