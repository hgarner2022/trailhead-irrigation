"use client"

import { useEffect, useRef, useState } from "react"
import { MapPinOff } from "lucide-react"
import type { Map as MapLibreMap, Marker, Popup } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "@/lib/utils"
import type { Truck, Visit } from "@/lib/admin/types"
import { EmptyState } from "./EmptyState"
import { hasPoint, readTokenColour, shadeOf, stopLine, stopsDescription, townBounds, truckClass, type Stop } from "./day-map-helpers"

// One day's stops on real geography: open tiles from OpenFreeMap (no key),
// one numbered pin per visit in its truck's colour, a translucent patch
// around each truck's stops, and a popup with the name, town and kind of
// the selected stop. Clicking a pin reports it through `onSelect`, so the
// grid and the stop list beside the map highlight the same visit; the pins
// themselves are hidden from assistive tech because the list beside the map
// is the accessible path, and the map canvas carries an `img` role whose
// name lists the stops. MapLibre is loaded on the client after mount, so the
// server, jsdom and a browser without WebGL render the fallback instead.
// Colours are never written here: each pin is a token class, and the patch
// colour is read back from that class through a probe (`readTokenColour`).

export interface DayMapProps {
  /** the day's visits, on every truck; a visit without a point is left off */
  stops: Visit[]
  trucks: Truck[]
  selectedId?: string
  onSelect: (visitId: string | undefined) => void
  className?: string
}

const STYLE = "https://tiles.openfreemap.org/styles/liberty"
const SHADES = "truck-shades"
const PIN = "flex size-7 cursor-pointer items-center justify-center rounded-full text-xs font-semibold text-white shadow-md ring-2 ring-white"

/** WebGL is there to draw on: false on the server, in jsdom and in a browser that has it switched off. */
function webglSupported(): boolean {
  if (typeof window === "undefined" || typeof window.WebGLRenderingContext === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"))
  } catch {
    return false
  }
}

function shadeFeatures(stops: Stop[], trucks: Truck[], container: HTMLElement): GeoJSON.FeatureCollection {
  const features = trucks.flatMap((truck, i): GeoJSON.Feature[] => {
    const ring = shadeOf(stops.filter((s) => s.truckId === truck.id)).map((p) => [...p])
    if (ring.length === 0) return []
    return [{ type: "Feature", properties: { colour: readTokenColour(container, truckClass(i)) }, geometry: { type: "Polygon", coordinates: [ring] } }]
  })
  return { type: "FeatureCollection", features }
}

export function DayMap({ stops, trucks, selectedId, onSelect, className }: DayMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const popup = useRef<Popup | null>(null)
  const select = useRef(onSelect)
  const [state, setState] = useState<"loading" | "ready" | "unsupported">("loading")
  useEffect(() => {
    select.current = onSelect
  })

  useEffect(() => {
    const el = container.current
    if (!el || !webglSupported()) {
      setState("unsupported")
      return
    }
    let cancelled = false
    let map: MapLibreMap | undefined
    import("maplibre-gl").then(({ Map: MapLibre, Popup: MapPopup }) => {
      if (cancelled) return
      try {
        map = new MapLibre({ container: el, style: STYLE, attributionControl: { compact: true }, bounds: townBounds(), fitBoundsOptions: { padding: 40 } })
      } catch {
        setState("unsupported")
        return
      }
      map.getCanvas().setAttribute("role", "img")
      map.on("load", () => {
        if (cancelled || !map) return
        map.addSource(SHADES, { type: "geojson", data: { type: "FeatureCollection", features: [] } })
        map.addLayer({ id: `${SHADES}-fill`, type: "fill", source: SHADES, paint: { "fill-color": ["get", "colour"], "fill-opacity": 0.15 } })
        map.addLayer({ id: `${SHADES}-line`, type: "line", source: SHADES, paint: { "line-color": ["get", "colour"], "line-width": 1.5, "line-opacity": 0.6 } })
        popup.current = new MapPopup({ closeButton: false, closeOnClick: false, offset: 18 })
        mapRef.current = map
        setState("ready")
      })
    })
    return () => {
      cancelled = true
      mapRef.current = null
      popup.current = null
      map?.remove()
    }
  }, [])

  // Pins, patches and the canvas name follow the stops; the popup follows the selection.
  useEffect(() => {
    const map = mapRef.current
    const el = container.current
    if (state !== "ready" || !map || !el) return
    const placed = stops.filter(hasPoint)
    map.getCanvas().setAttribute("aria-label", stopsDescription(placed))
    for (const m of markers.current) m.remove()
    markers.current = []
    import("maplibre-gl").then(({ Marker: MapMarker }) => {
      if (mapRef.current !== map) return
      markers.current = placed.map((stop, i) => {
        const pin = document.createElement("div")
        const index = Math.max(0, trucks.findIndex((t) => t.id === stop.truckId))
        pin.className = cn(PIN, truckClass(index), stop.id === selectedId && "ring-4 ring-primary/50")
        pin.dataset.visit = stop.id
        pin.setAttribute("aria-hidden", "true")
        pin.textContent = String(stop.stopOrder ?? i + 1)
        pin.addEventListener("click", (event) => {
          event.stopPropagation()
          select.current(stop.id === selectedId ? undefined : stop.id)
        })
        return new MapMarker({ element: pin }).setLngLat([stop.lng, stop.lat]).addTo(map)
      })
      const source = map.getSource(SHADES)
      if (source && "setData" in source) (source as { setData: (d: GeoJSON.FeatureCollection) => void }).setData(shadeFeatures(placed, trucks, el))
      const selected = placed.find((s) => s.id === selectedId)
      if (selected && popup.current) {
        const line = document.createElement("p")
        line.className = "text-sm text-foreground"
        line.textContent = stopLine(selected)
        popup.current.setLngLat([selected.lng, selected.lat]).setDOMContent(line).addTo(map)
      } else popup.current?.remove()
    })
  }, [state, stops, trucks, selectedId])

  if (state === "unsupported") {
    return (
      <div data-slot="day-map" data-state="unsupported" className={cn("flex items-center rounded-lg border border-border bg-stone", className)}>
        <EmptyState icon={MapPinOff} title="Map needs a browser" line="The day's stops draw on a map here once the page is open in a browser with WebGL." className="w-full" />
      </div>
    )
  }
  return (
    <div
      ref={container}
      data-slot="day-map"
      data-state={state}
      role="region"
      aria-label="Map of the day's stops"
      className={cn("h-96 overflow-hidden rounded-lg border border-border bg-stone lg:h-[32rem]", className)}
    />
  )
}
