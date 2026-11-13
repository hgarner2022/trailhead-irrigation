import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import sharp from "sharp"
import type { Pass, PassVisit } from "@/lib/admin/types"
import { preferenceLabel, preferenceOf, shortDate } from "@/lib/admin/format"

export const PASS_IMAGE = { width: 1280, height: 800 }

const NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Turn-on", inspection: "Inspection", blowout: "Blowout" }

export interface PassImageModel {
  firstName: string
  season: number
  town: string
  zones: number
  number: string
  cancelled: boolean
  cells: { label: string; value: string; lit: boolean; preferred: boolean }[]
}

/** The words on the card, the same rule as the PassCard's visit cells: a date once a visit has one, else the customer's preference, else the window. */
export function passImageModel(pass: Pass): PassImageModel {
  const cells = pass.visits.map((visit) => {
    const dated = visit.completedAt ?? visit.scheduledAt
    const preference = dated ? null : preferenceOf(pass, visit.kind)
    const kind = visit.kind === "inspection" ? null : visit.kind
    const value = dated ? shortDate(dated) : preference && kind ? preferenceLabel(kind, preference) : visit.window
    return { label: NAMES[visit.kind], value, lit: visit.kind === "blowout" && !visit.completedAt, preferred: visit.kind === "blowout" && preference !== null }
  })
  return { firstName: pass.firstName, season: pass.season, town: pass.town, zones: pass.zones, number: pass.number, cancelled: pass.status === "cancelled", cells }
}

/** Satori cannot read WebP, so the artwork goes in as a PNG data URI. */
async function artDataUri(): Promise<string> {
  const file = await readFile(path.join(process.cwd(), "public", "images", "pass-card-art-holo.webp"))
  const png = await sharp(file).resize(PASS_IMAGE.width, PASS_IMAGE.height, { fit: "cover" }).png().toBuffer()
  return `data:image/png;base64,${png.toString("base64")}`
}

const NAVY = "#2B3544"
const LIGHT = "#F59E0B"

/** The pass card as Satori markup (inline styles only; no Tailwind): artwork, a soft paper wash top left, name and season, the band of visits. */
export function PassImage({ model, art }: { model: PassImageModel; art: string }) {
  return (
    <div style={{ display: "flex", position: "relative", width: PASS_IMAGE.width, height: PASS_IMAGE.height, background: NAVY, overflow: "hidden", ...(model.cancelled ? { filter: "grayscale(1)" } : {}) }}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={art} width={PASS_IMAGE.width} height={PASS_IMAGE.height} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: PASS_IMAGE.width, height: PASS_IMAGE.height, backgroundImage: "radial-gradient(circle at 0% 0%, rgba(250,250,248,0.85) 0%, rgba(250,250,248,0.4) 35%, rgba(250,250,248,0) 65%)" }} />
      <div style={{ position: "absolute", top: 48, left: 52, display: "flex", flexDirection: "column", color: NAVY }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3.5, textTransform: "uppercase" }}>Trailhead Lawn &amp; Irrigation</div>
        <div style={{ marginTop: 18, fontSize: 104, fontWeight: 700, lineHeight: 1 }}>{model.firstName}</div>
        <div style={{ marginTop: 10, fontSize: 44, opacity: 0.8 }}>{`Season Pass ${model.season}`}</div>
        <div style={{ marginTop: 14, fontSize: 22, fontWeight: 700, letterSpacing: 3.5, textTransform: "uppercase", opacity: 0.8 }}>{`${model.town} · ${model.zones} zones`}</div>
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: PASS_IMAGE.width, display: "flex", alignItems: "center", padding: "26px 52px", background: "rgba(43,53,68,0.88)", color: "#FFFFFF" }}>
        {model.cancelled ? (
          <div style={{ fontSize: 30, fontWeight: 600 }}>Cancelled</div>
        ) : (
          <div style={{ display: "flex", flex: 1 }}>
            {model.cells.map((cell) => (
              <div key={cell.label} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", fontSize: 21, textTransform: "uppercase", letterSpacing: 2, opacity: 0.7 }}>{cell.preferred ? `${cell.label} · Preferred` : cell.label}</div>
                <div style={{ marginTop: 6, fontSize: 32, fontWeight: cell.lit ? 700 : 500, color: cell.lit ? LIGHT : "#FFFFFF" }}>{cell.value}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 28, opacity: 0.8 }}>{model.number}</div>
      </div>
    </div>
  )
}

/** The pass card as a PNG response, 1280 by 800. */
export async function renderPassImage(model: PassImageModel): Promise<ImageResponse> {
  return new ImageResponse(<PassImage model={model} art={await artDataUri()} />, PASS_IMAGE)
}
