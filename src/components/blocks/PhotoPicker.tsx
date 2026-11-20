"use client"

import Image from "next/image"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// "Add photos" on the booking form (optional, and the same box on the request path's "Tell Ryan about it"): a real file input behind a 44px button that opens the camera roll or the camera on
// a phone, the chosen photos as a two-up grid of thumbnails each with its own Remove, and one count line. In the prototype nothing uploads; `samples` adds a quiet "Add 2 sample photos"
// button so a reviewer can see the state without a file. The screen holds the list (name and a preview address). Pure props apart from reading the files, client component.

export interface PickedPhoto {
  name: string
  src: string
}

export interface PhotoPickerProps {
  photos: readonly PickedPhoto[]
  onAdd: (photos: PickedPhoto[]) => void
  onRemove: (name: string) => void
  /** photos the prototype can add without a file; shows "Add N sample photos" */
  samples?: readonly PickedPhoto[]
  /** the most photos taken; default 6 */
  max?: number
  className?: string
}

export const photoCount = (n: number) => `${n} photo${n === 1 ? "" : "s"}`

export function PhotoPicker({ photos, onAdd, onRemove, samples, max = 6, className }: PhotoPickerProps) {
  const room = max - photos.length
  const fresh = (list: readonly PickedPhoto[]) => list.filter((p) => !photos.some((x) => x.name === p.name)).slice(0, Math.max(0, room))
  return (
    <div data-slot="photo-picker" className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative inline-block">
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={room <= 0}
            aria-label="Add photos"
            onChange={(e) => {
              onAdd(fresh(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, src: URL.createObjectURL(f) }))))
              e.target.value = ""
            }}
            className="peer sr-only"
          />
          <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 text-base font-medium text-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:bg-stone">
            <Camera aria-hidden className="size-5 text-navy" />
            Add photos
          </span>
        </label>
        {samples && samples.length > 0 && (
          <Button type="button" variant="outline" className="min-h-11 text-base" onClick={() => onAdd(fresh(samples))}>
            {`Add ${samples.length} sample photos`}
          </Button>
        )}
      </div>
      <p role="status" className="text-base text-muted-foreground">
        {photos.length > 0 ? `${photoCount(photos.length)} added. Ryan sees ${photos.length === 1 ? "it" : "them"} before the visit.` : "Optional. A photo of the yard or the problem helps Ryan come ready."}
      </p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.name} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-stone">
              <Image src={p.src} alt={p.name} fill unoptimized sizes="240px" className="object-cover" />
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => onRemove(p.name)}
                className="absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-full bg-navy/80 text-white hover:bg-navy focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              >
                <X aria-hidden className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
