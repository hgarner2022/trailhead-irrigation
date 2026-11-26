"use client"

import { useEffect, useRef, useState } from "react"
import { MapPinOff } from "lucide-react"
import type { Map as MapLibreMap, Marker, Popup } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "@/lib/utils"
import type { Person, Visit } from "@/lib/admin/types"
import { EmptyState } from "./EmptyState"
import { hasPoint, personClass, readTokenColour, routeNumbers, routesOf, shadeOf, stopLine, stopsDescription, townBounds, type HollowStop, type Stop } from "./day-map-helpers"

// One day's stops on real geography: open tiles from OpenFreeMap (no key),
// one numbered pin per visit in its person's colour (the number is the stop's place in that person's route), a line through each person's route in their colour, a translucent patch
// around each person's stops, and a popup with the name, town and kind of
// the selected stop. Clicking a pin reports it through `onSelect`, so the
// grid and the stop list beside the map highlight the same visit; the pins
// themselves are hidden from assistive tech because the list beside the map
// is the accessible path, and the map canvas carries an `img` role whose
// name lists the stops. MapLibre is loaded on the client after mount, so the
// server, jsdom and a browser without WebGL render the fallback instead.
// Colours are never written here: each pin is a token class, and the patch
// colour is read back from that class through a probe (`readTokenColour`).

export interface DayMapProps {
  /** the day's visits, everyone's; a visit without a point is left off */
  stops: Visit[]
  /** the people on the schedule, in order: each takes the colour of their position */
  people: Person[]
  selectedId?: string
  onSelect: (visitId: string | undefined) => void
  /** jobs with no day, drawn as hollow pins (the Schedule's Map panel); they are not part of any route */
  hollow?: readonly HollowStop[]
  /** the pin to light, a stop's id or a hollow stop's id, from outside the map */
  hoverId?: string
  /** the pointer is on a pin (its id) or has left it (undefined) */
  onHover?: (id: string | undefined) => void
  className?: string
}

const STYLE = "https://tiles.openfreemap.org/styles/positron"
/** Used when the tile style cannot be fetched (offline, blocked): a plain background, so the pins and route lines still draw. */
const BLANK_STYLE = { version: 8 as const, sources: {}, layers: [{ id: "background", type: "background" as const, paint: { "background-color": "#f5f5f4" } }] }
const STYLE_WAIT_MS = 4000

/** The tile style when it answers in time, else the plain one. */
async function styleOrBlank(): Promise<string | typeof BLANK_STYLE> {
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), STYLE_WAIT_MS)
    const res = await fetch(STYLE, { signal: ctl.signal })
    clearTimeout(timer)
    return res.ok ? STYLE : BLANK_STYLE
  } catch {
    return BLANK_STYLE
  }
}
const SHADES = "person-shades"
const ROUTES = "person-routes"
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

function shadeFeatures(stops: Stop[], people: Person[], container: HTMLElement): GeoJSON.FeatureCollection {
  const features = people.flatMap((person, i): GeoJSON.Feature[] => {
    const ring = shadeOf(stops.filter((s) => s.personId === person.id)).map((p) => [...p])
    if (ring.length === 0) return []
    return [{ type: "Feature", properties: { colour: readTokenColour(container, personClass(i)) }, geometry: { type: "Polygon", coordinates: [ring] } }]
  })
  return { type: "FeatureCollection", features }
}

function routeFeatures(stops: Stop[], people: Person[], container: HTMLElement): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: routesOf(stops).map((r) => ({
      type: "Feature",
      properties: { colour: readTokenColour(container, personClass(Math.max(0, people.findIndex((p) => p.id === r.personId)))) },
      geometry: { type: "LineString", coordinates: r.points.map((p) => [...p]) },
    })),
  }
}

interface Pin {
  marker: Marker
  el: HTMLDivElement
  /** what the element was last drawn from, so an unchanged pin is left alone */
  key: string
}

const SELECTED_PIN = "ring-4 ring-primary/50"
const HOVER_PIN = ["ring-4", "ring-primary", "scale-125", "z-10"]
const HOLLOW_PIN = "flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-navy bg-background shadow-md transition-transform"

export function DayMap({ stops, people, selectedId, onSelect, hollow = [], hoverId, onHover, className }: DayMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const MarkerCtor = useRef<typeof Marker | null>(null)
  const pins = useRef(new globalThis.Map<string, Pin>())
  const hollowPins = useRef(new globalThis.Map<string, Pin>())
  const popup = useRef<Popup | null>(null)
  const hover = useRef(onHover)
  const select = useRef(onSelect)
  const selected = useRef(selectedId)
  const [state, setState] = useState<"loading" | "ready" | "unsupported">("loading")
  useEffect(() => {
    select.current = onSelect
    hover.current = onHover
    selected.current = selectedId
  })

  useEffect(() => {
    const el = container.current
    if (!el || !webglSupported()) {
      setState("unsupported")
      return
    }
    let cancelled = false
    let map: MapLibreMap | undefined
    const livePins = pins.current
    const liveHollow = hollowPins.current
    // MapLibre is resolved once here; the effects below then run synchronously.
    Promise.all([import("maplibre-gl"), styleOrBlank()]).then(([{ Map: MapLibre, Popup: MapPopup, Marker: MapMarker }, style]) => {
      if (cancelled) return
      try {
        map = new MapLibre({ container: el, style, attributionControl: { compact: true }, bounds: townBounds(), fitBoundsOptions: { padding: 40 } })
      } catch (error) {
        console.error("day map: could not start", error)
        setState("unsupported")
        return
      }
      map.getCanvas().setAttribute("role", "img")
      let ready = false
      map.on("error", (event) => {
        console.error("day map error", event.error)
        // A missed tile or glyph is only logged: the pins and routes draw over whatever loaded. Only a style that cannot start leaves no map.
        const e = event as unknown as { sourceId?: string; tile?: unknown }
        if (!ready && !cancelled && !e.sourceId && !e.tile) setState("unsupported")
      })
      map.on("load", () => {
        if (cancelled || !map) return
        ready = true
        map.addSource(SHADES, { type: "geojson", data: { type: "FeatureCollection", features: [] } })
        map.addLayer({ id: `${SHADES}-fill`, type: "fill", source: SHADES, paint: { "fill-color": ["get", "colour"], "fill-opacity": 0.15 } })
        map.addLayer({ id: `${SHADES}-line`, type: "line", source: SHADES, paint: { "line-color": ["get", "colour"], "line-width": 1.5, "line-opacity": 0.6 } })
        map.addSource(ROUTES, { type: "geojson", data: { type: "FeatureCollection", features: [] } })
        map.addLayer({ id: `${ROUTES}-line`, type: "line", source: ROUTES, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "colour"], "line-width": 3, "line-opacity": 0.8 } })
        popup.current = new MapPopup({ closeButton: false, closeOnClick: false, offset: 18 })
        MarkerCtor.current = MapMarker
        mapRef.current = map
        setState("ready")
      })
    })
    return () => {
      cancelled = true
      mapRef.current = null
      popup.current = null
      MarkerCtor.current = null
      livePins.clear()
      liveHollow.clear()
      map?.remove()
    }
  }, [])

  // Pins, patches, the canvas name and the view follow the stops. A pin is kept
  // by visit id and only touched when its point, number or colour changed.
  useEffect(() => {
    const map = mapRef.current
    const el = container.current
    const MarkerClass = MarkerCtor.current
    if (state !== "ready" || !map || !el || !MarkerClass) return
    const placed = stops.filter(hasPoint)
    map.getCanvas().setAttribute("aria-label", stopsDescription(placed))
    const keep = new Set(placed.map((s) => s.id))
    for (const [id, pin] of pins.current) {
      if (!keep.has(id)) {
        pin.marker.remove()
        pins.current.delete(id)
      }
    }
    const numbers = routeNumbers(placed)
    placed.forEach((stop) => {
      const colour = personClass(Math.max(0, people.findIndex((p) => p.id === stop.personId)))
      const label = String(numbers.get(stop.id))
      const key = `${stop.lng},${stop.lat},${colour},${label}`
      const existing = pins.current.get(stop.id)
      if (existing?.key === key) return
      if (existing) {
        existing.el.className = cn(PIN, colour, stop.id === selected.current && SELECTED_PIN)
        existing.el.textContent = label
        existing.marker.setLngLat([stop.lng, stop.lat])
        existing.key = key
        return
      }
      const pin = document.createElement("div")
      pin.className = cn(PIN, colour, stop.id === selected.current && SELECTED_PIN)
      pin.dataset.visit = stop.id
      pin.setAttribute("aria-hidden", "true")
      pin.textContent = label
      pin.addEventListener("click", (event) => {
        event.stopPropagation()
        select.current(stop.id === selected.current ? undefined : stop.id)
      })
      pin.addEventListener("mouseenter", () => hover.current?.(stop.id))
      pin.addEventListener("mouseleave", () => hover.current?.(undefined))
      pins.current.set(stop.id, { marker: new MarkerClass({ element: pin }).setLngLat([stop.lng, stop.lat]).addTo(map), el: pin, key })
    })
    const source = map.getSource(SHADES)
    if (source && "setData" in source) (source as { setData: (d: GeoJSON.FeatureCollection) => void }).setData(shadeFeatures(placed, people, el))
    const routes = map.getSource(ROUTES)
    if (routes && "setData" in routes) (routes as { setData: (d: GeoJSON.FeatureCollection) => void }).setData(routeFeatures(placed, people, el))
    if (placed.length > 0) {
      const lngs = placed.map((s) => s.lng)
      const lats = placed.map((s) => s.lat)
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14, duration: 0 })
    }
  }, [state, stops, people])

  // The selection only toggles a class on the pins that exist and moves the popup.
  useEffect(() => {
    const map = mapRef.current
    if (state !== "ready" || !map) return
    for (const [id, pin] of pins.current) pin.el.classList.toggle("ring-4", id === selectedId), pin.el.classList.toggle("ring-primary/50", id === selectedId)
    const chosen = stops.filter(hasPoint).find((s) => s.id === selectedId)
    if (chosen && popup.current) {
      const line = document.createElement("p")
      line.className = "text-sm text-foreground"
      line.textContent = stopLine(chosen)
      popup.current.setLngLat([chosen.lng, chosen.lat]).setDOMContent(line).addTo(map)
    } else popup.current?.remove()
  }, [state, stops, selectedId])

  // Hollow pins are the jobs with no day: dashed rings at their points, kept by id like the stops' pins.
  useEffect(() => {
    const map = mapRef.current
    const MarkerClass = MarkerCtor.current
    if (state !== "ready" || !map || !MarkerClass) return
    const keep = new Set(hollow.map((h) => h.id))
    for (const [id, pin] of hollowPins.current) {
      if (!keep.has(id)) {
        pin.marker.remove()
        hollowPins.current.delete(id)
      }
    }
    for (const h of hollow) {
      const key = `${h.lng},${h.lat}`
      const existing = hollowPins.current.get(h.id)
      if (existing?.key === key) continue
      if (existing) {
        existing.marker.setLngLat([h.lng, h.lat])
        existing.key = key
        continue
      }
      const pin = document.createElement("div")
      pin.className = HOLLOW_PIN
      pin.dataset.unscheduled = h.id
      pin.setAttribute("aria-hidden", "true")
      pin.addEventListener("mouseenter", () => hover.current?.(h.id))
      pin.addEventListener("mouseleave", () => hover.current?.(undefined))
      hollowPins.current.set(h.id, { marker: new MarkerClass({ element: pin }).setLngLat([h.lng, h.lat]).addTo(map), el: pin, key })
    }
    if (stops.filter(hasPoint).length === 0 && hollow.length > 0) {
      const lngs = hollow.map((h) => h.lng)
      const lats = hollow.map((h) => h.lat)
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14, duration: 0 })
    }
  }, [state, hollow, stops])

  // A pin lit from outside (a row or a block under the pointer) is ringed and a little larger.
  useEffect(() => {
    if (state !== "ready") return
    for (const group of [pins.current, hollowPins.current]) for (const [id, pin] of group) for (const c of HOVER_PIN) pin.el.classList.toggle(c, id === hoverId)
  }, [state, stops, hollow, hoverId])

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
