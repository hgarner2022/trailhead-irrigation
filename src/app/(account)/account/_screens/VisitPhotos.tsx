"use client"

import { Photos } from "@/components/blocks/Photos"
import { addPhotoFlow, type AddPhotoResult } from "@/lib/photos/upload"
import type { PhotoItem } from "@/lib/photos/types"

// The Photos section of the customer's visit page: their own uploads with Add photo (before and after the visit), and the photos Ryan marked to show
// them once the visit is Done. The file goes from the browser straight to the private store; the server action only tells the API which file arrived.
// A customer who came in by a text's link adds through that link (`link`) and has no Remove (the link opens this one visit and nothing else).

export interface VisitPhotosProps {
  visitId: string
  photos: PhotoItem[]
  /** false while the store has no token */
  configured: boolean
  /** false for a canceled visit: the photos stay, nothing more can be added */
  canAdd: boolean
  /** the text link's token, for a visit opened by the link */
  link?: string
  /** `photos.add` for this customer: a server action */
  onAdd: (visitId: string, blobKey: string) => Promise<AddPhotoResult>
  /** `photos.remove` for the customer's own photo: a server action; left out for a visit opened by a text's link */
  onRemove?: (photoId: string) => Promise<{ ok: true } | { ok: false; message: string }>
}

export function VisitPhotos({ visitId, photos, configured, canAdd, link, onAdd, onRemove }: VisitPhotosProps) {
  return (
    <Photos
      key={visitId}
      audience="customer"
      photos={photos}
      configured={configured}
      onAdd={canAdd ? (file) => addPhotoFlow(file, { visitId, link, confirm: onAdd }) : undefined}
      onRemove={onRemove}
    />
  )
}
