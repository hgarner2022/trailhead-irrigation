"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// The day's map, loaded only when the Schedule page shows it: MapLibre is large and never needed
// on the other five pages. Browser only (the map draws into a canvas), with a block of the same size while it loads.
export const ScheduleDayMap = dynamic(() => import("@/components/blocks/DayMap").then((m) => m.DayMap), {
  ssr: false,
  loading: () => <Skeleton className={cn("min-h-80 min-w-0 lg:col-span-3")} />,
})
